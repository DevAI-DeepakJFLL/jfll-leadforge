"""Pydantic data models for Client Report / Prospect Brief generation.
Matches the 4-section executive briefing architecture used by Jet Freight Logistics.
"""

from pydantic import BaseModel, Field


class ReportHeader(BaseModel):
    title: str = Field(default="CLIENT REPORT · PROSPECT BRIEF", max_length=100)
    company_name: str = Field(..., min_length=1, max_length=250)
    subtitle: str = Field(..., max_length=300)
    prepared_for: str = Field(default="Mumbai Sales Branch", max_length=150)
    prepared_by: str = Field(default="Tyra Theknath", max_length=150)
    date: str = Field(..., max_length=50)

class CompanyBackground(BaseModel):
    what_they_do: str = Field(..., max_length=2000)
    hq_facilities: str = Field(..., max_length=1000)
    export_markets: str = Field(..., max_length=1000)
    scale_credibility: str = Field(..., max_length=1000)

class TradeLaneCommodity(BaseModel):
    origin_destination: str = Field(..., max_length=500)
    commodity: str = Field(..., max_length=1000)
    primary_mode: str = Field(..., max_length=100)
    special_handling: str = Field(..., max_length=1000)
    total_shipments: int = Field(default=0, ge=0)
    total_value_usd: float = Field(default=0.0, ge=0.0)
    lading_port: str = Field(default="INBOM4 (Mumbai Air) / INNSA1 (Nhava Sheva Sea)", max_length=300)

class JfllFit(BaseModel):
    cargo_strength: str = Field(..., max_length=2000)
    pitch_angle: str = Field(..., max_length=2000)

class ContactItem(BaseModel):
    name: str = Field(..., max_length=150)
    designation: str = Field(..., max_length=200)
    contact_info: str = Field(..., max_length=300)
    notes: str = Field(..., max_length=500)

class ClientReportData(BaseModel):
    lead_id: str | None = Field(default=None, max_length=100)
    header: ReportHeader
    section_1_background: CompanyBackground
    section_2_trade_lane: TradeLaneCommodity
    section_3_jfll_fit: JfllFit
    section_4_contacts: list[ContactItem] = Field(default_factory=list, max_length=100)

class ReportCompanySuggestion(BaseModel):
    id: str = Field(..., max_length=100)
    company_name: str = Field(..., max_length=250)
    city: str | None = Field(default=None, max_length=150)
    country: str | None = Field(default="India", max_length=100)
    total_shipments: int = Field(default=0, ge=0)
    total_value_usd: float = Field(default=0.0, ge=0.0)
    category: str | None = Field(default=None, max_length=200)

class GenerateReportRequest(BaseModel):
    company_name_or_id: str = Field(..., min_length=1, max_length=250)
    prepared_for: str | None = Field(default="Mumbai Sales Branch", max_length=150)
    prepared_by: str | None = Field(default="Tyra Theknath", max_length=150)
