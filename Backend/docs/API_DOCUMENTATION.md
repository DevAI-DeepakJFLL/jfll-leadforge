# Customer Lead Master API Documentation

## Overview
The **Customer Lead Master Service** is a high-performance REST API built with FastAPI and DuckDB. It queries a compressed **Zstandard (ZSTD) Apache Parquet** lead database of active customers hosted directly on **AWS S3** (or the local **Floci** AWS emulator).

By streaming columnar row-group byte ranges directly from S3, the API eliminates the need for expensive relational database indexing while offering sub-2 millisecond query latencies, full text search, and frontend pagination.

---

## Architecture & Data Flow

```
┌──────────────────┐               ┌────────────────────────┐               ┌──────────────────────────────┐
│ Frontend / Client│ ──HTTP GET──> │ FastAPI + DuckDB Engine │ ──S3 HTTPFS──> │ Floci S3 / AWS S3 Bucket     │
│  (React, Vue)    │ <──JSON Resp─ │ (Parameterized Queries)│ <──Byte Ranges─ │ active_customers_leads_zstd  │
└──────────────────┘               └────────────────────────┘               └──────────────────────────────┘
```

---

## Base URL & Interactive Docs

| Environment | Base URL | Swagger UI | ReDoc |
| :--- | :--- | :--- | :--- |
| **Local (Floci)** | `http://127.0.0.1:8000` | `http://127.0.0.1:8000/docs` | `http://127.0.0.1:8000/redoc` |
| **AWS Production** | `https://api.yourdomain.com` | `https://api.yourdomain.com/docs` | `https://api.yourdomain.com/redoc` |

---

## Endpoints

### 1. Health Check
* **Method**: `GET`
* **Path**: `/health`
* **Description**: Probes service status and verifies connectivity to the underlying S3 / Floci storage target.

#### Response (`200 OK`):
```json
{
  "status": "healthy",
  "backend": "Floci AWS Emulator",
  "floci_endpoint": "http://localhost:4566",
  "s3_target": "s3://customer-master-leads/leads/active_customers_leads_zstd.parquet"
}
```

---

### 2. List Leads (Paginated)
* **Method**: `GET`
* **Path**: `/api/v1/leads`
* **Description**: Queries active customer leads with pagination, full-text keyword search, and customer group filtering.

#### Query Parameters:
| Parameter | Type | Required | Default | Validation / Constraints | Description |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `page` | `integer` | No | `1` | `>= 1` | 1-indexed page number |
| `page_size` | `integer` | No | `25` | `1 <= size <= 100` | Number of items per page |
| `status` | `string` | No | `null` | `'Active'` or `'Not Active'` | Filter by status (`Active`) |
| `customer_group` | `string` | No | `null` | Allowed customer group | Filter by business segment (e.g., `Subagent`, `Shipper / Consignee`) |
| `search` | `string` | No | `null` | `1 <= length <= 100` | Case-insensitive substring match on company or contact name |

#### Success Response (`200 OK`):
```json
{
  "page": 1,
  "page_size": 25,
  "total_records": 881,
  "total_pages": 36,
  "has_next": true,
  "data": [
    {
      "full_name": "3S CORPORATION",
      "territory": "All Territories",
      "contact_person_name": "Priyanka",
      "mobile_number": "+91-8291360296",
      "email": "accounts@3scorporation.com",
      "status": "Active",
      "customer_group": "Subagent",
      "type": "Company"
    }
  ]
}
```

#### Error Responses:
* `400 Bad Request`: When `status` is not `'Active'` or `'Not Active'`.
```json
{
  "detail": "Invalid status 'Pending'. Must be one of: ['Active', 'Not Active']"
}
```
* `422 Unprocessable Entity`: When query parameters violate Pydantic validation (e.g. `page_size > 100` or `page < 1`).

---

## Frontend Integration Recipes

### Fetching with Pagination (TypeScript / JavaScript):
```typescript
interface Lead {
  full_name: string;
  territory: string;
  contact_person_name: string | null;
  mobile_number: string | null;
  email: string | null;
  status: "Active";
  customer_group: string;
  type: string;
}

interface PaginatedLeads {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  has_next: boolean;
  data: Lead[];
}

async function getLeads(page = 1, pageSize = 25, search?: string): Promise<PaginatedLeads> {
  const query = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (search) query.append("search", search);

  const res = await fetch(`http://127.0.0.1:8000/api/v1/leads?${query.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```
