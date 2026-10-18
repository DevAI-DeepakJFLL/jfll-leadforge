# AWS Free Tier Deployment & Cost Optimization Runbook

> **Target Audience:** DevOps Engineers, Backend Developers, and System Administrators  
> **Target Cost:** $0.00 / month (100% AWS Free Tier Compliant)  
> **Region:** `ap-southeast-2` (Sydney)  
> **Last Verified:** October 18, 2026  

---

## 1. Executive Architecture Summary

JFLL LeadForge utilizes an ultra-low-footprint serverless analytical architecture combining **Amazon S3**, **AWS Lambda (Python 3.12, x86_64)**, and **DuckDB** embedded analytical engine.

```
┌─────────────────────────────────┐
│     Client / Browser Frontend   │
└────────────────┬────────────────┘
                 │ HTTPS (Function URL / CloudFront)
                 ▼
┌─────────────────────────────────────────────────────────┐
│           AWS Lambda (jfll-leadforge-api)               │
│  - Python 3.12 (x86_64)                                 │
│  - Memory: 512 MB | Timeout: 30s                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Ephemeral /tmp SSD Cache (/tmp/lead_cache)       │  │
│  │ - 1st Call: Download Parquet from S3 (Once)      │  │
│  │ - Subsequent: 0 S3 Requests, Local IO (2–5ms)    │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     │ In-Memory Columnar Scan           │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ DuckDB SQL Analytical Query Engine               │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ s3:GetObject (Cold-start only)
                 ▼
┌─────────────────────────────────────────────────────────┐
│       Private Amazon S3 Bucket (jfll-leadforge-data)    │
│  - SSE-S3 (AES-256) Encryption (Free)                   │
│  - Block All Public Access Enabled                      │
│  - 6 Zstandard Parquet Datasets: ~77.5 MB Total         │
│    * apollo_freight_leads_zstd.parquet (71.29 MB)       │
│    * datamyne_leads_zstd.parquet (3.09 MB)              │
│    * datamyne_valid_leads_zstd.parquet (2.31 MB)        │
│    * datamyne_missing_leads_zstd.parquet (0.74 MB)      │
│    * inactive_customers_leads_zstd.parquet (0.10 MB)   │
│    * active_customers_leads_zstd.parquet (0.03 MB)     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Proof of AWS Free Tier Compliance ($0.00 / mo)

| Service | AWS Free Tier Monthly Allowance | LeadForge Actual Footprint | % Used | Expected Monthly Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon S3 Storage** | 5.0 GB Standard Storage | **77.5 MB** | **1.55%** | **$0.00** |
| **Amazon S3 GET Requests** | 20,000 GET / month | ~50 – 200 GETs / month (due to `/tmp` caching) | **< 1.0%** | **$0.00** |
| **Amazon S3 PUT Requests** | 2,000 PUT / month | 6 PUTs (one-time deployment) | **0.30%** | **$0.00** |
| **AWS Lambda Compute** | 400,000 GB-seconds / month | ~1,250 GB-seconds / 100,000 queries | **0.31%** | **$0.00** |
| **AWS Lambda Invocations**| 1,000,000 requests / month | ~5,000 – 50,000 requests / month | **< 5.0%** | **$0.00** |
| **Lambda Function URL** | Always Free (No Gateway cost) | Unlimited within Lambda invocation limits | **0.0%** | **$0.00** |
| **CloudFront Data Out** | 1.0 TB / month | < 1.0 GB / month | **< 0.1%** | **$0.00** |
| **S3 Encryption** | SSE-S3 (AES-256) | Included for free | **0.0%** | **$0.00** |

> [!IMPORTANT]
> **Zero-Cost Lifeline**: Unlike AWS RDS (which incurs charges after 12 months), AWS Lambda's **1,000,000 requests** and **400,000 GB-seconds** free tier is **perpetual (Never Expires)**.

---

## 3. Key Optimization Decisions

### 1. Python 3.12 x86_64 Runtime
- **Why x86_64?**: Python native C-extensions like `_duckdb` and `_pydantic_core` compiled in GitHub Actions Ubuntu runners (`ubuntu-latest` x86_64) execute with native binary compatibility on AWS Lambda without cross-compilation errors (`ELFCLASS64` mismatches).
- **Why Python 3.12?**: Python 3.12 includes specialized bytecode optimizations (PEP 659) delivering 10–25% faster cold starts and lower memory footprints than Python 3.11/3.10.

### 2. Ephemeral `/tmp` SSD Caching
- **Problem**: Querying S3 directly via S3 Select or remote HTTP ranges for every user keystroke/pagination causes hundreds of S3 GET requests and adds 200–400ms network latency.
- **Solution**: On the first request to a container, LeadForge streams the Parquet dataset from S3 into `/tmp/lead_cache/<dataset>.parquet`. 
- **Result**:
  - Warm query latency: **2–5 ms**.
  - S3 GET requests: **0** for all warm executions.
  - S3 Data Transfer: Zero network bandwidth for subsequent queries.

### 3. Avoiding Cost Traps
- **Do NOT use AWS KMS Customer-Managed Keys (CMK)**: Each CMK costs $1.00/month flat fee + $0.03 per 10,000 requests. Instead, LeadForge uses **SSE-S3 (Amazon S3-managed encryption keys)** which is 100% free.
- **Do NOT use Amazon RDS or Aurora Serverless**: RDS t3.micro costs $15–$25/month after the 12-month free tier and suffers memory starvation on 744k rows. S3 + DuckDB is faster and permanently free.
- **Do NOT provision NAT Gateways**: Running Lambda inside a private VPC with a NAT Gateway costs $32.40/month. LeadForge runs in default serverless execution accessing S3 over AWS internal endpoints at $0.00.

---

## 4. Operational Commands & Verification

### 1. Health & Backend Check
```bash
curl -s "https://uxfmnbd6owxk3wxemhizp4gqsa0exlge.lambda-url.ap-southeast-2.on.aws/health"
```
**Expected Response:**
```json
{"status":"healthy","backend":"AWS S3 Production","floci_endpoint":"http://localhost:4566","s3_target":"s3://jfll-leadforge-data/leads/active_customers_leads_zstd.parquet"}
```

### 2. Authentication & JWT Token Issuance
```bash
curl -s -X POST "https://uxfmnbd6owxk3wxemhizp4gqsa0exlge.lambda-url.ap-southeast-2.on.aws/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"leads@jfll.com","password":"Jet@123"}'
```

### 3. Querying Leads with Sub-10ms Latency
```bash
TOKEN=$(curl -s -X POST "https://uxfmnbd6owxk3wxemhizp4gqsa0exlge.lambda-url.ap-southeast-2.on.aws/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"leads@jfll.com","password":"Jet@123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -s "https://uxfmnbd6owxk3wxemhizp4gqsa0exlge.lambda-url.ap-southeast-2.on.aws/api/v1/leads?page=1&page_size=2" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Setting Up the $0.01 AWS Billing Alarm (Zero-Risk Guarantee)

To ensure complete peace of mind, configure a CloudWatch billing alarm in the AWS Management Console:

1. Open **AWS Billing and Cost Management Console** (`us-east-1` for billing alerts).
2. Under **Preferences**, select **Billing Preferences** and check **Receive Free Tier Usage Alerts** and **Receive Billing Alerts**.
3. Navigate to **CloudWatch > Alarms > Create Alarm**.
4. Select metric: `AWS/Billing > TotalEstimatedCharge`.
5. Condition: `Static > Greater than > 0.01` (USD).
6. Configure SNS Notification: Enter your work email address (e.g. `leads@jfll.com`).
7. Confirm subscription in your inbox.
