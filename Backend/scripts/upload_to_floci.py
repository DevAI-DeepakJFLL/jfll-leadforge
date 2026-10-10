"""
Deploy script to publish both Frontend static website and Backend ZSTD Parquet dataset
to the local Floci (AWS Cloud Emulator) instance on port 4566.
"""

import os
import mimetypes
from pathlib import Path
import boto3

FLOCI_ENDPOINT = os.getenv("FLOCI_ENDPOINT", "http://localhost:4566")
DATA_BUCKET = os.getenv("S3_BUCKET", "customer-master-leads")
FRONTEND_BUCKET = os.getenv("FRONTEND_BUCKET", "lead-sourcing-frontend")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

project_root = Path(__file__).resolve().parent.parent.parent
zstd_file = project_root / "Backend" / "data" / "processed" / "active_customers_leads_zstd.parquet"
frontend_dist = project_root / "Frontend" / "dist"

s3 = boto3.client(
    "s3",
    endpoint_url=FLOCI_ENDPOINT,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name=AWS_REGION,
)


def deploy_backend_data():
    print(f"\n📦 Deploying Backend Parquet data to Floci ({DATA_BUCKET})...")
    try:
        s3.create_bucket(Bucket=DATA_BUCKET)
        print(f"Bucket '{DATA_BUCKET}' verified.")
    except Exception as e:
        print(f"Bucket notice: {e}")

    dest_key = "leads/active_customers_leads_zstd.parquet"
    s3.upload_file(str(zstd_file), DATA_BUCKET, dest_key)
    print(f"✅ Uploaded {zstd_file.name} to s3://{DATA_BUCKET}/{dest_key}")


def deploy_frontend_spa():
    print(f"\n🌐 Deploying Frontend SPA to Floci S3 Website Hosting ({FRONTEND_BUCKET})...")
    if not frontend_dist.exists():
        print(f"❌ Frontend build output not found at {frontend_dist}. Run 'npm run build' first.")
        return

    try:
        s3.create_bucket(Bucket=FRONTEND_BUCKET)
        print(f"Bucket '{FRONTEND_BUCKET}' verified.")
    except Exception as e:
        print(f"Bucket notice: {e}")

    try:
        s3.put_bucket_website(
            Bucket=FRONTEND_BUCKET,
            WebsiteConfiguration={
                "IndexDocument": {"Suffix": "index.html"},
                "ErrorDocument": {"Key": "index.html"},
            },
        )
        print(f"Configured S3 website hosting on s3://{FRONTEND_BUCKET}/")
    except Exception as e:
        print(f"Notice setting website configuration: {e}")

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
    print(f"🔗 Accessible locally at: {FLOCI_ENDPOINT}/{FRONTEND_BUCKET}/index.html")


if __name__ == "__main__":
    deploy_backend_data()
    deploy_frontend_spa()
