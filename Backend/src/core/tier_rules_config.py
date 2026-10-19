"""Configuration settings and mapping tables for Tier A / Tier B segmentation.
Directly implements Section 2, 5, and 6 of tier_segmentation_spec.md.
All assumptions and weights are configurable rather than hardcoded.
"""
from typing import Dict, List, Set, Any
from dataclasses import dataclass, field


@dataclass
class TierRulesConfig:
    version: str = "1.0.0"

    # Threshold cutoffs
    tier_a_min: int = 70
    tier_b_min: int = 40
    strategic_override_min: int = 60
    strategic_override_max: int = 69
    monthly_capacity_tier_a: int = 150
    tier_a_max_percentage_guideline: float = 20.0  # Top 10-20% rule

    # Required fields according to Section 3 of SOP
    required_fields: List[str] = field(default_factory=lambda: [
        "company_name",
        "city",
        "data_source",
        "lane",
        "mode",
        "commodity",
        "shipments_12m",
        "last_shipment_date",
        "is_existing_customer",
    ])

    # 5.1 Shipment frequency weights
    frequency_tiers: List[Dict[str, Any]] = field(default_factory=lambda: [
        {"min": 24, "points": 20},
        {"min": 12, "points": 12},
        {"min": 4, "points": 6},
        {"min": 0, "points": 0},
    ])

    # 5.2 Freight control Incoterms
    exporter_controlled_incoterms: Set[str] = field(default_factory=lambda: {
        "CIF", "CFR", "CPT", "CIP"
    })
    buyer_controlled_incoterms: Set[str] = field(default_factory=lambda: {
        "FOB", "FCA", "EXW"
    })
    incoterm_points: Dict[str, int] = field(default_factory=lambda: {
        "exporter": 15,
        "mixed_or_unknown": 8,
        "buyer_only": 0,
    })

    # 5.3 Lane fit weights & served lanes
    tier1_lanes: Set[str] = field(default_factory=lambda: {
        "india to us", "india to usa", "in-us", "in-usa", "us", "usa", "united states",
        "india to uae", "in-uae", "uae", "united arab emirates", "dubai", "gcr/air", "dxb"
    })
    tier2_lanes: Set[str] = field(default_factory=lambda: {
        "india to latin america", "india to latam", "in-latam", "latin america", "latam",
        "brazil", "mexico", "chile", "colombia", "argentina"
    })
    served_lanes_keywords: Set[str] = field(default_factory=lambda: {
        "europe", "uk", "germany", "france", "italy", "netherlands",
        "singapore", "malaysia", "thailand", "vietnam", "japan",
        "africa", "south africa", "kenya", "nigeria", "middle east", "saudi", "qatar", "oman"
    })

    # 5.4 Commodity fit mapping
    tier1_commodities: Set[str] = field(default_factory=lambda: {
        "pharma", "pharmaceutical", "pharmaceuticals", "medicine", "drugs", "healthcare",
        "perishables", "perishable", "fruits", "vegetables", "fresh produce", "meat", "seafood",
        "temperature-controlled", "cold chain", "biotech"
    })
    tier2_commodities: Set[str] = field(default_factory=lambda: {
        "high-value general", "electronics", "electrical", "engineering", "automotive",
        "telecom", "precision", "aerospace", "textiles & apparel", "machinery", "chemicals"
    })
    bulk_commodities: Set[str] = field(default_factory=lambda: {
        "bulk", "coal", "iron ore", "scrap", "sand", "minerals", "cement", "gravel"
    })

    # 5.7 Recency thresholds (days)
    recency_tiers: List[Dict[str, Any]] = field(default_factory=lambda: [
        {"max_days": 60, "points": 10},
        {"max_days": 180, "points": 5},
        {"max_days": 999999, "points": 0},
    ])

    # 5.8 Bonuses
    regulated_plant_bonus: int = 5
    cluster_bonus: int = 5
    eligible_branch_clusters: Set[str] = field(default_factory=lambda: {
        "hyderabad", "secunderabad", "telangana",
        "ahmedabad", "vadodara", "baroda", "gujarat",
        "mumbai", "bombay", "pune", "maharashtra",
        "baddi", "himachal", "solan",
        "goa", "panaji"
    })

    # Competitor forwarders / NVOCCs list
    competitor_forwarders: Set[str] = field(default_factory=lambda: {
        "expeditors", "kuehne + nagel", "kuehne nagel", "dhl global forwarding", "dhl",
        "db schenker", "schenker", "dsv", "panalpina", "ceva logistics", "ceva",
        "bollore logistics", "hellmann", "geodis", "agility", "ch robinson", "ups supply chain"
    })


DEFAULT_TIER_CONFIG = TierRulesConfig()
