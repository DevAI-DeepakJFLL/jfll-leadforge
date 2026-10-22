
from pydantic import BaseModel, Field


class LeadRecord(BaseModel):
    full_name: str = Field(..., description="Cleaned company name")
    territory: str = Field(..., description="Geographical territory")
    contact_person_name: str | None = Field(None, description="Contact person name (title case, no salutations)")
    mobile_number: str | None = Field(None, description="Cleaned phone with country code")
    email: str | None = Field(None, description="Cleaned lowercase email")
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
    data: list[LeadRecord] = Field(..., description="List of lead records")
    audience_counts: AudienceCounts | None = Field(default=None, description="Audience quick counts")



class HealthResponse(BaseModel):
    status: str
    backend: str
    floci_endpoint: str
    s3_target: str


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=150, description="Enterprise work email")
    password: str | None = Field(default=None, description="Optional account password")


class UserSessionResponse(BaseModel):
    email: str = Field(..., description="Authenticated user email")
    name: str = Field(..., description="User display name")
    role: str = Field(..., description="Assigned role")
    token: str = Field(..., description="Signed authentication bearer token")
    token_type: str = Field(default="Bearer", description="Token type")
    expires_at: str | None = Field(None, description="ISO timestamp of token expiration")


class ApolloLeadRecord(BaseModel):
    organization_id: str = Field(..., description="Apollo organization unique identifier")
    organization_name: str = Field(..., description="Company legal/trading name")
    domain: str = Field(..., description="Corporate web domain")
    website_url: str | None = Field(None, description="Full website URL")
    phone: str = Field(..., description="Validated telephone number")
    employee_count: int | None = Field(None, description="Current employee headcount")
    revenue_usd: int | None = Field(None, description="Estimated gross annual revenue in USD")
    founded_year: int | None = Field(None, description="Year company was established")
    industry: str = Field(..., description="Logistics cargo vertical")
    specialties: str | None = Field(None, description="Manufacturing and trade specialties")
    keywords: str | None = Field(None, description="Trade and product keywords")
    technologies_raw: str | None = Field(None, description="Detected technology and ERP stack")
    job_functions_json: str | None = Field(None, description="Departmental headcount breakdown JSON")
    linkedin_url: str | None = Field(None, description="Company LinkedIn profile URL")
    hq_city: str | None = Field(None, description="Headquarters city")
    hq_state: str | None = Field(None, description="Headquarters state or province")
    hq_country: str | None = Field(None, description="Headquarters country")
    hq_postal_code: str | None = Field(None, description="Headquarters postal or ZIP code")


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
    data: list[ApolloLeadRecord] = Field(..., description="List of Apollo lead records")
    audience_counts: ApolloAudienceCounts | None = Field(default=None, description="Audience quick counts")


class ApolloContactRecord(BaseModel):
    person_id: str = Field(..., description="Master Apollo person identifier")
    organization_id: str | None = Field(None, description="Linked employer organization ID")
    person_name: str = Field(..., description="Full contact name")
    first_name: str | None = Field(None, description="First name")
    last_name: str | None = Field(None, description="Last name")
    job_title: str = Field(..., description="Exact corporate job title")
    job_title_normalized: str | None = Field(None, description="Standardized title category")
    seniority: str | None = Field(None, description="Hierarchical tier: c_suite, vp, director, manager, senior, entry")
    department: str | None = Field(None, description="Functional department")
    email: str | None = Field(None, description="Direct business email address")
    email_status: str | None = Field(None, description="Email deliverability status (Verified or Extrapolated)")
    email_confidence: float | None = Field(None, description="Confidence rating (0.0 to 1.0)")
    linkedin_url: str | None = Field(None, description="Personal LinkedIn profile URL")
    contact_city: str | None = Field(None, description="Contact city")
    contact_state: str | None = Field(None, description="Contact state or province")
    contact_country: str | None = Field(None, description="Contact country")
    is_decision_maker: bool = Field(default=False, description="True for C-Suite, VP, Director, Head, or Manager")
    is_logistics_role: bool = Field(default=False, description="True for logistics, supply chain, freight, or procurement")
    has_email: bool = Field(default=False, description="True if email is present")
    employer_name: str | None = Field(None, description="Employer name for unprofiled contacts")


class ApolloContactsPaginatedResponse(BaseModel):
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, description="Number of items per page")
    total_records: int = Field(..., ge=0, description="Total matching contacts")
    total_pages: int = Field(..., ge=0, description="Total pages available")
    has_next: bool = Field(..., description="Whether subsequent page exists")
    data: list[ApolloContactRecord] = Field(..., description="List of Apollo contact records")


