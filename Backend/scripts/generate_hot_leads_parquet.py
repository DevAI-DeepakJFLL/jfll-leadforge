"""
ETL Pipeline: Generate Parquet and Frontend TypeScript Dataset from Client Tax Invoice Cross-Reference.
Reads 'Database Cross-Reference' sheet from Phase2/Client_Tax_Invoice_Data.xlsx and exports:
1. Backend/data/processed/client_tax_cross_reference_zstd.parquet (Zstandard compressed)
2. Frontend/src/data/hotLeadsData.ts (Typed TypeScript dataset for offline/fast load)
"""

import os
import json
from pathlib import Path
import openpyxl
import pyarrow as pa
import pyarrow.parquet as pq

def run_etl():
    project_root = Path(__file__).resolve().parent.parent.parent
    xlsx_path = project_root / "Phase2" / "Client_Tax_Invoice_Data.xlsx"
    backend_parquet_path = project_root / "Backend" / "data" / "processed" / "client_tax_cross_reference_zstd.parquet"
    frontend_ts_path = project_root / "Frontend" / "src" / "data" / "hotLeadsData.ts"
    frontend_types_path = project_root / "Frontend" / "src" / "types" / "hotLeads.ts"

    if not xlsx_path.exists():
        raise FileNotFoundError(f"Source Excel not found at {xlsx_path}")

    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    if "Database Cross-Reference" not in wb.sheetnames:
        raise ValueError(f"Sheet 'Database Cross-Reference' not found in {xlsx_path}. Available: {wb.sheetnames}")

    ws = wb["Database Cross-Reference"]
    rows = list(ws.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        raise ValueError("No data found in 'Database Cross-Reference' sheet")

    headers = [
        "sr_no",
        "gstin",
        "customer_name",
        "taxable_turnover_inr",
        "jfll_crm_status",
        "jfll_sales_rep",
        "jfll_contact_person",
        "jfll_direct_phone",
        "jfll_direct_email",
        "datamyne_trade_activity",
        "apollo_matched_entity",
        "apollo_corporate_domain",
        "apollo_employees",
        "apollo_decision_maker",
        "decision_maker_title",
        "decision_maker_direct_email",
        "email_status",
        "linkedin_profile"
    ]

    records = []
    parquet_dict = {h: [] for h in headers}

    for row_idx, r in enumerate(rows[1:], 1):
        sr_no = int(r[0]) if r[0] is not None else row_idx
        gstin = str(r[1]).strip() if r[1] is not None else ""
        customer_name = str(r[2]).strip() if r[2] is not None else ""
        turnover = int(r[3]) if isinstance(r[3], (int, float)) else 0
        crm_status = str(r[4]).strip() if r[4] is not None else "Prospect (Not in JFLL)"
        sales_rep = str(r[5]).strip() if r[5] is not None else "-"
        contact_person = str(r[6]).strip() if r[6] is not None else "-"
        phone = str(r[7]).strip() if r[7] is not None else "-"
        email = str(r[8]).strip() if r[8] is not None else "-"
        datamyne_trade = str(r[9]).strip() if r[9] is not None else "-"
        apollo_entity = str(r[10]).strip() if r[10] is not None else "-"
        apollo_domain = str(r[11]).strip() if r[11] is not None else "-"
        apollo_employees = str(r[12]).strip() if r[12] is not None else "-"
        apollo_dm = str(r[13]).strip() if r[13] is not None else "-"
        dm_title = str(r[14]).strip() if r[14] is not None else "-"
        dm_email = str(r[15]).strip() if r[15] is not None else "-"
        email_status = str(r[16]).strip() if r[16] is not None else "-"
        linkedin = str(r[17]).strip() if r[17] is not None else "-"

        record = {
            "srNo": sr_no,
            "gstin": gstin,
            "customerName": customer_name,
            "taxableTurnover": turnover,
            "crmStatus": crm_status,
            "salesRep": sales_rep,
            "contactPerson": contact_person,
            "phone": phone,
            "email": email,
            "datamyneTradeActivity": datamyne_trade,
            "apolloMatchedEntity": apollo_entity,
            "apolloDomain": apollo_domain,
            "apolloEmployees": apollo_employees,
            "apolloDecisionMaker": apollo_dm,
            "decisionMakerTitle": dm_title,
            "decisionMakerEmail": dm_email,
            "emailStatus": email_status,
            "linkedinProfile": linkedin,
        }
        records.append(record)

        parquet_dict["sr_no"].append(sr_no)
        parquet_dict["gstin"].append(gstin)
        parquet_dict["customer_name"].append(customer_name)
        parquet_dict["taxable_turnover_inr"].append(turnover)
        parquet_dict["jfll_crm_status"].append(crm_status)
        parquet_dict["jfll_sales_rep"].append(sales_rep)
        parquet_dict["jfll_contact_person"].append(contact_person)
        parquet_dict["jfll_direct_phone"].append(phone)
        parquet_dict["jfll_direct_email"].append(email)
        parquet_dict["datamyne_trade_activity"].append(datamyne_trade)
        parquet_dict["apollo_matched_entity"].append(apollo_entity)
        parquet_dict["apollo_corporate_domain"].append(apollo_domain)
        parquet_dict["apollo_employees"].append(apollo_employees)
        parquet_dict["apollo_decision_maker"].append(apollo_dm)
        parquet_dict["decision_maker_title"].append(dm_title)
        parquet_dict["decision_maker_direct_email"].append(dm_email)
        parquet_dict["email_status"].append(email_status)
        parquet_dict["linkedin_profile"].append(linkedin)

    # 1. Export Parquet
    backend_parquet_path.parent.mkdir(parents=True, exist_ok=True)
    arrow_schema = pa.schema([
        ("sr_no", pa.int64()),
        ("gstin", pa.string()),
        ("customer_name", pa.string()),
        ("taxable_turnover_inr", pa.int64()),
        ("jfll_crm_status", pa.string()),
        ("jfll_sales_rep", pa.string()),
        ("jfll_contact_person", pa.string()),
        ("jfll_direct_phone", pa.string()),
        ("jfll_direct_email", pa.string()),
        ("datamyne_trade_activity", pa.string()),
        ("apollo_matched_entity", pa.string()),
        ("apollo_corporate_domain", pa.string()),
        ("apollo_employees", pa.string()),
        ("apollo_decision_maker", pa.string()),
        ("decision_maker_title", pa.string()),
        ("decision_maker_direct_email", pa.string()),
        ("email_status", pa.string()),
        ("linkedin_profile", pa.string()),
    ])
    arrow_table = pa.Table.from_pydict(parquet_dict, schema=arrow_schema)
    pq.write_table(arrow_table, backend_parquet_path, compression="zstd")
    print(f"✅ Generated Backend Parquet: {backend_parquet_path} ({backend_parquet_path.stat().st_size / 1024:.2f} KB, {len(records)} rows)")

    # 2. Export Frontend Types
    frontend_types_path.parent.mkdir(parents=True, exist_ok=True)
    types_content = """/**
 * Hot Leads / Tax Invoice Cross-Reference Intelligence Types
 * Source: Phase2/Client_Tax_Invoice_Data.xlsx (Database Cross-Reference Audit)
 */

export type HotLeadCrmStatus = 'Prospect (Not in JFLL)' | 'Active Customer' | 'Not Active Customer';

export type HotLeadSegment = 'all' | 'prospects' | 'reactivations' | 'active' | 'with-decision-makers';

export interface HotLead {
  srNo: number;
  gstin: string;
  customerName: string;
  taxableTurnover: number;
  crmStatus: HotLeadCrmStatus | string;
  salesRep: string;
  contactPerson: string;
  phone: string;
  email: string;
  datamyneTradeActivity: string;
  apolloMatchedEntity: string;
  apolloDomain: string;
  apolloEmployees: string;
  apolloDecisionMaker: string;
  decisionMakerTitle: string;
  decisionMakerEmail: string;
  emailStatus: string;
  linkedinProfile: string;
}

export interface HotLeadsMetrics {
  totalTurnover: number;
  totalCount: number;
  prospectsCount: number;
  reactivationsCount: number;
  activeCount: number;
  decisionMakersCount: number;
}

export interface HotLeadsFilterParams {
  q?: string;
  segment?: HotLeadSegment;
  sortBy?: 'turnover' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface HotLeadsResponse {
  items: HotLead[];
  totalRecords: number;
  metrics: HotLeadsMetrics;
}
"""
    frontend_types_path.write_text(types_content, encoding="utf-8")
    print(f"✅ Generated Frontend Types: {frontend_types_path}")

    # 3. Export Frontend TypeScript Data
    frontend_ts_path.parent.mkdir(parents=True, exist_ok=True)
    ts_content = f"""/**
 * Hot Leads & Tax Invoice Cross-Reference Dataset
 * Sourced from Phase2/Client_Tax_Invoice_Data.xlsx
 * Total Records: {len(records)}
 */

import {{ HotLead }} from '@/types/hotLeads';

export const HOT_LEADS_DATA: HotLead[] = {json.dumps(records, indent=2)};
"""
    frontend_ts_path.write_text(ts_content, encoding="utf-8")
    print(f"✅ Generated Frontend TS Data: {frontend_ts_path} ({len(records)} records)")

if __name__ == "__main__":
    run_etl()
