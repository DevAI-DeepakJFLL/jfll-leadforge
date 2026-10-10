# Floci AWS Emulator Integration & Operational Guide

## What is Floci?
**Floci** is a lightweight, drop-in AWS local cloud emulator designed for rapid offline and local testing of AWS cloud services (S3, DynamoDB, SQS, SNS, Athena, Glue, Bedrock, etc.) without incurring AWS cloud bills or requiring live internet connectivity.

In this architecture, Floci acts as the **local S3 Object Storage provider** for our compressed Apache Parquet active lead database.

---

## 1. Local Floci Environment Architecture

* **Floci Daemon Port**: `4566` (Emulates AWS REST API endpoints)
* **Floci Management UI**: `http://localhost:4500`
* **Local S3 Bucket**: `s3://customer-master-leads`
* **Dataset Stored**: `leads/active_customers_leads_zstd.parquet` (37.5 KB, 881 active records)

---

## 2. Managing the Floci Container

Floci is managed via Docker. Check status or restart using:

```bash
# Check if Floci is running
docker ps | grep floci

# View container logs
docker logs floci --tail 50

# Restart Floci
docker restart floci
```

---

## 3. Interacting with Floci via AWS CLI

Configure the AWS CLI to communicate with Floci on `localhost:4566`:

```bash
# Set dummy credentials for local emulator
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_DEFAULT_REGION="us-east-1"
export ENDPOINT_URL="http://localhost:4566"

# List S3 buckets
aws --endpoint-url=$ENDPOINT_URL s3 ls

# List contents of customer-master-leads bucket
aws --endpoint-url=$ENDPOINT_URL s3 ls s3://customer-master-leads/leads/

# Download Parquet file locally from Floci S3
aws --endpoint-url=$ENDPOINT_URL s3 cp \
  s3://customer-master-leads/leads/active_customers_leads_zstd.parquet ./downloaded_leads.parquet
```

---

## 4. Uploading Parquet Files to Floci S3

We provide an automated script in `scripts/upload_to_floci.py`:

```bash
# Run upload pipeline
python scripts/upload_to_floci.py
```

This script:
1. Connects to `http://localhost:4566`.
2. Creates the `customer-master-leads` bucket if it does not already exist.
3. Uploads `data/processed/active_customers_leads_zstd.parquet` to `s3://customer-master-leads/leads/active_customers_leads_zstd.parquet`.

---

## 5. Transitioning from Floci to AWS Production

Switching from the local Floci emulator to live AWS S3 requires zero code changes. Simply modify environment variables in your `.env` or deployment manifest (ECS / Kubernetes / Lambda):

| Configuration Variable | Local (Floci) | AWS Production |
| :--- | :--- | :--- |
| `ENV` | `local` | `production` |
| `FLOCI_ENDPOINT` | `localhost:4566` | *(Ignored in production)* |
| `S3_BUCKET` | `customer-master-leads` | `your-prod-lead-master-bucket` |
| `PARQUET_KEY` | `leads/active_customers_leads_zstd.parquet` | `leads/active_customers_leads_zstd.parquet` |
| `AWS_REGION` | `us-east-1` | `us-east-1` (or your chosen region) |
| IAM Role / Auth | `test`/`test` dummy credentials | IAM Instance Profile / ECS Task Role / IRSA |

DuckDB's native `httpfs` extension seamlessly uses AWS IAM instance profile credentials when `ENV=production`.
