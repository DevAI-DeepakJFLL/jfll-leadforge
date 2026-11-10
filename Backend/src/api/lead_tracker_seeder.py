"""Lead Tracker Excel Seeder.

Extracts, normalizes, and merges lead data from `Phase2/Lead_Tracker.xlsx`
(both 'Lead Tracker' and 'Updated' sheets).

DSA Features:
- O(1) hash map lookup for deduplication keyed by company name (`name.strip().lower()`).
- Rich notes from 'Updated' sheet override earlier baseline notes while preserving
  baseline contacts.
- Normalizes all dates to ISO 8601 `YYYY-MM-DD` format for O(N log N) lexicographical sorting.
- Graceful deterministic fallback to 14 real companies when the file is absent.
"""

from datetime import date, datetime, timezone
import logging
from pathlib import Path
import re
from typing import Any

from src.api.lead_tracker_models import (
    LeadTrackerItem,
    LeadTrackerLogEntry,
    RoutingType,
    TrackerStatus,
    TransportMode,
)

logger = logging.getLogger(__name__)

# Standard rep emails mapping
SALES_REP_EMAILS: dict[str, str] = {
    "edward": "edward@jfll.com",
    "tasneem": "tasneem@jfll.com",
    "priyanka sardesai": "priyanka.sardesai@jfll.com",
    "priyanka": "priyanka.sardesai@jfll.com",
    "utkarsha": "utkarsha@jfll.com",
    "sanjay": "sanjay@jfll.com",
    "sidhart ji": "sidhart@jfll.com",
    "sidhart": "sidhart@jfll.com",
    "jaya": "jaya@jfll.com",
    "sheela": "sheela@jfll.com",
}


def find_default_excel_path() -> Path | None:
    """Find Phase2/Lead_Tracker.xlsx using standard repository search paths."""
    candidates = [
        # Relative to Backend/src/api
        Path(__file__).resolve().parent.parent.parent.parent / "Phase2" / "Lead_Tracker.xlsx",
        # Relative to Backend
        Path(__file__).resolve().parent.parent.parent / "Phase2" / "Lead_Tracker.xlsx",
        # Direct relative paths
        Path("Phase2/Lead_Tracker.xlsx"),
        Path("../Phase2/Lead_Tracker.xlsx"),
        Path("../../Phase2/Lead_Tracker.xlsx"),
        Path("Lead_Tracker.xlsx"),
    ]
    for c in candidates:
        if c.exists() and c.is_file():
            return c
    return None


def parse_flexible_date(val: Any, default_year: int = 2026, default_month: int = 8) -> str | None:
    """Normalize datetime objects or varied date strings to ISO YYYY-MM-DD.
    
    Handles:
    - datetime / date instances
    - ISO 'YYYY-MM-DD'
    - 'DD/MM/YY' or 'DD/MM/YYYY' (e.g. '21/9/26' -> '2026-09-21')
    - '18th Sep', '9th Sep', '24th Sep', '10th Sep'
    - 'Week of 10th', 'Week of 16th', 'week on 10th'
    - Non-dates (e.g. 'Next time I see him') return None
    """
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    if not s:
        return None

    # 1. Standard ISO YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        try:
            datetime.strptime(s, "%Y-%m-%d")
            return s
        except ValueError:
            return None

    # 2. DD/MM/YY or DD/MM/YYYY (Indian format)
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", s)
    if m:
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if year < 100:
            year += 2000
        try:
            return f"{year:04d}-{month:02d}-{day:02d}"
        except Exception:
            return None

    # 3. 18th Sep, 9th Sep, 24th Sep, etc.
    m = re.match(r"^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(\d{2,4}))?$", s, re.IGNORECASE)
    if m:
        day = int(m.group(1))
        month_str = m.group(2)[:3].title()
        year = int(m.group(3)) if m.group(3) else default_year
        if year < 100:
            year += 2000
        months = {
            "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
            "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
        }
        if month_str in months:
            month = months[month_str]
            try:
                return f"{year:04d}-{month:02d}-{day:02d}"
            except Exception:
                return None

    # 4. Week of 10th / Week of 16th / week on 10th
    m = re.match(r"^week\s+(?:of|on)\s+(\d{1,2})(?:st|nd|rd|th)?$", s, re.IGNORECASE)
    if m:
        day = int(m.group(1))
        return f"{default_year:04d}-{default_month:02d}-{day:02d}"

    return None


