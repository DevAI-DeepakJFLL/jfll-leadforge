# Active Customer Lead Service

Enterprise data pipeline and high-performance serverless microservice for querying active customer leads with sub-2ms latency over AWS S3 / Floci emulator.

---

## Repository Structure

```
customer-master-service/
├── .env.example                     # Environment template
├── README.md                        # Project overview & quickstart
├── requirements.txt                 # Python dependencies
├── data/
│   ├── raw/                         # Raw source landing directory
│   └── processed/                   # Cleaned, active customer production files
│       ├── active_customers_leads.csv           # Clean active CSV (881 records, 108 KB)
│       └── active_customers_leads_zstd.parquet  # Production ZSTD Parquet (881 records, 37.5 KB)
├── docs/
│   ├── API_DOCUMENTATION.md         # Comprehensive REST API specifications
│   └── SECURITY_AND_CODE_REVIEW.md  # Comprehensive code quality & security audit
├── scripts/
│   └── upload_to_floci.py           # S3 bucket seeding script for Floci/AWS
├── src/
│   ├── api/
│   │   ├── config.py                # Centralized typed settings
│   │   ├── database.py              # DuckDB + S3 HTTPFS connection pool
│   │   ├── main.py                  # FastAPI application entrypoint
│   │   ├── models.py                # Pydantic schemas
│   │   └── routes.py                # Parameterized paginated lead endpoints
│   └── etl/
│       └── clean_merge.py           # Active customer data hygiene and deduplication pipeline
└── tests/
    └── test_api.py                  # Automated test suite (health, pagination, injection safety)
```

---

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Data Processing Pipeline (Optional)
To regenerate or reprocess active leads:
```bash
python -m src.etl.clean_merge
```

### 3. Seed S3 Bucket on Floci
Ensure Floci is running (`http://localhost:4566`), then seed the Parquet data:
```bash
python scripts/upload_to_floci.py
```

### 4. Run the API Server
```bash
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Run Automated Tests
```bash
pytest tests/
```
