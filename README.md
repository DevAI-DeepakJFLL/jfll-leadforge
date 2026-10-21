# JFLL LeadForge — Lead Sourcing & Customer Intelligence Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Frontend Tests](https://img.shields.io/badge/Vitest-182%20passed-success.svg)]()
[![Backend Tests](https://img.shields.io/badge/Pytest-70%20passed-success.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)]()
[![DuckDB](https://img.shields.io/badge/DuckDB-1.1-FFF000.svg)]()
[![AWS S3 / Parquet](https://img.shields.io/badge/AWS%20S3-ZSTD%20Parquet-FF9900.svg)]()
[![CloudFront CDN](https://img.shields.io/badge/CloudFront-Live-blueviolet.svg)](https://d3c4bsffw7tf7s.cloudfront.net)

Enterprise B2B Lead Sourcing and Customer Intelligence Suite developed for **Jet Freight Logistics Limited (JFLL)**. The platform pairs a high-performance analytical query engine (FastAPI + DuckDB over AWS S3 Parquet) with a modern React 18 single-page application modeled after enterprise prospecting workflows.

- **Production CloudFront URL**: [https://d3c4bsffw7tf7s.cloudfront.net](https://d3c4bsffw7tf7s.cloudfront.net)
- **Backend Lambda Endpoint**: `https://uxfmnbd6owxk3wxemhizp4gqsa0exlge.lambda-url.ap-southeast-2.on.aws`
- **GitHub Repository**: [`DevAI-DeepakJFLL/jfll-leadforge`](https://github.com/DevAI-DeepakJFLL/jfll-leadforge)

---

## Table of Contents

- [Overview & Core Engines](#overview--core-engines)
- [System Architecture Diagram](#system-architecture-diagram)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Quickstart & Local Setup](#quickstart--local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [Authentication & Access](#authentication--access)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Cloud Deployment & Architecture](#cloud-deployment--architecture)
- [Observability & Structured Logging](#observability--structured-logging)
- [Configuration Reference](#configuration-reference)

---

## Overview & Core Engines

The application provides a unified multi-engine prospecting suite tailored for international logistics sales operations:

1. **Company Accounts (Apollo Shippers)**: Real-time analytical querying over **690,881 verified commercial freight shipper accounts** across 50 freight-active cargo verticals (Automotive, Chemicals, Pharmaceuticals, Fresh Produce, Electronics, Heavy Machinery). Includes firmographics, employee headcounts, revenue ranges, tech stacks, and one-click **"Find Decision Makers"** cross-navigation.
2. **People Directory (Apollo Decision Makers)**: Directory of **2.5M+ freight decision-makers** (C-Suite, VP, Director, Operations, Supply Chain & Logistics Managers) with verified email confidence ratings, direct phone numbers, and LinkedIn profile links.
3. **DataMyne International Trade Directory**: **40,081 verified unified trade accounts** across **India** (34,690 accounts) and **Brazil** (5,391 accounts) segmented into **Air Freight** and **Ocean Freight**, HS code categories, trade corridors (`PER/AIR`, `GCR/Air`, `India-Brazil/Air`, `Brazil-India/Air`, `Brazil-India/Ocean`), Brazilian logistics hubs (São Paulo, Guarulhos, Rio de Janeiro, Curitiba, etc.), customs shipment volumes, and direct cross-search into Apollo.
4. **JFLL Customers (Organic Internal Master)**: **728 active verified accounts** & **2,010 enriched inactive accounts** with contact readiness scoring, customer group segmentation (Subagents, Overseas Partners, Shippers/Consignees), and credit/outstanding tracking.

### Architectural Highlights

- **Serverless Analytics Engine**: DuckDB executes vectorized columnar SQL directly over S3 objects (`httpfs` extension), pruning unneeded row groups and columns for low memory consumption and instant pagination.
- **Dynamic Filter-Responsive Audience Counts**: Real-time aggregation pipeline calculates audience and category counts against active search queries and sidebar facets across all tabs (DataMyne, JFLL Customers, Apollo Companies).
- **Context-Aware Geographic Filtering**: Seamless UI switches between India-specific and Brazil-specific trade corridors and operational hubs based on region selection.
- **Ephemeral `/tmp` Caching**: In AWS Lambda, analytical datasets are cached in `/tmp/lead_cache/` on cold start, executing warm queries in **2–5 ms** with **zero S3 GET requests**.
- **Cross-Directory Navigation**: Deep integration allows sales reps viewing a company in Apollo or DataMyne to click **"Find Decision Makers"** to instantly navigate to the People directory scoped to that company.
- **Microsecond Token Authentication**: Backend REST endpoints issue signed RFC 7519 HMAC-SHA256 JWT tokens validated with constant-time verification (`secrets.compare_digest`).
- **Zero-Latency Resilience**: Frontend employs TanStack Query for background revalidation and automatic offline fallback to internal verified datasets if network partitions occur.

---

## System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Browser Client (React 18 SPA)"]
        UI["JFLL Dashboard UI\n(Tailwind CSS + Lucide)"]
        Views["Modular Views\n(People | Companies | DataMyne | JFLL)"]
        State["State & Cache Layer\n(TanStack Query + Table)"]
        Logger["Client Logger\n(__APP_LOGS__ Ring-Buffer)"]
        UI --> Views
        Views --> State
        Views --> Logger
    end

    subgraph CDN["Edge & CDN Distribution"]
        CF["AWS CloudFront CDN (Global Edge)\n(https://d3c4bsffw7tf7s.cloudfront.net)"]
    end

    subgraph Compute["Serverless Backend Services"]
        APIGW["Lambda Function URL\n(HTTPS CORS Enabled)"]
        Lambda["AWS Lambda (Python 3.12 / x86_64)\n(FastAPI + Mangum Adapter)"]
        AuthModule["Auth & Security\n(RFC 7519 JWT, Constant-Time Match)"]
        DuckDB["DuckDB Analytical Engine\n(Columnar Execution + In-Memory)"]
        TmpCache["Ephemeral /tmp SSD Cache\n(Warm Latency: 2–5ms | 0 S3 GETs)"]
        
        APIGW --> Lambda
        Lambda --> AuthModule
        Lambda --> DuckDB
        DuckDB <--> TmpCache
    end

    subgraph Storage["Cloud Storage & Observability"]
        S3Web["AWS S3: Web Assets\n(jfll-leadforge-frontend)"]
        S3Data["AWS S3: Parquet Leads\n(jfll-leadforge-data)"]
        CW["AWS CloudWatch\n(Structured JSON Logs)"]
    end

    Client -->|Static Assets (HTML/JS/CSS)| CF
    CF -->|Origin: Private OAC| S3Web
    Client -->|REST API Requests\nAuthorization: Bearer <JWT>| CF
    CF -->|Origin: API Gateway / Function URL| APIGW
    DuckDB -->|Parquet Stream via HTTPFS (Cold Starts)| S3Data
    Lambda -->|CloudWatchJSONFormatter| CW
```

---

## Key Features

### 1. Apollo Commercial Freight Shippers
- **690,881 Verified Accounts**: Dedicated to commercial cargo shippers requiring international Air, Ocean, Reefer, and Customs Clearance services.
- **50 Logistics Cargo Verticals**: Quick-filter by Agriculture, Automotive, Chemicals, Consumer Goods, Electronics, Healthcare, Machinery, and Textiles.
- **Cross-Directory Pivot**: One-click "Find Decision Makers" button automatically queries the People directory for active cargo buyers at that specific company.
- **Company Dossier Slide-Over**: Comprehensive firmographics, website and LinkedIn shortcuts, employee headcount tiers, annual revenue estimates, and technology stack tags.

### 2. Apollo Decision Makers (People Directory)
- **2.5M+ Contacts**: Dedicated supply chain leads, import/export managers, logistics directors, VP of operations, and C-suite executives.
- **Email Deliverability Verification**: Direct email confidence ratings, deliverability status (`Verified` or `Extrapolated`), and copy-to-clipboard utilities.
- **Customs & Freight Role Targeting**: Filter by specific departments (Operations, Supply Chain, Logistics, Executive, Purchasing).

### 3. DataMyne Trade Intelligence
- **40,081 Import/Export Leads**: Cleaned, verified, and deduplicated shipment records spanning **India** (34,690 accounts) and **Brazil** (5,391 accounts).
- **Air & Ocean Transport Mode Segmentation**: Filter by transport mode (`Air`, `Ocean`, `Air & Ocean`).
- **Context-Aware Geographic Filtering**: Seamlessly switches between India-specific and Brazil-specific trade corridors (`PER/AIR`, `GCR/Air`, `India-Brazil/Air`, `Brazil-India/Air`, `Brazil-India/Ocean`) and operational hubs (São Paulo, Guarulhos, Rio de Janeiro, Curitiba, Mumbai, Delhi, etc.).
- **Trade Lane & HS Code Analytics**: Track shipment frequencies, estimated cargo traded value (USD), and customs categories.
- **Dynamic Audience Counters**: Horizontal category tabs dynamically recalculate record counts matching active search queries and sidebar criteria.

### 4. JFLL Internal Customer Intelligence
- **728 Active Enterprise Accounts** & **2,010 Inactive Accounts**: Internal master customer list with phone, email, and contact readiness scoring.
- **Dynamic Segmented Audience Tabs**: Real-time server and client queries for All (728), Shippers (285), Subagents (389), Overseas Partners (39), and With Contacts (728).
- **CSV Data Export**: Streaming RFC-4180 compliant CSV export with automatic CWE-1236 formula injection shielding.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript 5.6, Vite 6.4 |
| **UI & Styling** | Tailwind CSS 3.4, PostCSS, Lucide React (Icons) |
| **State & Data Table** | @tanstack/react-query 5, @tanstack/react-table 8, Zod |
| **Backend Framework** | Python 3.11+, FastAPI 0.115, Mangum (AWS Lambda ASGI adapter) |
| **Analytical Engine** | DuckDB 1.1 with HTTPFS extension |
| **Data Storage** | Apache Parquet (ZSTD-compressed), AWS S3 |
| **Security & Auth** | RFC 7519 JWT (PyJWT), Python `secrets.compare_digest`, CWE-1236 CSV protection |
| **Testing** | Vitest 5.0 (182 tests passed), Pytest 9.1 (70 tests passed) |
| **Cloud Hosting** | Amazon CloudFront (Global CDN), AWS Lambda, Amazon S3 |
| **Observability** | Structured JSON Logging for AWS CloudWatch and client `__APP_LOGS__` buffer |

---

## Repository Structure

```
Lead Sourcing Tool/
├── README.md                            # Complete system documentation (this file)
├── .gitignore                           # Git ignore specification
│
├── Frontend/                            # React 18 SPA application
│   ├── index.html                       # HTML5 entrypoint
│   ├── package.json                     # Node.js dependencies and scripts
│   ├── tsconfig.json                    # TypeScript compiler options
│   ├── vite.config.ts                   # Vite configuration (proxies /api/v1 -> :8000)
│   ├── tailwind.config.js               # Design tokens (JFLL & Apollo brand palettes)
│   ├── src/
│   │   ├── main.tsx                     # Application bootstrap & TanStack Query setup
│   │   ├── App.tsx                      # Root orchestrator & tab controller
│   │   ├── components/
│   │   │   ├── views/                   # Modularized View Architecture
│   │   │   │   ├── PeopleView.tsx       # Apollo decision-maker prospecting view
│   │   │   │   ├── ApolloCompaniesView.tsx # Commercial shipper accounts view
│   │   │   │   ├── DatamyneView.tsx     # Air & Ocean trade intelligence view
│   │   │   │   ├── JfllCustomersView.tsx# Internal customer master view
│   │   │   │   └── index.ts             # Barrel export
│   │   │   ├── auth/                    # LoginPage component & credential forms
│   │   │   ├── layout/                  # AppDock, TopHeader, AppLayout shells
│   │   │   ├── filters/                 # FilterSidebar, FilterAccordion, ActiveFilterChips
│   │   │   ├── leads/                   # LeadsTable, Drawer, Email reveal modal
│   │   │   ├── apollo/                  # ApolloTable, DetailDrawer, ContextBanner
│   │   │   ├── datamyne/                # DatamyneTable, FilterSidebar, ActionBars
│   │   │   ├── jfll/                    # JfllCustomerTable, ActionBar, Skeletons & Errors
│   │   │   └── ui/                      # Reusable badges, dialogs, toasts
│   │   ├── hooks/                       # Filter state hooks synchronized with URL parameters
│   │   ├── services/                    # Typed API client services (auth, leads, apollo, jfll)
│   │   ├── utils/                       # Shared formatters, parsers, and telemetry
│   │   │   ├── apolloUtils.ts           # Centralized avatar, revenue, and contact helpers
│   │   │   ├── logger.ts                # Structured client telemetry
│   │   │   └── csv.ts                   # RFC-4180 CSV export with formula injection defense
│   │   └── test/                        # Vitest test suite (182 tests)
│   └── dist/                            # Production build output
│
├── Backend/                             # FastAPI microservice & DuckDB engine
│   ├── requirements.txt                 # Python dependencies (fastapi, duckdb, boto3, etc.)
│   ├── src/
│   │   ├── api/
│   │   │   ├── main.py                  # FastAPI application & lifespan management
│   │   │   ├── config.py                # Typed settings (pydantic-settings)
│   │   │   ├── database.py              # DuckDB + S3 HTTPFS connection factory
│   │   │   ├── helpers.py               # Shared auth validation, query unwrapping, regex cleaners
│   │   │   ├── auth.py                  # JWT authentication & session routes
│   │   │   ├── routes.py                # Paginated lead query endpoints & SQL execution
│   │   │   ├── models.py                # Request/response Pydantic models
│   │   │   └── logger.py                # CloudWatch JSON formatter & request middleware
│   │   └── etl/
│   │       ├── clean_merge.py           # JFLL customer data hygiene and deduplication
│   │       ├── datamyne_etl.py          # DataMyne India Air/Ocean extraction and segmentation
│   │       ├── brazil_datamyne_etl.py   # DataMyne Brazil dataset transformation & schema unification
│   │       └── apollo_etl.py            # Apollo organizations & contacts transformation
│   ├── data/
│   │   ├── raw/                         # Raw source files
│   │   ├── processed/                   # Cleaned Parquet production datasets
│   │   ├── Apollo/                      # Apollo data workflows and exploration reports
│   │   └── Datamyne/                    # Air & Ocean segmented source directories
│   ├── scripts/
│   │   ├── export_datamyne_frontend_json.py # Exports production JSON for frontend bundle
│   │   ├── unify_datamyne_parquet.py    # Merges India & Brazil Parquet files
│   │   └── upload_to_floci.py           # S3 bucket seeding script for Floci/AWS
│   ├── tests/                           # Pytest test suite (70 tests)
│   └── docs/                            # Deep-dive backend documentation
│       ├── API_DOCUMENTATION.md         # Comprehensive REST API specifications
│       ├── AWS_FREE_TIER_DEPLOYMENT_RUNBOOK.md # Production deployment and cost runbook
│       └── SECURITY_AND_CODE_REVIEW.md  # Security audit & code review findings
│
└── docs/                                # Project governance & architecture
    ├── architecture/
    │   └── TECH_STACK.md                # Technology decisions & library criteria
    └── reference/
        └── Ref.jpg                      # Target visual design reference
```

---

## Quickstart & Local Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **Python**: `v3.11` or higher
- **Package Managers**: `npm` and `uv` (or `pip`)

---

### 1. Backend Setup

1. **Navigate to the Backend directory**:
   ```bash
   cd Backend
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI server**:
   ```bash
   # From the repository root:
   PYTHONPATH=Backend uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Verify Backend Health**:
   - Healthcheck: `http://localhost:8000/health`
   - Swagger Documentation: `http://localhost:8000/docs`
   - Interactive OpenAPI: `http://localhost:8000/redoc`

---

### 2. Frontend Setup

1. **Navigate to the Frontend directory**:
   ```bash
   cd Frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at: **`http://localhost:5173`**

---

## Authentication & Access

The application enforces passwordless, email-only whitelist authentication restricted to authorized enterprise personnel:

- **Access Control:** Restricted strictly to registered work emails configured via environment secrets (`ALLOWED_EMAILS` / `AUTH_USER_PROFILES_JSON`).
- **Security Protocol:** RFC 7519 Bearer JWT (HS256) signed with backend secret key.
- **Session Duration:** 24 Hours.
- **Timing Attack Resistance:** Constant-time token verification via `secrets.compare_digest`.
- **Zero-Latency Resilience:** Automatic fallback to verified session state if the backend is temporarily offline.
- **Environment Configuration:** To grant or revoke access, configure `ALLOWED_EMAILS` and `AUTH_USER_PROFILES_JSON` in your private environment file (`.env`) or AWS Lambda Environment Variables. Authorized user lists are kept strictly confidential and are not published or tracked in version control.

---

## Testing & Quality Assurance

The codebase includes automated test suites covering API contracts, SQL safety, pagination, authentication, ETL transformations, and UI rendering:

### Backend Tests (Pytest: 70/70 Passed)
Executes 70 automated test cases verifying health endpoints, S3 Parquet DuckDB queries, company searches, contacts filtering, Brazil ETL pipelines, tier scoring, dynamic audience aggregations, and SQL injection immunity.

```bash
# Run backend test suite
PYTHONPATH=Backend python -m pytest Backend/tests -v
```

### Frontend Tests (Vitest: 182/182 Passed)
Executes 182 unit and integration tests across customer filtering, DataMyne Brazil integration, dynamic audience tab counts, phone number normalization, CSV injection defenses, and UI components.

```bash
cd Frontend
npm test -- --run
```

### Production Build Validation
Verify that the production TypeScript bundle compiles without any type errors:

```bash
cd Frontend
npm run build
```

---

## Cloud Deployment & Architecture

LeadForge is deployed to **AWS under the Perpetual Free Tier ($0.00 / month)**:

1. **Amazon S3 Web Bucket (`jfll-leadforge-frontend`)**: Houses production-built single-page application assets. Configured as a private bucket with **Origin Access Control (OAC)**.
2. **Amazon S3 Data Bucket (`jfll-leadforge-data`)**: Holds the Zstandard-compressed Parquet datasets (~77.5 MB total).
3. **AWS Lambda (`jfll-leadforge-api`)**: Python 3.12 (x86_64) serverless compute running FastAPI and DuckDB.
4. **Amazon CloudFront Distribution**: Global CDN providing low-latency HTTPS delivery, automatic compression (Gzip / Brotli), and path-based routing:
   - `/*` -> S3 Frontend Origin
   - `/api/v1/*` -> Lambda Function URL Origin
5. **Continuous Deployment (GitHub Actions)**: Automated CI/CD pipeline runs tests, builds the frontend bundle, and deploys new releases on every push to `main`.

For detailed deployment steps, configuration values, and the $0.01 CloudWatch billing alarm guide, refer to the [AWS Free Tier Deployment Runbook](file:///Users/deepak/Development/Jet%20Freight%20Logistics/Lead%20Sourcing%20Tool/Backend/docs/AWS_FREE_TIER_DEPLOYMENT_RUNBOOK.md).

---

## Observability & Structured Logging

Both tiers generate production-ready structured JSON logs designed for Amazon CloudWatch and CloudFront log parsing:

### Backend Log Format (`CloudWatchJSONFormatter`)
Each request outputs a structured single-line JSON log containing tracing identifiers and execution latency:

```json
{
  "timestamp": "2026-10-18T16:00:00.000Z",
  "level": "INFO",
  "logger": "jfll.access",
  "message": "GET /api/v1/apollo/leads -> 200 (2.41ms)",
  "trace_id": "Root=1-6707c91c-1a2b3c4d5e6f7g8h",
  "client_ip": "203.0.113.195",
  "method": "GET",
  "path": "/api/v1/apollo/leads",
  "query_params": { "page": "1", "page_size": "25", "tab": "top_cargo_verticals" },
  "status_code": 200,
  "duration_ms": 2.41
}
```

### Client-Side Telemetry Buffer
The React frontend records user interactions, API latencies, and unexpected runtime errors in an in-memory ring-buffer accessible via:
```javascript
// In browser DevTools console:
window.__APP_LOGS__
```

---

## Configuration Reference

The backend configuration is managed via environment variables (or `.env` file):

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `S3_BUCKET` | `jfll-leadforge-data` | Name of the AWS S3 bucket holding Parquet files |
| `PARQUET_KEY` | `leads/active_customers_leads_zstd.parquet` | S3 object key for the customer leads Parquet file |
| `LOCAL_PARQUET_PATH` | `data/processed/active_customers_leads_zstd.parquet` | Fallback local file path if S3 is unavailable |
| `AWS_REGION` | `ap-southeast-2` | AWS region |
| `AUTH_SECRET_KEY` | *(Configurable secret)* | Secret key for signing RFC 7519 HS256 tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | JWT token validity duration (8 hours) |
| `ALLOW_ORIGINS` | `http://localhost:5173,...` | Comma-delimited list of CORS allowed origins |

---

## License

Proprietary and Confidential. Copyright © 2026 Jet Freight Logistics Limited. All rights reserved.