def normalize_branch(b: str | None) -> str:
    """Normalize branch names (e.g. 'Gujrat' -> 'Gujarat')."""
    if not b:
        return "Mumbai"
    s = b.strip()
    clean = s.lower()
    if clean in ("gujrat", "gujarat"):
        return "Gujarat"
    if "south" in clean:
        return "South India"
    if "mumbai" in clean:
        return "Mumbai"
    if "delhi" in clean:
        return "Delhi"
    return s


def normalize_rep(r: str | None) -> str:
    """Normalize sales rep name (Edward, Tasneem, Priyanka, Utkarsha, Sanjay, Sidhart Ji, Jaya)."""
    if not r:
        return "Unassigned"
    s = r.strip()
    clean = s.lower()
    if clean == "edward":
        return "Edward"
    if "sweety" in clean or "utkarsha" in clean:
        return "Utkarsha"
    if "priyanka" in clean:
        return "Priyanka Sardesai"
    if "tasneem" in clean:
        return "Tasneem"
    if "sanjay" in clean:
        return "Sanjay"
    if "sidhart" in clean:
        return "Sidhart Ji"
    if "jaya" in clean:
        return "Jaya"
    if "sheela" in clean:
        return "Sheela"
    return s


def map_excel_status_to_tracker_status(raw_status: str | None) -> str:
    """Map informal Excel statuses into canonical TrackerStatus enums."""
    if not raw_status:
        return TrackerStatus.ASSIGNED.value
    clean = raw_status.strip().lower()
    if "won" in clean:
        return TrackerStatus.WON.value
    if "quot" in clean:
        return TrackerStatus.QUOTED.value
    if "feedback" in clean or "meet" in clean:
        return TrackerStatus.FEEDBACK_RECEIVED.value
    if "repli" in clean or "contact" in clean:
        return TrackerStatus.CONTACTED.value
    if "trial" in clean:
        return TrackerStatus.TRIAL_SHIPMENT.value
    if "hold" in clean:
        return TrackerStatus.ON_HOLD.value
    if "lost" in clean or "closed" in clean:
        return TrackerStatus.CLOSED_LOST.value
    return TrackerStatus.ASSIGNED.value


def infer_transport_mode(company_name: str, notes: str | None, next_action: str | None = None) -> str:
    """Infer freight transport mode from operational notes."""
    text = f"{company_name} {notes or ''} {next_action or ''}".lower()
    if "courier" in text or "fedex" in text:
        return TransportMode.COURIER_EXPRESS.value
    if "sea freight" in text or "ocean" in text or "container" in text or re.search(r"\bsea\b", text):
        return TransportMode.OCEAN_FCL.value
    if "lcl" in text:
        return TransportMode.OCEAN_LCL.value
    if "cha" in text or "customs" in text or "brokerage" in text:
        return TransportMode.CHA_BROKERAGE.value
    if "multimodal" in text or "trucking" in text:
        return TransportMode.MULTIMODAL.value
    return TransportMode.AIR_FREIGHT.value


def infer_routing_type(notes: str | None, next_action: str | None = None) -> str:
    """Infer routing control (Nominated vs Freehand)."""
    text = f"{notes or ''} {next_action or ''}".lower()
    if "nomiat" in text or "nominat" in text:
        return RoutingType.NOMINATED.value
    return RoutingType.FREEHAND.value


