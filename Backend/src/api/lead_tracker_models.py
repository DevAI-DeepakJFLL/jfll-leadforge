"""Pydantic models and enums for Phase 2 Lead Status Tracker.

Follows freight-forwarding domain concepts (Transport Mode, Routing Control,
Sales Feedback, Follow-up Cadence) and DSA-conscious design principles.
"""

from datetime import date, datetime, timezone
from enum import Enum
import re
import uuid

from pydantic import BaseModel, Field, field_validator


class TrackerStatus(str, Enum):
    """Core pipeline stages for freight sales lead tracking."""
    ASSIGNED = "Assigned"
    CONTACTED = "Contacted"
    MEETING_SCHEDULED = "Meeting Scheduled"
    QUOTED = "Quoted"
    FEEDBACK_RECEIVED = "Feedback Received"
    TRIAL_SHIPMENT = "Trial Shipment"
    WON = "Won"
    ON_HOLD = "On Hold"
    CLOSED_LOST = "Closed / Lost"


class TransportMode(str, Enum):
    """Freight forwarding transport and logistics modes."""
    AIR_FREIGHT = "Air Freight"
    OCEAN_FCL = "Ocean FCL"
    OCEAN_LCL = "Ocean LCL"
    COURIER_EXPRESS = "Courier / Express"
    CHA_BROKERAGE = "CHA Brokerage"
    MULTIMODAL = "Multimodal"


class RoutingType(str, Enum):
    """Freight routing control: Freehand (shipper controls) vs Nominated (buyer controls)."""
    FREEHAND = "Freehand"
    NOMINATED = "Nominated"
    NOT_SPECIFIED = "Not Specified"


def _validate_iso_date_str(v: str | None, field_name: str) -> str | None:
    """Validate that date string is strictly in ISO 8601 YYYY-MM-DD format."""
    if v is None:
        return None
    clean = v.strip()
    if not clean:
        return None
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", clean):
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format (got '{v}')")
    try:
        datetime.strptime(clean, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(f"{field_name} is not a valid calendar date: '{v}'") from exc
    return clean


class LeadTrackerLogEntry(BaseModel):
    """Audit trail activity log entry for a tracked lead."""
    id: str = Field(default_factory=lambda: f"log_{uuid.uuid4().hex[:8]}")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp of activity",
    )
    author_name: str = Field(..., description="Name of the person logging activity")
    author_email: str = Field(..., description="Email of the person logging activity")
    action: str = Field(..., description="Action taken, e.g. Call, Meeting, Reassignment, Status Change")
    notes: str | None = Field(default=None, max_length=4000, description="Detailed notes or feedback")


class LeadTrackerItem(BaseModel):
    """Full tracked lead entity with freight forwarding commercials and status."""
    id: str = Field(
        default_factory=lambda: f"trk_{uuid.uuid4().hex[:12]}",
        description="Unique identifier starting with 'trk_'",
    )
    company_name: str = Field(..., min_length=1, description="Company or prospect name")
    contact_person: str | None = Field(default=None, description="Primary contact name")
    contact_phone: str | None = Field(default=None, description="Primary contact phone")
    contact_email: str | None = Field(default=None, description="Primary contact email")
    branch: str = Field(default="Mumbai", description="Branch location, e.g. Mumbai, Gujarat, South India")
    assigned_to: str = Field(..., min_length=1, description="Sales rep name, e.g. Edward, Tasneem, Priyanka Sardesai")
    assigned_to_email: str | None = Field(default=None, description="Sales rep email")
    assigned_by: str = Field(default="Tyra Theknath", description="Manager who assigned the lead")
    assigned_date: str = Field(..., description="ISO 8601 date string YYYY-MM-DD when lead was assigned")
    status: str = Field(default=TrackerStatus.ASSIGNED.value, description="Current pipeline stage")
    transport_mode: str = Field(default=TransportMode.AIR_FREIGHT.value, description="Primary cargo transport mode")
    routing_type: str = Field(default=RoutingType.FREEHAND.value, description="Freehand vs Nominated")
    feedback_notes: str | None = Field(default=None, max_length=4000, description="Latest feedback from shipper")
    next_followup_date: str | None = Field(default=None, description="ISO 8601 date string YYYY-MM-DD for next touchpoint")
    next_action: str | None = Field(default=None, max_length=2000, description="Concrete next step")
    linked_entity_type: str = Field(default="custom", description="Source entity type: datamyne, apollo, jfll_customer, custom")
    linked_entity_id: str | None = Field(default=None, description="Source entity ID in Datamyne or Apollo")
    history: list[LeadTrackerLogEntry] = Field(default_factory=list, description="Chronological log history")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC creation timestamp",
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC last update timestamp",
    )

    @field_validator("id")
    @classmethod
    def validate_id_prefix(cls, v: str) -> str:
        clean = v.strip()
        if not clean.startswith("trk_"):
            raise ValueError("Lead tracker ID must start with 'trk_' prefix")
        return clean

    @field_validator("assigned_date")
    @classmethod
    def validate_assigned_date(cls, v: str) -> str:
        res = _validate_iso_date_str(v, "assigned_date")
        if not res:
            raise ValueError("assigned_date is required and must be in YYYY-MM-DD format")
        return res

    @field_validator("next_followup_date")
    @classmethod
    def validate_next_followup_date(cls, v: str | None) -> str | None:
        return _validate_iso_date_str(v, "next_followup_date")

    @field_validator("linked_entity_type")
    @classmethod
    def validate_linked_entity_type(cls, v: str) -> str:
        allowed = {"datamyne", "apollo", "jfll_customer", "custom"}
        clean = v.strip().lower()
        if clean not in allowed:
            raise ValueError(f"linked_entity_type must be one of {allowed}, got '{v}'")
        return clean


