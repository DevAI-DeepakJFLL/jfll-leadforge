"""
Script to upload processed analytical Parquet datasets directly to AWS S3.

Usage:
  # With AWS CLI profile or IAM role:
  python Backend/scripts/upload_to_aws_s3.py --bucket customer-master-leads --prefix leads/

  # With direct credentials:
  python Backend/scripts/upload_to_aws_s3.py \
      --bucket customer-master-leads \
      --region us-east-1 \
      --access-key YOUR_KEY \
      --secret-key YOUR_SECRET

  # With local emulator or custom endpoint:
  python Backend/scripts/upload_to_aws_s3.py --endpoint-url http://localhost:4566
"""

import os
import sys
import argparse
from pathlib import Path
import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def upload_processed_to_s3(
    bucket_name: str,
    prefix: str = "leads/",
    region: str = None,
    access_key: str = None,
    secret_key: str = None,
    endpoint_url: str = None
):
    project_root = Path(__file__).resolve().parent.parent.parent
    processed_dir = project_root / "Backend" / "data" / "processed"

    if not processed_dir.exists():
        print(f"❌ Processed data directory not found at: {processed_dir}")
        sys.exit(1)

    parquet_files = sorted(list(processed_dir.glob("*.parquet")))
    if not parquet_files:
        print(f"❌ No Parquet files found in: {processed_dir}")
        sys.exit(1)

    print("=" * 65)
    print("JET FREIGHT LOGISTICS - AWS S3 COMPRESSED PARQUET UPLOAD")
    print("=" * 65)
    print(f"Target S3 Bucket : s3://{bucket_name}/{prefix.rstrip('/')}/")
    print(f"AWS Region       : {region or os.getenv('AWS_REGION', 'us-east-1')}")
    if endpoint_url:
        print(f"Custom Endpoint  : {endpoint_url}")
    print(f"Parquet Datasets : {len(parquet_files)} files (Total: {sum(os.path.getsize(f) for f in parquet_files)/(1024*1024):.2f} MB)")
    for f in parquet_files:
        size_mb = os.path.getsize(f) / (1024 * 1024)
        print(f"  • {f.name:<40} ({size_mb:>6.2f} MB)")
    print("-" * 65)

    client_kwargs = {}
    if region:
        client_kwargs["region_name"] = region
    if access_key and secret_key:
        client_kwargs["aws_access_key_id"] = access_key
        client_kwargs["aws_secret_access_key"] = secret_key
    if endpoint_url:
        client_kwargs["endpoint_url"] = endpoint_url

    try:
        s3 = boto3.client("s3", **client_kwargs)
        
        # Verify or create bucket
        try:
            s3.head_bucket(Bucket=bucket_name)
            print(f"✅ Verified access to S3 bucket: {bucket_name}")
        except ClientError as e:
            error_code = str(e.response.get("Error", {}).get("Code", ""))
            if error_code in ["404", "NoSuchBucket"]:
                print(f"Bucket {bucket_name} not found. Creating...")
                if region and region != "us-east-1":
                    s3.create_bucket(
                        Bucket=bucket_name,
                        CreateBucketConfiguration={"LocationConstraint": region}
                    )
                else:
                    s3.create_bucket(Bucket=bucket_name)
                print(f"✅ Created bucket: {bucket_name}")
            else:
                print(f"⚠️ S3 Bucket probe notice ({error_code}): {e}")

        # Upload only compressed Parquet files
        print("\nStarting upload of compressed Parquet files...")
        for p_file in parquet_files:
            dest_key = f"{prefix.rstrip('/')}/{p_file.name}"
            size_mb = os.path.getsize(p_file) / (1024 * 1024)
            print(f"  Uploading {p_file.name} ({size_mb:.2f} MB) -> s3://{bucket_name}/{dest_key}...")
            s3.upload_file(str(p_file), bucket_name, dest_key)
            print(f"  ✅ Uploaded: s3://{bucket_name}/{dest_key}")

        print("\n" + "=" * 65)
        print("SUCCESS: ALL COMPRESSED PARQUET DATASETS UPLOADED TO AWS S3!")
        print("=" * 65)

    except NoCredentialsError:
        print("\n❌ AWS credentials not found.")
        print("Please configure credentials using one of the following methods:")
        print("  1. Pass --access-key and --secret-key flags")
        print("  2. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables")
        print("  3. Run 'aws configure' in your terminal")
        print("  4. Attach an IAM role to your EC2 instance / Lambda execution environment")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ S3 Upload error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upload compressed Parquet datasets directly to AWS S3.")
    parser.add_argument("--bucket", default=os.getenv("S3_BUCKET", "customer-master-leads"), help="Target AWS S3 bucket name")
    parser.add_argument("--prefix", default=os.getenv("S3_PREFIX", "leads/"), help="S3 key prefix (folder path)")
    parser.add_argument("--region", default=os.getenv("AWS_REGION", "us-east-1"), help="AWS Region (default: us-east-1)")
    parser.add_argument("--access-key", default=os.getenv("AWS_ACCESS_KEY_ID"), help="AWS Access Key ID")
    parser.add_argument("--secret-key", default=os.getenv("AWS_SECRET_ACCESS_KEY"), help="AWS Secret Access Key")
    parser.add_argument("--endpoint-url", default=os.getenv("AWS_ENDPOINT_URL"), help="Custom S3 endpoint URL (for Floci / Localstack / MinIO)")
    args = parser.parse_args()

    upload_processed_to_s3(
        bucket_name=args.bucket,
        prefix=args.prefix,
        region=args.region,
        access_key=args.access_key,
        secret_key=args.secret_key,
        endpoint_url=args.endpoint_url
    )
