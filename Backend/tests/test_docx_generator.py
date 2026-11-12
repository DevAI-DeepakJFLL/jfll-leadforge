import docx

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


def test_docx_executive_layout_alignment():
    """Verify that docx generation matches the Jet Freight executive briefing standard."""
    report = _create_sample_report_for_docx()
    stream = generate_docx_stream(report)
    doc = docx.Document(stream)

    # 1. Header Banner Table
    header_tbl = doc.tables[0]
    assert len(header_tbl.columns) == 3
    hdr_text = " ".join(c.text for row in header_tbl.rows for c in row.cells)
    assert "CLIENT REPORT" in hdr_text
    assert "PROSPECT BRIEF" in hdr_text
    assert "Jet Freight Logistics Ltd" in hdr_text
    assert "ISO 9001:2015" in hdr_text

    # 2. Metadata strip table does NOT have artificial square brackets
    meta_tbl = doc.tables[1]
    assert len(meta_tbl.columns) == 3
    meta_text = " ".join(c.text for row in meta_tbl.rows for c in row.cells)
    assert "[ Mumbai Sales Branch ]" not in meta_text
    assert "Mumbai Sales Branch" in meta_text
    assert "Tyra Theknath" in meta_text

    # 3. Section 2 Trade lane includes metrics badge
    sec2_tables = [t for t in doc.tables if any("Commodity / cargo type" in c.text for r in t.rows for c in r.cells)]
    assert len(sec2_tables) == 1
    sec2_tbl = sec2_tables[0]
    # Check row 3 (Primary mode) includes mode & port
    row3_val = sec2_tbl.rows[2].cells[1].text
    assert "Air" in row3_val
    assert "INBOM4" in row3_val
    # Does not repeat "Shipments: 50" twice in the same cell
    assert row3_val.count("Shipments: 50") <= 1

    # 4. Contacts Table has 4 columns and bold name
    contact_tables = [t for t in doc.tables if any("Notes / Context" in c.text for r in t.rows for c in r.cells)]
    assert len(contact_tables) == 1
    c_tbl = contact_tables[0]
    assert len(c_tbl.columns) == 4
    # First data row, first cell (Kunal Shah) must have bold run
    kunal_cell = c_tbl.rows[1].cells[0]
    assert "Kunal Shah" in kunal_cell.text
    assert any(run.bold for run in kunal_cell.paragraphs[0].runs)


def test_docx_generator_omits_zero_shipment_metrics_badge():
    report = _create_sample_report_for_docx()
    report.section_2_trade_lane.total_shipments = 0
    report.section_2_trade_lane.total_value_usd = 0.0

    stream = generate_docx_stream(report)
    doc = docx.Document(stream)
    doc_text = " ".join(p.text for p in doc.paragraphs) + " " + " ".join(c.text for t in doc.tables for r in t.rows for c in r.cells)
    assert "0 shipments · $0.00 USD" not in doc_text