class LeadTrackerCreate(BaseModel):
    """Payload to create a new tracked lead."""
    company_name: str = Field(..., min_length=1, description="Company name")
    assigned_to: str = Field(..., min_length=1, description="Sales rep name")
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    branch: str = "Mumbai"
    assigned_to_email: str | None = None
    assigned_by: str = "Tyra Theknath"
    assigned_date: str = Field(
        default_factory=lambda: date.today().isoformat(),
        description="ISO 8601 date string YYYY-MM-DD",
    )
    status: str = TrackerStatus.ASSIGNED.value
    transport_mode: str = TransportMode.AIR_FREIGHT.value
    routing_type: str = RoutingType.FREEHAND.value
    feedback_notes: str | None = None
    next_followup_date: str | None = None
    next_action: str | None = None
    linked_entity_type: str = "custom"
    linked_entity_id: str | None = None

    @field_validator("assigned_date", mode="before")
    @classmethod
    def validate_assigned_date(cls, v: str | None) -> str:
        if v is None or not str(v).strip():
            return date.today().isoformat()
        res = _validate_iso_date_str(str(v), "assigned_date")
        if not res:
            return date.today().isoformat()
        return res

    @field_validator("next_followup_date")
    @classmethod
    def validate_next_followup_date(cls, v: str | None) -> str | None:
        return _validate_iso_date_str(v, "next_followup_date")

    @field_validator("linked_entity_type")
    @classmethod
    def validate_linked_entity_type(cls, v: str) -> str:
        allowed = {"datamyne", "apollo", "jfll_customer", "custom"}
        clean = v.strip().lower()
        if clean not in allowed:
            raise ValueError(f"linked_entity_type must be one of {allowed}, got '{v}'")
        return clean


class LeadTrackerUpdate(BaseModel):
    """Payload to update an existing tracked lead."""
    company_name: str | None = None
    contact_person: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    branch: str | None = None
    assigned_to: str | None = None
    assigned_to_email: str | None = None
    assigned_by: str | None = None
    assigned_date: str | None = None
    status: str | None = None
    transport_mode: str | None = None
    routing_type: str | None = None
    feedback_notes: str | None = None
    next_followup_date: str | None = None
    next_action: str | None = None
    linked_entity_type: str | None = None
    linked_entity_id: str | None = None

    @field_validator("assigned_date")
    @classmethod
    def validate_assigned_date(cls, v: str | None) -> str | None:
        return _validate_iso_date_str(v, "assigned_date")

    @field_validator("next_followup_date")
    @classmethod
    def validate_next_followup_date(cls, v: str | None) -> str | None:
        return _validate_iso_date_str(v, "next_followup_date")

    @field_validator("linked_entity_type")
    @classmethod
    def validate_linked_entity_type(cls, v: str | None) -> str | None:
        if v is None:
            return None
        allowed = {"datamyne", "apollo", "jfll_customer", "custom"}
        clean = v.strip().lower()
        if clean not in allowed:
            raise ValueError(f"linked_entity_type must be one of {allowed}, got '{v}'")
        return clean


class TrackerActivityCreate(BaseModel):
    """Payload to record activity on a tracked lead."""
    action: str = Field(..., min_length=1, description="Activity action taken")
    notes: str | None = Field(default=None, max_length=4000)
    author_name: str | None = None
    author_email: str | None = None
    status: str | None = None
    next_followup_date: str | None = None

    @field_validator("next_followup_date")
    @classmethod
    def validate_next_followup_date(cls, v: str | None) -> str | None:
        return _validate_iso_date_str(v, "next_followup_date")


class TrackerKPIs(BaseModel):
    """High-level executive metrics for Lead Status Tracker."""
    total_leads: int = 0
    active_leads: int = 0
    quoted_leads: int = 0
    won_leads: int = 0
    overdue_leads: int = 0
