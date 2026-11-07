import docx
import pytest

from src.api.report_models import (
    ClientReportData,
    CompanyBackground,
    ContactItem,
    JfllFit,
    ReportHeader,
    SalesFeedback,
    TradeLaneCommodity,
)
from src.services.report_docx_generator import generate_docx_stream


def _create_sample_report_for_docx() -> ClientReportData:
    return ClientReportData(
        header=ReportHeader(
            company_name="TITAN LABORATORIES PVT LTD",
            subtitle="Integrated pharma",
            prepared_for="Mumbai Sales Branch",
            prepared_by="Tyra Theknath",
            date="07-11-2026",
        ),
        section_1_background=CompanyBackground(
            what_they_do="Pharma CDMO",
            hq_facilities="Mumbai",
            export_markets="EU",
            scale_credibility="WHO-GMP",
        ),
        section_2_trade_lane=TradeLaneCommodity(
            origin_destination="Mumbai -> EU",
            commodity="APIs",
            primary_mode="Air",
            special_handling="Cold chain",
            total_shipments=50,
            total_value_usd=1000000.0,
            lading_port="INBOM4",
        ),
        section_3_jfll_fit=JfllFit(
            cargo_strength="Cold chain capability",
            pitch_angle="Multimodal speed",
        ),
        section_4_contacts=[
            ContactItem(
                name="Kunal Shah",
                designation="GM Sales",
                contact_info="kunal@titan.com",
                notes="Primary contact",
            )
        ],
        section_5_feedback=SalesFeedback(
            meeting_takeaways="Key requirement: 2-8°C active temperature logger.\nUrgent shipment to Frankfurt next Thursday.\nAgreed on air express.",
            preferred_carriers="Emirates SkyCargo, Lufthansa Cargo",
            target_pricing="$3.10/kg all-in",
            next_action_followup="Send formal proposal by 10-Nov-2026",
        ),
    )


def test_docx_stream_includes_section_5_table_and_multiline_breaks():
    report = _create_sample_report_for_docx()
    stream = generate_docx_stream(report)

    # Read generated docx from in-memory stream
    doc = docx.Document(stream)
    
    # Check paragraphs for Section 5 heading
    all_headings = [p.text for p in doc.paragraphs if "5 ·" in p.text]
    assert len(all_headings) == 1
    assert "Sales Executive Feedback" in all_headings[0]

    # Find Section 5 table
    sec5_tables = []
    for tbl in doc.tables:
        cell_texts = [c.text for row in tbl.rows for c in row.cells]
        if any("Meeting Takeaways" in t for t in cell_texts):
            sec5_tables.append(tbl)

    assert len(sec5_tables) == 1, "Section 5 feedback table was not found in generated docx"
    tbl = sec5_tables[0]

    # Verify rows
    table_dict = {}
    for row in tbl.rows:
        if len(row.cells) == 2:
            table_dict[row.cells[0].text.strip()] = row.cells[1].text.strip()

    assert "Meeting Takeaways & Client Needs" in table_dict
    assert "Preferred Carriers / Lines" in table_dict
    assert "Target Rates / Pricing Notes" in table_dict
    assert "Next Action & Follow-up Date" in table_dict

    assert "Emirates SkyCargo, Lufthansa Cargo" in table_dict["Preferred Carriers / Lines"]
    assert "$3.10/kg all-in" in table_dict["Target Rates / Pricing Notes"]
    assert "10-Nov-2026" in table_dict["Next Action & Follow-up Date"]

    # Fix #2 check: Cell for meeting takeaways must have multiple paragraphs or clean linebreaks
    for row in tbl.rows:
        if "Meeting Takeaways" in row.cells[0].text:
            takeaway_cell = row.cells[1]
            # Paragraphs inside the cell must reflect line breaks
            non_empty_paras = [p.text.strip() for p in takeaway_cell.paragraphs if p.text.strip()]
            assert len(non_empty_paras) >= 3 or "\n" in takeaway_cell.text
            assert "Key requirement: 2-8°C" in takeaway_cell.text
            assert "Urgent shipment" in takeaway_cell.text