def get_deterministic_fallback_leads() -> list[LeadTrackerItem]:
    """Provide deterministic list of 14 real companies from Lead_Tracker.xlsx.
    
    Guarantees reliable operation even if the Excel workbook is not present on disk.
    Covers branches: Mumbai, Gujarat, South India.
    Covers reps: Edward, Tasneem, Priyanka, Utkarsha, Sanjay, Sidhart Ji, Jaya.
    """
    raw_leads = [
        {
            "company_name": "Royal Arc",
            "contact_person": "Trith Amrania",
            "branch": "Mumbai",
            "assigned_to": "Edward",
            "assigned_date": "2026-07-29",
            "status": TrackerStatus.QUOTED.value,
            "transport_mode": TransportMode.OCEAN_FCL.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Met the person but they mainly do sea freight and the rates we are offering is not that competitive",
            "next_followup_date": "2026-08-16",
            "next_action": "Ask if quotation shared with client; Next time I see him",
        },
        {
            "company_name": "CLEARSYNTH LABS LIMITED",
            "contact_person": "Sunil Patil",
            "branch": "Mumbai",
            "assigned_to": "Edward",
            "assigned_date": "2026-02-09",
            "status": TrackerStatus.FEEDBACK_RECEIVED.value,
            "transport_mode": TransportMode.COURIER_EXPRESS.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Talked to Sunil Patil, they do purely courier and works with Fedex, need to include Rahul to talk to vendors",
            "next_followup_date": "2026-09-18",
            "next_action": "Edward is personally gonna meet him and connect with him; flag this with dad",
        },
        {
            "company_name": "SIMSON PHARMA LIMITED",
            "contact_person": "Kartike Sharma",
            "branch": "Mumbai",
            "assigned_to": "Utkarsha",
            "assigned_date": "2026-07-31",
            "status": TrackerStatus.ASSIGNED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Originally sent to Shruti but reassigned to Sweety / Utkarsha. Reached out on LinkedIn, in progress of meeting",
            "next_followup_date": "2026-09-24",
            "next_action": "Needs to do a follow up; Got a meeting from him",
        },
        {
            "company_name": "VEA IMPEX (I) PVT LTD",
            "contact_person": "Bhabika",
            "branch": "Mumbai",
            "assigned_to": "Tasneem",
            "assigned_date": "2026-02-09",
            "status": TrackerStatus.FEEDBACK_RECEIVED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Got in touch with a person, will follow up with him in a few days",
            "next_followup_date": "2026-09-09",
            "next_action": "Bhabika - everytime she calls shes busy, meeting her",
        },
        {
            "company_name": "GEMINI EXPORTS + NIVIRA EXPORTS",
            "contact_person": None,
            "branch": "Mumbai",
            "assigned_to": "Priyanka Sardesai",
            "assigned_date": "2026-03-09",
            "status": TrackerStatus.CONTACTED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Sent two leads. Nivira has not answered; Gemini is already working with another company",
            "next_followup_date": "2026-09-10",
            "next_action": "Follow up with Nivira and assess Gemini contract expiry",
        },
        {
            "company_name": "Himedia labs",
            "contact_person": None,
            "branch": "Mumbai",
            "assigned_to": "Tasneem",
            "assigned_date": "2026-03-09",
            "status": TrackerStatus.CONTACTED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Existing client, could not match rates. She wants to step back, be prepared and go again. Need higher rates and credit. Work on volume rather than GP.",
            "next_followup_date": "2026-09-18",
            "next_action": "Have meeting with pricing person; work on volume rather than GP",
        },
        {
            "company_name": "GMSANJIVANI (General) + SUPRIYA LIFESCIENCE",
            "contact_person": None,
            "branch": "Mumbai",
            "assigned_to": "Priyanka Sardesai",
            "assigned_date": "2026-08-09",
            "status": TrackerStatus.ASSIGNED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Did not get a lot of phone numbers, not the strongest lead",
            "next_followup_date": "2026-09-15",
            "next_action": "Deep research for direct procurement contacts",
        },
        {
            "company_name": "TITAN LABORATORIES PVT LTD",
            "contact_person": None,
            "branch": "Mumbai",
            "assigned_to": "Utkarsha",
            "assigned_date": "2026-09-09",
            "status": TrackerStatus.ASSIGNED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.NOMINATED.value,
            "feedback_notes": "Most shipments are nominated, try to set a meeting but still hasn't gotten a time",
            "next_followup_date": "2026-09-24",
            "next_action": "Explore CIF/DDP conversion or contact overseas consignee partner",
        },
        {
            "company_name": "Invetia Healthcare",
            "contact_person": None,
            "branch": "Mumbai",
            "assigned_to": "Sheela",
            "assigned_date": "2026-09-21",
            "status": TrackerStatus.ASSIGNED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Lead recently dispatched for sales discovery",
            "next_followup_date": "2026-09-28",
            "next_action": "Initiate introductory outreach call",
        },
        {
            "company_name": "MEGA FINE PHARMA PRIVATE LIMITED",
            "contact_person": "Dharamvi",
            "branch": "Mumbai",
            "assigned_to": "Sanjay",
            "assigned_date": "2026-09-23",
            "status": TrackerStatus.ASSIGNED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Visited their office and talked to Dharamvi. Ready to quote but has request for temperature warehouse",
            "next_followup_date": None,
            "next_action": "See if we can work with cold-chain agency; look at temperature controlled warehouse",
        },
        {
            "company_name": "Sun Bio",
            "contact_person": None,
            "branch": "South India",
            "assigned_to": "Jaya",
            "assigned_date": "2026-07-28",
            "status": TrackerStatus.ASSIGNED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Meeting to get updates, sent contact person on LinkedIn",
            "next_followup_date": "2026-08-10",
            "next_action": "Need to do more background research and follow up",
        },
        {
            "company_name": "Veer Internatinal",
            "contact_person": None,
            "branch": "Gujarat",
            "assigned_to": "Sidhart Ji",
            "assigned_date": "2026-07-30",
            "status": TrackerStatus.ASSIGNED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Doing deep research to support Sidhart Ji",
            "next_followup_date": "2026-08-10",
            "next_action": "Need to do deep research on export lanes",
        },
        {
            "company_name": "Pooja Foods",
            "contact_person": None,
            "branch": "Gujarat",
            "assigned_to": "Sidhart Ji",
            "assigned_date": "2026-07-30",
            "status": TrackerStatus.ASSIGNED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Doing deep research to support Sidhart Ji",
            "next_followup_date": "2026-08-10",
            "next_action": "Need to do deep research on food cargo certifications",
        },
        {
            "company_name": "Kirti Foods",
            "contact_person": None,
            "branch": "Gujarat",
            "assigned_to": "Sidhart Ji",
            "assigned_date": "2026-07-30",
            "status": TrackerStatus.ASSIGNED.value,
            "transport_mode": TransportMode.AIR_FREIGHT.value,
            "routing_type": RoutingType.FREEHAND.value,
            "feedback_notes": "Doing deep research to support Sidhart Ji",
            "next_followup_date": "2026-08-10",
            "next_action": "Need to do deep research on Gulf and US food imports",
        },
    ]

    items: list[LeadTrackerItem] = []
    for d in raw_leads:
        rep_clean = d["assigned_to"].strip().lower()
        rep_email = SALES_REP_EMAILS.get(rep_clean)
        created_iso = datetime.now(timezone.utc).isoformat()
        initial_history = [
            LeadTrackerLogEntry(
                author_name="Tyra Theknath",
                author_email="tyra@jfll.com",
                action="Lead Assigned (Deterministic Baseline)",
                notes=f"Initial lead assignment to {d['assigned_to']}. {d['feedback_notes'] or ''}".strip(),
            )
        ]
        item = LeadTrackerItem(
            company_name=d["company_name"],
            contact_person=d["contact_person"],
            branch=d["branch"],
            assigned_to=d["assigned_to"],
            assigned_to_email=rep_email,
            assigned_by="Tyra Theknath",
            assigned_date=d["assigned_date"],
            status=d["status"],
            transport_mode=d["transport_mode"],
            routing_type=d["routing_type"],
            feedback_notes=d["feedback_notes"],
            next_followup_date=d["next_followup_date"],
            next_action=d["next_action"],
            linked_entity_type="custom",
            history=initial_history,
            created_at=created_iso,
            updated_at=created_iso,
        )
        items.append(item)
    return items


