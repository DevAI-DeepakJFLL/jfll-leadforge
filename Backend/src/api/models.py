from typing import List, Optional
from pydantic import BaseModel, Field


class LeadRecord(BaseModel):
    full_name: str = Field(..., description="Cleaned company name")
    territory: str = Field(..., description="Geographical territory")
    contact_person_name: Optional[str] = Field(None, description="Contact person name (title case, no salutations)")
    mobile_number: Optional[str] = Field(None, description="Cleaned phone with country code")
    email: Optional[str] = Field(None, description="Cleaned lowercase email")
    status: str = Field(..., description="Customer status: Active or Not Active")
    customer_group: str = Field(..., description="Business category")
    type: str = Field(..., description="Legal registration type")


class AudienceCounts(BaseModel):
    all: int = Field(default=0)
    shippers: int = Field(default=0)
    subagents: int = Field(default=0)
    overseas: int = Field(default=0)
    with_contacts: int = Field(default=0)


class PaginatedResponse(BaseModel):
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, description="Number of items returned per page")
    total_records: int = Field(..., ge=0, description="Total matching records across all pages")
    total_pages: int = Field(..., ge=0, description="Total number of pages available")
    has_next: bool = Field(..., description="Whether a subsequent page exists")
    data: List[LeadRecord] = Field(..., description="List of lead records")
    audience_counts: Optional[AudienceCounts] = Field(default=None, description="Audience quick counts")



class HealthResponse(BaseModel):
    status: str
    backend: str
    floci_endpoint: str
    s3_target: str


class LoginRequest(BaseModel):
    email: str = Field(..., description="Enterprise work email")
    password: str = Field(..., min_length=1, description="Account password")


class UserSessionResponse(BaseModel):
    email: str = Field(..., description="Authenticated user email")
    name: str = Field(..., description="User display name")
    role: str = Field(..., description="Assigned role")
    token: str = Field(..., description="Signed authentication bearer token")
    token_type: str = Field(default="Bearer", description="Token type")
    expires_at: Optional[str] = Field(None, description="ISO timestamp of token expiration")


class ApolloLeadRecord(BaseModel):
    organization_id: str = Field(..., description="Apollo organization unique identifier")
    organization_name: str = Field(..., description="Company legal/trading name")
    domain: str = Field(..., description="Corporate web domain")
    website_url: Optional[str] = Field(None, description="Full website URL")
    phone: str = Field(..., description="Validated telephone number")
    employee_count: Optional[int] = Field(None, description="Current employee headcount")
    revenue_usd: Optional[int] = Field(None, description="Estimated gross annual revenue in USD")
    founded_year: Optional[int] = Field(None, description="Year company was established")
    industry: str = Field(..., description="Logistics cargo vertical")
    specialties: Optional[str] = Field(None, description="Manufacturing and trade specialties")
    keywords: Optional[str] = Field(None, description="Trade and product keywords")
    technologies_raw: Optional[str] = Field(None, description="Detected technology and ERP stack")
    job_functions_json: Optional[str] = Field(None, description="Departmental headcount breakdown JSON")
    linkedin_url: Optional[str] = Field(None, description="Company LinkedIn profile URL")
    hq_city: Optional[str] = Field(None, description="Headquarters city")
    hq_state: Optional[str] = Field(None, description="Headquarters state or province")
    hq_country: Optional[str] = Field(None, description="Headquarters country")
    hq_postal_code: Optional[str] = Field(None, description="Headquarters postal or ZIP code")


class ApolloAudienceCounts(BaseModel):
    all: int = Field(default=0)
    high_headcount: int = Field(default=0, description="Companies with 100+ employees")
    high_revenue: int = Field(default=0, description="Companies with $10M+ annual revenue")
    top_cargo_verticals: int = Field(default=0, description="Automotive, Food & Bev, Pharma, Tech, Chemicals")
    with_website_linkedin: int = Field(default=0, description="Profiles with both website and LinkedIn verified")


class ApolloPaginatedResponse(BaseModel):
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, description="Number of items per page")
    total_records: int = Field(..., ge=0, description="Total matching records")
    total_pages: int = Field(..., ge=0, description="Total pages available")
    has_next: bool = Field(..., description="Whether subsequent page exists")
    data: List[ApolloLeadRecord] = Field(..., description="List of Apollo lead records")
    audience_counts: Optional[ApolloAudienceCounts] = Field(default=None, description="Audience quick counts")


