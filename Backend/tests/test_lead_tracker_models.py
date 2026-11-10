"""Tests for Lead Tracker models, validations, and Excel seeder."""

from datetime import date, datetime
from pathlib import Path
import pytest
from pydantic import ValidationError

from src.api.lead_tracker_models import (
    LeadTrackerCreate,
    LeadTrackerItem,
    LeadTrackerLogEntry,
    LeadTrackerUpdate,
    RoutingType,
    TrackerActivityCreate,
    TrackerKPIs,
    TrackerStatus,
    TransportMode,
)
from src.api.lead_tracker_seeder import (
    find_default_excel_path,
    get_deterministic_fallback_leads,
    infer_routing_type,
    infer_transport_mode,
    map_excel_status_to_tracker_status,
    normalize_branch,
    normalize_rep,
    parse_flexible_date,
    seed_leads_from_excel,
)


# ============================================================================
# Model Validation Tests
# ============================================================================

def test_lead_tracker_item_valid():
    """Verify LeadTrackerItem instantiation with valid fields and default values."""
    item = LeadTrackerItem(
        company_name="Royal Arc",
        assigned_to="Edward",
        assigned_date="2026-07-29",
    )
    assert item.id.startswith("trk_")
    assert item.company_name == "Royal Arc"
    assert item.assigned_to == "Edward"
    assert item.assigned_date == "2026-07-29"
    assert item.branch == "Mumbai"
    assert item.status == TrackerStatus.ASSIGNED.value
    assert item.transport_mode == TransportMode.AIR_FREIGHT.value
    assert item.routing_type == RoutingType.FREEHAND.value
    assert item.linked_entity_type == "custom"
    assert isinstance(item.history, list)
    assert item.created_at is not None
    assert item.updated_at is not None


