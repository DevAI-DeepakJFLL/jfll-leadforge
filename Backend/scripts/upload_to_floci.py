import os
from pathlib import Path
import boto3

FLOCI_ENDPOINT = os.getenv("FLOCI_ENDPOINT", "http://localhost:4566")
BUCKET_NAME = os.getenv("S3_BUCKET", "customer-master-leads")

base_dir = Path(__file__).resolve().parent.parent
zstd_file = base_dir / "data" / "processed" / "active_customers_leads_zstd.parquet"

s3 = boto3.client(
    "s3",
    endpoint_url=FLOCI_ENDPOINT,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name="us-east-1",
)

try:
    s3.create_bucket(Bucket=BUCKET_NAME)
    print(f"Bucket '{BUCKET_NAME}' created or confirmed.")
except Exception as e:
    print(f"Bucket status: {e}")

s3.upload_file(str(zstd_file), BUCKET_NAME, "leads/active_customers_leads_zstd.parquet")
print("File successfully uploaded to Floci S3 bucket:")
objs = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix="leads/active_customers_leads_zstd.parquet")
for item in objs.get("Contents", []):
    print(f" - {item['Key']} ({item['Size']} bytes)")