def seed_leads_from_excel(excel_path: Path | None = None) -> list[LeadTrackerItem]:
    """Parse Phase2/Lead_Tracker.xlsx and return deduplicated list of LeadTrackerItem.
    
    Uses an O(1) hash map lookup for deduplication keyed by normalized company name.
    Falls back gracefully to deterministic fallback if the file is not found or fails to parse.
    """
    resolved_path = excel_path if excel_path is not None else find_default_excel_path()
    if resolved_path is None or not Path(resolved_path).exists():
        logger.info("Lead Tracker Excel not found at %s. Using deterministic fallback.", resolved_path)
        return get_deterministic_fallback_leads()

    try:
        import openpyxl
    except ImportError:
        logger.warning("openpyxl is not installed. Using deterministic fallback.")
        return get_deterministic_fallback_leads()

    try:
        wb = openpyxl.load_workbook(resolved_path, data_only=True)
    except Exception as exc:
        logger.warning("Failed to open Excel workbook at %s (%s). Using fallback.", resolved_path, exc)
        return get_deterministic_fallback_leads()

    # O(1) deduplication lookup dictionary: company_name.strip().lower() -> dict
    leads_by_company: dict[str, dict[str, Any]] = {}

    # 1. Parse 'Lead Tracker' sheet
    if "Lead Tracker" in wb.sheetnames:
        sheet = wb["Lead Tracker"]
        rows = list(sheet.iter_rows(values_only=True))
        # Find header index
        header_idx = None
        for idx, r in enumerate(rows):
            if r and any(cell and "Lead / Company Name" in str(cell) for cell in r):
                header_idx = idx
                break
        if header_idx is not None:
            for row in rows[header_idx + 1:]:
                if not any(row) or len(row) < 4:
                    continue
                raw_company = row[3]
                if not raw_company or not str(raw_company).strip():
                    continue
                company_name = str(raw_company).strip()
                key = company_name.lower()

                assigned_to = normalize_rep(str(row[1]) if row[1] else None)
                branch = normalize_branch(str(row[2]) if row[2] else None)
                contact_raw = str(row[4]).strip() if len(row) > 4 and row[4] else None
                contact_person = contact_raw if contact_raw and contact_raw.lower() != "deep research" else None
                assigned_date = parse_flexible_date(row[5] if len(row) > 5 else None) or "2026-07-29"
                status = map_excel_status_to_tracker_status(str(row[6]) if len(row) > 6 and row[6] else None)
                feedback_notes = str(row[8]).strip() if len(row) > 8 and row[8] else None
                next_followup = parse_flexible_date(row[9] if len(row) > 9 else None)
                next_action = str(row[10]).strip() if len(row) > 10 and row[10] else None

                leads_by_company[key] = {
                    "company_name": company_name,
                    "contact_person": contact_person,
                    "branch": branch,
                    "assigned_to": assigned_to,
                    "assigned_date": assigned_date,
                    "status": status,
                    "feedback_notes": feedback_notes,
                    "next_followup_date": next_followup,
                    "next_action": next_action,
                }

    # 2. Parse 'Updated' sheet (more recent, richer notes)
    if "Updated" in wb.sheetnames:
        sheet = wb["Updated"]
        rows = list(sheet.iter_rows(values_only=True))
        header_idx = None
        for idx, r in enumerate(rows):
            if r and any(cell and "Lead / Company Name" in str(cell) for cell in r):
                header_idx = idx
                break
        if header_idx is not None:
            for row in rows[header_idx + 1:]:
                if not any(row) or len(row) < 4:
                    continue
                raw_company = row[3]
                if not raw_company or not str(raw_company).strip():
                    continue
                company_name = str(raw_company).strip()
                key = company_name.lower()

                assigned_to = normalize_rep(str(row[1]) if row[1] else None)
                branch = normalize_branch(str(row[2]) if row[2] else None)
                assigned_date = parse_flexible_date(row[4] if len(row) > 4 else None) or "2026-09-01"
                status = map_excel_status_to_tracker_status(str(row[5]) if len(row) > 5 and row[5] else None)
                notes = str(row[6]).strip() if len(row) > 6 and row[6] else None
                followup_val = row[7] if len(row) > 7 else None
                followup_date = parse_flexible_date(followup_val)
                # If follow-up text wasn't a calendar date (e.g. 'Next time I see him')
                non_date_followup = None
                if not followup_date and followup_val and str(followup_val).strip():
                    non_date_followup = str(followup_val).strip()

                next_action = str(row[8]).strip() if len(row) > 8 and row[8] else None
                if len(row) > 9 and row[9]:
                    extra1 = str(row[9]).strip()
                    next_action = f"{next_action}; {extra1}" if next_action else extra1
                if len(row) > 10 and row[10]:
                    extra2 = str(row[10]).strip()
                    next_action = f"{next_action}; {extra2}" if next_action else extra2

                if non_date_followup:
                    next_action = f"{next_action}; Followup: {non_date_followup}" if next_action else non_date_followup

                if key in leads_by_company:
                    # Merge and favor richer notes from Updated
                    existing = leads_by_company[key]
                    if assigned_to and assigned_to != "Unassigned":
                        existing["assigned_to"] = assigned_to
                    if branch:
                        existing["branch"] = branch
                    if status:
                        existing["status"] = status
                    if notes:
                        existing["feedback_notes"] = notes
                    if followup_date:
                        existing["next_followup_date"] = followup_date
                    if next_action:
                        existing["next_action"] = next_action
                else:
                    leads_by_company[key] = {
                        "company_name": company_name,
                        "contact_person": None,
                        "branch": branch,
                        "assigned_to": assigned_to,
                        "assigned_date": assigned_date,
                        "status": status,
                        "feedback_notes": notes,
                        "next_followup_date": followup_date,
                        "next_action": next_action,
                    }

    if not leads_by_company:
        logger.warning("No leads found in Excel workbook. Using deterministic fallback.")
        return get_deterministic_fallback_leads()

    items: list[LeadTrackerItem] = []
    for d in leads_by_company.values():
        rep_clean = d["assigned_to"].strip().lower()
        rep_email = SALES_REP_EMAILS.get(rep_clean)
        notes = d["feedback_notes"]
        next_act = d.get("next_action")
        transport_mode = infer_transport_mode(d["company_name"], notes, next_act)
        routing_type = infer_routing_type(notes, next_act)

        created_iso = datetime.now(timezone.utc).isoformat()
        initial_history = [
            LeadTrackerLogEntry(
                author_name="Tyra Theknath",
                author_email="tyra@jfll.com",
                action="Imported from Lead Tracker Excel",
                notes=f"Initial lead assignment to {d['assigned_to']}. {notes or ''}".strip(),
            )
        ]

        item = LeadTrackerItem(
            company_name=d["company_name"],
            contact_person=d["contact_person"],
            branch=d["branch"],
            assigned_to=d["assigned_to"],
            assigned_to_email=rep_email,
            assigned_by="Tyra Theknath",
            assigned_date=d["assigned_date"],
            status=d["status"],
            transport_mode=transport_mode,
            routing_type=routing_type,
            feedback_notes=notes,
            next_followup_date=d["next_followup_date"],
            next_action=d["next_action"],
            linked_entity_type="custom",
            history=initial_history,
            created_at=created_iso,
            updated_at=created_iso,
        )
        items.append(item)

    return items