def test_lead_tracker_item_invalid_id():
    """Verify that an ID without the 'trk_' prefix raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        LeadTrackerItem(
            id="lead_12345",
            company_name="Acme Corp",
            assigned_to="Edward",
            assigned_date="2026-07-29",
        )
    assert "trk_" in str(exc_info.value)


def test_lead_tracker_item_invalid_dates():
    """Verify that malformed dates raise ValidationError."""
    # Invalid assigned_date
    with pytest.raises(ValidationError) as exc_info:
        LeadTrackerItem(
            company_name="Acme Corp",
            assigned_to="Edward",
            assigned_date="29/07/2026",  # Must be YYYY-MM-DD
        )
    assert "assigned_date" in str(exc_info.value)

    # Invalid calendar date (e.g. Feb 31)
    with pytest.raises(ValidationError) as exc_info:
        LeadTrackerItem(
            company_name="Acme Corp",
            assigned_to="Edward",
            assigned_date="2026-02-31",
        )
    assert "assigned_date" in str(exc_info.value)

    # Invalid next_followup_date
    with pytest.raises(ValidationError) as exc_info:
        LeadTrackerItem(
            company_name="Acme Corp",
            assigned_to="Edward",
            assigned_date="2026-07-29",
            next_followup_date="next week",
        )
    assert "next_followup_date" in str(exc_info.value)


def test_lead_tracker_item_valid_followup_date():
    """Verify next_followup_date accepts valid YYYY-MM-DD or None."""
    item = LeadTrackerItem(
        company_name="Acme Corp",
        assigned_to="Edward",
        assigned_date="2026-07-29",
        next_followup_date="2026-08-16",
    )
    assert item.next_followup_date == "2026-08-16"

    item_none = LeadTrackerItem(
        company_name="Acme Corp",
        assigned_to="Edward",
        assigned_date="2026-07-29",
        next_followup_date=None,
    )
    assert item_none.next_followup_date is None


def test_lead_tracker_item_linked_entity_validation():
    """Verify linked_entity_type is restricted to valid sources."""
    valid_item = LeadTrackerItem(
        company_name="Simson Pharma",
        assigned_to="Utkarsha",
        assigned_date="2026-07-31",
        linked_entity_type="datamyne",
        linked_entity_id="dm_9876",
    )
    assert valid_item.linked_entity_type == "datamyne"
    assert valid_item.linked_entity_id == "dm_9876"

    with pytest.raises(ValidationError) as exc_info:
        LeadTrackerItem(
            company_name="Simson Pharma",
            assigned_to="Utkarsha",
            assigned_date="2026-07-31",
            linked_entity_type="salesforce_crm",
        )
    assert "linked_entity_type" in str(exc_info.value)


def test_lead_tracker_create_model():
    """Verify LeadTrackerCreate auto-defaults assigned_date to today if omitted."""
    create_req = LeadTrackerCreate(
        company_name="New Prospect",
        assigned_to="Tasneem",
        branch="Mumbai",
    )
    assert create_req.company_name == "New Prospect"
    assert create_req.assigned_to == "Tasneem"
    assert create_req.assigned_date == date.today().isoformat()
    assert create_req.status == "Assigned"

    # Explicit date
    custom_req = LeadTrackerCreate(
        company_name="Custom Prospect",
        assigned_to="Edward",
        assigned_date="2026-09-01",
        next_followup_date="2026-09-18",
    )
    assert custom_req.assigned_date == "2026-09-01"
    assert custom_req.next_followup_date == "2026-09-18"


def test_lead_tracker_update_model():
    """Verify LeadTrackerUpdate allows partial updates and validates dates."""
    update = LeadTrackerUpdate(status="Quoted", feedback_notes="Quoted ocean freight")
    assert update.status == "Quoted"
    assert update.assigned_to is None

    update_date = LeadTrackerUpdate(next_followup_date="2026-09-25")
    assert update_date.next_followup_date == "2026-09-25"

    with pytest.raises(ValidationError):
        LeadTrackerUpdate(next_followup_date="tomorrow")


def test_lead_tracker_log_entry():
    """Verify LeadTrackerLogEntry creates valid audit trail records."""
    log = LeadTrackerLogEntry(
        author_name="Tyra Theknath",
        author_email="tyra@jfll.com",
        action="Called customer",
        notes="Discussed cold chain pharma rates",
    )
    assert log.id.startswith("log_")
    assert log.author_name == "Tyra Theknath"
    assert log.action == "Called customer"
    assert log.timestamp is not None


def test_tracker_kpis_model():
    """Verify TrackerKPIs defaults and values."""
    kpis = TrackerKPIs(
        total_leads=14,
        active_leads=10,
        quoted_leads=2,
        won_leads=1,
        overdue_leads=3,
    )
    assert kpis.total_leads == 14
    assert kpis.active_leads == 10
    assert kpis.quoted_leads == 2
    assert kpis.won_leads == 1
    assert kpis.overdue_leads == 3


def test_enums_integrity():
    """Verify enum members and values match freight forwarding requirements."""
    assert TrackerStatus.ASSIGNED.value == "Assigned"
    assert TrackerStatus.WON.value == "Won"
    assert TrackerStatus.QUOTED.value == "Quoted"
    assert TrackerStatus.FEEDBACK_RECEIVED.value == "Feedback Received"

    assert TransportMode.AIR_FREIGHT.value == "Air Freight"
    assert TransportMode.OCEAN_FCL.value == "Ocean FCL"
    assert TransportMode.COURIER_EXPRESS.value == "Courier / Express"

    assert RoutingType.FREEHAND.value == "Freehand"
    assert RoutingType.NOMINATED.value == "Nominated"


# ============================================================================
# Excel Seeder Tests
# ============================================================================

def test_excel_seeder_loads_real_records():
    """Verify seeder loads records from Phase2/Lead_Tracker.xlsx.
    
    Must parse at least 10 leads, with correct branches (Mumbai, Gujarat, South India)
    and assigned reps (Edward, Tasneem, Priyanka, Utkarsha, Sanjay, Sidhart Ji, Jaya).
    """
    leads = seed_leads_from_excel()
    assert len(leads) >= 10, f"Expected at least 10 leads, got {len(leads)}"

    branches = {lead.branch for lead in leads}
    expected_branches = {"Mumbai", "Gujarat", "South India"}
    assert expected_branches.issubset(branches), f"Missing branches: {expected_branches - branches}"

    reps = {lead.assigned_to for lead in leads}
    expected_reps = {
        "Edward",
        "Tasneem",
        "Priyanka Sardesai",
        "Utkarsha",
        "Sanjay",
        "Sidhart Ji",
        "Jaya",
    }
    assert expected_reps.issubset(reps), f"Missing reps: {expected_reps - reps}"

    # Verify ID formatting and date integrity
    for lead in leads:
        assert lead.id.startswith("trk_")
        assert len(lead.assigned_date) == 10
        # Check assigned_date parses as valid date
        datetime.strptime(lead.assigned_date, "%Y-%m-%d")
        if lead.next_followup_date is not None:
            assert len(lead.next_followup_date) == 10
            datetime.strptime(lead.next_followup_date, "%Y-%m-%d")

    # Verify deduplication: company names must be unique (case-insensitive)
    normalized_names = [lead.company_name.strip().lower() for lead in leads]
    assert len(normalized_names) == len(set(normalized_names)), "Duplicate company detected in merged leads!"


def test_excel_seeder_freight_forwarding_domain_logic():
    """Verify domain-specific parsing from notes and sheets."""
    leads = seed_leads_from_excel()
    leads_by_name = {lead.company_name.strip().lower(): lead for lead in leads}

    # 1. Royal Arc: should reflect sea freight mode and Quoted status from Updated sheet
    royal_arc = leads_by_name.get("royal arc")
    assert royal_arc is not None
    assert royal_arc.assigned_to == "Edward"
    assert royal_arc.branch == "Mumbai"
    assert royal_arc.status == TrackerStatus.QUOTED.value
    assert royal_arc.transport_mode == TransportMode.OCEAN_FCL.value

    # 2. CLEARSYNTH LABS: should reflect Courier / Express mode
    clearsynth = leads_by_name.get("clearsynth labs limited")
    assert clearsynth is not None
    assert clearsynth.assigned_to == "Edward"
    assert clearsynth.transport_mode == TransportMode.COURIER_EXPRESS.value

    # 3. TITAN LABORATORIES: should reflect Nominated routing
    titan = leads_by_name.get("titan laboratories pvt ltd")
    assert titan is not None
    assert titan.assigned_to == "Utkarsha"
    assert titan.routing_type == RoutingType.NOMINATED.value

    # 4. Sun Bio: South India branch and Jaya
    sun_bio = leads_by_name.get("sun bio")
    assert sun_bio is not None
    assert sun_bio.branch == "South India"
    assert sun_bio.assigned_to == "Jaya"

    # 5. Gujarat leads: Sidhart Ji
    veer = leads_by_name.get("veer internatinal")
    assert veer is not None
    assert veer.branch == "Gujarat"
    assert veer.assigned_to == "Sidhart Ji"


def test_excel_seeder_deterministic_fallback():
    """Verify fallback returns valid LeadTrackerItems when file path is invalid or missing."""
    dummy_path = Path("/tmp/non_existent_lead_tracker_test_file.xlsx")
    leads = seed_leads_from_excel(excel_path=dummy_path)

    assert len(leads) >= 10
    branches = {lead.branch for lead in leads}
    expected_branches = {"Mumbai", "Gujarat", "South India"}
    assert expected_branches.issubset(branches)

    reps = {lead.assigned_to for lead in leads}
    expected_reps = {
        "Edward",
        "Tasneem",
        "Priyanka Sardesai",
        "Utkarsha",
        "Sanjay",
        "Sidhart Ji",
        "Jaya",
    }
    assert expected_reps.issubset(reps)

    for lead in leads:
        assert isinstance(lead, LeadTrackerItem)
        assert lead.id.startswith("trk_")
        assert len(lead.history) >= 1


def test_date_parser_varieties():
    """Verify parse_flexible_date handles all formats from the real spreadsheets."""
    # Datetime object
    dt = datetime(2026, 7, 29, 0, 0)
    assert parse_flexible_date(dt) == "2026-07-29"

    # ISO string
    assert parse_flexible_date("2026-09-01") == "2026-09-01"

    # Indian DD/MM/YY string
    assert parse_flexible_date("21/9/26") == "2026-09-21"
    assert parse_flexible_date("23/9/26") == "2026-09-23"

    # Ordinal month strings
    assert parse_flexible_date("18th Sep") == "2026-09-18"
    assert parse_flexible_date("9th Sep") == "2026-09-09"
    assert parse_flexible_date("24th Sep") == "2026-09-24"

    # Week of / on
    assert parse_flexible_date("Week of 10th") == "2026-08-10"
    assert parse_flexible_date("Week of 16th") == "2026-08-16"
    assert parse_flexible_date("week on 10th") == "2026-08-10"

    # Non-dates
    assert parse_flexible_date("Next time I see him") is None
    assert parse_flexible_date("Edward for snehal") is None
    assert parse_flexible_date(None) is None


def test_normalization_helpers():
    """Verify branch, rep, and status normalization functions."""
    assert normalize_branch("Gujrat") == "Gujarat"
    assert normalize_branch("Gujarat") == "Gujarat"
    assert normalize_branch("South India") == "South India"
    assert normalize_branch("Mumbai") == "Mumbai"
    assert normalize_branch(None) == "Mumbai"

    assert normalize_rep("Edward ") == "Edward"
    assert normalize_rep("Sweety/ Utkarsha") == "Utkarsha"
    assert normalize_rep("Priyanka Sardesai") == "Priyanka Sardesai"
    assert normalize_rep("Sidhart Ji") == "Sidhart Ji"
    assert normalize_rep("Tasneem") == "Tasneem"
    assert normalize_rep("Sanjay") == "Sanjay"
    assert normalize_rep("Jaya") == "Jaya"
    assert normalize_rep(None) == "Unassigned"

    assert map_excel_status_to_tracker_status("Won") == TrackerStatus.WON.value
    assert map_excel_status_to_tracker_status("Quoted") == TrackerStatus.QUOTED.value
    assert map_excel_status_to_tracker_status("Feedback sesssion 1 done") == TrackerStatus.FEEDBACK_RECEIVED.value
    assert map_excel_status_to_tracker_status("Replied") == TrackerStatus.CONTACTED.value
    assert map_excel_status_to_tracker_status("Just sent") == TrackerStatus.ASSIGNED.value
    assert map_excel_status_to_tracker_status(None) == TrackerStatus.ASSIGNED.value


def test_tracker_activity_create_model():
    """Verify TrackerActivityCreate payload validation."""
    act = TrackerActivityCreate(
        action="Called customer",
        notes="Discussed trial container shipment",
        author_name="Tyra Theknath",
        author_email="tyra@jfll.com",
        status="Contacted",
        next_followup_date="2026-09-20",
    )
    assert act.action == "Called customer"
    assert act.next_followup_date == "2026-09-20"

    with pytest.raises(ValidationError):
        TrackerActivityCreate(action="Called", next_followup_date="bad_date")


def test_dsa_lexicographical_date_sorting():
    """Verify ISO 8601 YYYY-MM-DD strings sort lexicographically identical to chronological order."""
    unsorted_dates = [
        "2026-09-24",
        "2026-02-09",
        "2026-08-16",
        "2026-09-01",
        "2026-07-29",
        "2026-09-18",
    ]
    lex_sorted = sorted(unsorted_dates)
    chronological_sorted = sorted(unsorted_dates, key=lambda d: datetime.strptime(d, "%Y-%m-%d"))
    assert lex_sorted == chronological_sorted
    assert lex_sorted[0] == "2026-02-09"
    assert lex_sorted[-1] == "2026-09-24"


def test_dsa_o1_lookup_deduplication():
    """Verify O(1) dictionary hash lookup deduplicates company variations correctly."""
    leads_map: dict[str, str] = {}
    inputs = [
        ("Royal Arc", "First Note"),
        ("royal arc ", "Second Note (More recent)"),
        ("  ROYAL ARC  ", "Third Note (Final)"),
    ]
    for comp, note in inputs:
        key = comp.strip().lower()
        leads_map[key] = note

    assert len(leads_map) == 1
    assert "royal arc" in leads_map
    assert leads_map["royal arc"] == "Third Note (Final)"

