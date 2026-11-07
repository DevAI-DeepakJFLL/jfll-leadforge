"""Pydantic data models for Client Report / Prospect Brief generation.
Matches the 4-section executive briefing architecture used by Jet Freight Logistics.
"""
from typing import List, Optional
from pydantic import BaseModel, Field

class ReportHeader(BaseModel):
    title: str = "CLIENT REPORT · PROSPECT BRIEF"
    company_name: str
    subtitle: str
    prepared_for: str = "Mumbai Sales Branch"
    prepared_by: str = "Tyra Theknath"
    date: str

class CompanyBackground(BaseModel):
    what_they_do: str
    hq_facilities: str
    export_markets: str
    scale_credibility: str

class TradeLaneCommodity(BaseModel):
    origin_destination: str
    commodity: str
    primary_mode: str
    special_handling: str
    total_shipments: int = 0
    total_value_usd: float = 0.0
    lading_port: str = "INBOM4 (Mumbai Air) / INNSA1 (Nhava Sheva Sea)"

class JfllFit(BaseModel):
    cargo_strength: str
    pitch_angle: str

class ContactItem(BaseModel):
    name: str
    designation: str
    contact_info: str
    notes: str

class ClientReportData(BaseModel):
    lead_id: Optional[str] = None
    header: ReportHeader
    section_1_background: CompanyBackground
    section_2_trade_lane: TradeLaneCommodity
    section_3_jfll_fit: JfllFit
    section_4_contacts: List[ContactItem] = Field(default_factory=list)

class ReportCompanySuggestion(BaseModel):
    id: str
    company_name: str
    city: Optional[str] = None
    country: Optional[str] = "India"
    total_shipments: int = 0
    total_value_usd: float = 0.0
    category: Optional[str] = None

class GenerateReportRequest(BaseModel):
    company_name_or_id: str
    prepared_for: Optional[str] = "Mumbai Sales Branch"
    prepared_by: Optional[str] = "Tyra Theknath"
