"""
Automated deployment pipeline for Floci (Local AWS Cloud Emulator):
1. S3 Parquet analytical database upload (s3://customer-master-leads/leads/active_customers_leads_zstd.parquet)
2. S3 Frontend SPA static distribution deployment (s3://lead-sourcing-frontend/)
3. AWS Lambda deployment for FastAPI + Mangum + DuckDB (customer-leads-api, Python 3.12, ARM64)
4. Amazon API Gateway deployment (CustomerLeadsRestApi with ANY /{proxy+} integration)
"""

import os
import mimetypes
from pathlib import Path
import boto3

FLOCI_ENDPOINT = os.getenv("FLOCI_ENDPOINT", "http://localhost:4566")
DOCKER_FLOCI_HOST = os.getenv("DOCKER_FLOCI_HOST", "172.17.0.2:4566")
DATA_BUCKET = os.getenv("S3_BUCKET", "customer-master-leads")
FRONTEND_BUCKET = os.getenv("FRONTEND_BUCKET", "lead-sourcing-frontend")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
LAMBDA_NAME = os.getenv("LAMBDA_FUNCTION_NAME", "customer-leads-api")
API_NAME = os.getenv("API_GATEWAY_NAME", "CustomerLeadsRestApi")

project_root = Path(__file__).resolve().parent.parent.parent
zstd_file = project_root / "Backend" / "data" / "processed" / "active_customers_leads_zstd.parquet"
frontend_dist = project_root / "Frontend" / "dist"
lambda_bundle = project_root / "Backend" / "lambda_bundle_py312.zip"

s3 = boto3.client(
    "s3",
    endpoint_url=FLOCI_ENDPOINT,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name=AWS_REGION,
)

lambda_client = boto3.client(
    "lambda",
    endpoint_url=FLOCI_ENDPOINT,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name=AWS_REGION,
)

apigw = boto3.client(
    "apigateway",
    endpoint_url=FLOCI_ENDPOINT,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name=AWS_REGION,
)


def deploy_backend_data():
    print(f"\n📦 [1/4] Deploying Backend Parquet data to S3 ({DATA_BUCKET})...")
    try:
        s3.create_bucket(Bucket=DATA_BUCKET)
    except Exception:
        pass

    processed_dir = project_root / "Backend" / "data" / "processed"
    parquet_files = list(processed_dir.glob("*.parquet"))
    if not parquet_files and zstd_file.exists():
        parquet_files = [zstd_file]

    for p_file in sorted(parquet_files):
        dest_key = f"leads/{p_file.name}"
        s3.upload_file(str(p_file), DATA_BUCKET, dest_key)
        print(f"✅ Uploaded {p_file.name} to s3://{DATA_BUCKET}/{dest_key}")


def deploy_frontend_spa():
    print(f"\n🌐 [2/4] Deploying Frontend SPA to S3 Website ({FRONTEND_BUCKET})...")
    if not frontend_dist.exists():
        print(f"❌ Frontend build output not found at {frontend_dist}. Run 'npm run build' first.")
        return

    try:
        s3.create_bucket(Bucket=FRONTEND_BUCKET)
    except Exception:
        pass

    try:
        s3.put_bucket_website(
            Bucket=FRONTEND_BUCKET,
            WebsiteConfiguration={
                "IndexDocument": {"Suffix": "index.html"},
                "ErrorDocument": {"Key": "index.html"},
            },
        )
    except Exception:
        pass

    uploaded_files = 0
    for file_path in frontend_dist.rglob("*"):
        if file_path.is_file():
            rel_key = str(file_path.relative_to(frontend_dist))
            content_type, _ = mimetypes.guess_type(str(file_path))
            if file_path.suffix == ".js":
                content_type = "application/javascript"
            elif file_path.suffix == ".css":
                content_type = "text/css"
            extra_args = {"ContentType": content_type} if content_type else {}
            s3.upload_file(str(file_path), FRONTEND_BUCKET, rel_key, ExtraArgs=extra_args)
            uploaded_files += 1

    print(f"✅ Uploaded {uploaded_files} frontend assets to s3://{FRONTEND_BUCKET}/")
    print(f"🔗 Frontend Live URL: {FLOCI_ENDPOINT}/{FRONTEND_BUCKET}/index.html")


def deploy_lambda_function():
    print(f"\n⚡ [3/4] Deploying Backend API to AWS Lambda ({LAMBDA_NAME})...")
    if not lambda_bundle.exists():
        print(f"❌ Lambda bundle not found at {lambda_bundle}.")
        return

    with open(lambda_bundle, "rb") as f:
        zip_bytes = f.read()

    try:
        lambda_client.delete_function(FunctionName=LAMBDA_NAME)
    except Exception:
        pass

    res = lambda_client.create_function(
        FunctionName=LAMBDA_NAME,
        Runtime="python3.12",
        Role="arn:aws:iam::000000000000:role/lambda-role",
        Handler="lambda_handler.lambda_handler",
        Code={"ZipFile": zip_bytes},
        Timeout=60,
        MemorySize=1024,
        Environment={
            "Variables": {
                "ENV": "local",
                "FLOCI_ENDPOINT": DOCKER_FLOCI_HOST,
                "S3_BUCKET": DATA_BUCKET,
                "PARQUET_KEY": "leads/active_customers_leads_zstd.parquet",
                "AWS_ACCESS_KEY_ID": "test",
                "AWS_SECRET_ACCESS_KEY": "test",
                "AWS_REGION": AWS_REGION,
            }
        },
    )
    print(f"✅ Lambda function '{res['FunctionName']}' successfully deployed in Floci.")


def deploy_api_gateway():
    print(f"\n🚪 [4/4] Deploying Amazon API Gateway for Lambda integration...")
    apis = apigw.get_rest_apis().get("items", [])
    for a in apis:
        if a["name"] == API_NAME:
            try:
                apigw.delete_rest_api(restApiId=a["id"])
            except Exception:
                pass

    api = apigw.create_rest_api(
        name=API_NAME,
        description="REST API fronting customer-leads-api Lambda",
    )
    api_id = api["id"]

    resources = apigw.get_resources(restApiId=api_id)
    root_id = [item["id"] for item in resources["items"] if item["path"] == "/"][0]

    proxy = apigw.create_resource(restApiId=api_id, parentId=root_id, pathPart="{proxy+}")
    proxy_id = proxy["id"]

    apigw.put_method(
        restApiId=api_id,
        resourceId=proxy_id,
        httpMethod="ANY",
        authorizationType="NONE",
    )

    lambda_arn = f"arn:aws:lambda:{AWS_REGION}:000000000000:function:{LAMBDA_NAME}"
    apigw.put_integration(
        restApiId=api_id,
        resourceId=proxy_id,
        httpMethod="ANY",
        type="AWS_PROXY",
        integrationHttpMethod="POST",
        uri=f"arn:aws:apigateway:{AWS_REGION}:lambda:path/2015-03-31/functions/{lambda_arn}/invocations",
    )

    apigw.create_deployment(restApiId=api_id, stageName="prod")
    api_url = f"{FLOCI_ENDPOINT}/restapis/{api_id}/prod/_user_request_/"
    print(f"✅ API Gateway deployed successfully.")
    print(f"🔗 Lambda API Gateway Endpoint: {api_url}")


if __name__ == "__main__":
    deploy_backend_data()
    deploy_frontend_spa()
    deploy_lambda_function()
    deploy_api_gateway()
