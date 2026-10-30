"""Pydantic models and enums for sales approach logs and client active conversion."""

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class SalesAction(str, Enum):
    CALLED_CUSTOMER = "Called customer"
    LEFT_VOICEMAIL = "Left voicemail"
    SENT_EMAIL = "Sent email"
    SENT_WHATSAPP = "Sent WhatsApp"
    SENT_REPORT = "Sent report"
    SENT_QUOTE = "Sent quote"
    HELD_MEETING = "Held meeting"
    FOLLOW_UP_SCHEDULED = "Follow-up scheduled"
    INTERNAL_WORK = "Internal work (no customer contact)"
    OTHER = "Other"


class SalesStatus(str, Enum):
    NOT_CONTACTED = "Not Contacted"
    CONTACTED = "Contacted"
    REPORT_SENT = "Report Sent"
    WORKING_ON_IT = "Working on It"
    IN_PROGRESS = "In Progress"
    ON_HOLD = "On Hold"
    NO_RESPONSE = "No Response"
    NOT_INTERESTED = "Not Interested"
    CONVERTED_TO_ACTIVE = "Converted to Active"


FUNNEL_RANKS: dict[SalesStatus, int] = {
    SalesStatus.NOT_CONTACTED: 0,
    SalesStatus.CONTACTED: 1,
    SalesStatus.REPORT_SENT: 2,
    SalesStatus.WORKING_ON_IT: 3,
    SalesStatus.IN_PROGRESS: 4,
    SalesStatus.ON_HOLD: 5,
    SalesStatus.NO_RESPONSE: 6,
    SalesStatus.NOT_INTERESTED: 7,
    SalesStatus.CONVERTED_TO_ACTIVE: 8,
}

MANDATORY_NOTE_STATUSES = {
    SalesStatus.ON_HOLD,
    SalesStatus.NO_RESPONSE,
    SalesStatus.NOT_INTERESTED,
}


class ApproachLogEntry(BaseModel):
    id: str = Field(..., description="Unique log UUID")
    action: SalesAction = Field(..., description="Sales activity action taken")
    previous_status: SalesStatus = Field(..., description="Status before this log entry")
    status: SalesStatus = Field(..., description="Status resulting from this log entry")
    note: str | None = Field(default=None, max_length=2000, description="Explanatory notes or context")
    salesperson_name: str = Field(..., description="Name of the sales coordinator")
    salesperson_email: str = Field(..., description="Email of the sales coordinator")
    created_at: str = Field(..., description="ISO 8601 UTC timestamp")


class ApproachLogCreate(BaseModel):
    action: SalesAction = Field(..., description="Sales activity action taken")
    status: SalesStatus = Field(..., description="Target status")
    note: str | None = Field(default=None, max_length=2000, description="Context note (mandatory for backward or hold/no-response/uninterested)")

    @field_validator("note")
    @classmethod
    def clean_note(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            return v if v else None
        return None


class ConvertToActiveRequest(BaseModel):
    start_date: str = Field(..., min_length=10, max_length=10, description="Effective active start date (YYYY-MM-DD)")
    note: str | None = Field(default=None, max_length=2000, description="Optional activation handover notes")

    @field_validator("start_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        clean = v.strip()
        try:
            datetime.strptime(clean, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError("start_date must be in YYYY-MM-DD format") from exc
        return clean

    @field_validator("note")
    @classmethod
    def clean_note(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            return v if v else None
        return None


class EntityApproachHistory(BaseModel):
    entity_type: Literal["datamyne", "jfll_customer"]
    entity_id: str
    current_status: SalesStatus = Field(default=SalesStatus.NOT_CONTACTED)
    is_active_converted: bool = Field(default=False)
    converted_at: str | None = Field(default=None)
    conversion_start_date: str | None = Field(default=None)
    logs: list[ApproachLogEntry] = Field(default_factory=list)


class BulkStatusesResponse(BaseModel):
    entity_type: Literal["datamyne", "jfll_customer"]
    total_tracked: int
    statuses: dict[str, SalesStatus]
