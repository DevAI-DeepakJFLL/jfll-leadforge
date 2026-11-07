"""In-memory Word document (.docx) streaming generator for Client Reports.
Strictly replicates the 4-section executive prospect briefing template of Jet Freight Logistics.
Generates purely in-memory using io.BytesIO() to eliminate disk I/O and temporary file management.
"""
import io
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from src.api.report_models import ClientReportData

# Jet Freight Brand Palette & Typography
COLOR_PRIMARY_HEX = "1E3A8A"      # Deep Navy
COLOR_SECONDARY_HEX = "0284C7"    # Freight Cyan / Sky
COLOR_DARK_HEX = "1E293B"         # Slate Dark Body
COLOR_MUTED_HEX = "64748B"        # Slate Muted
COLOR_LIGHT_BG_HEX = "F1F5F9"     # Light Table Header Shading
COLOR_BORDER_HEX = "CBD5E1"       # Subtle Table Border

def _set_cell_background(cell, hex_color: str):
    """Set background color of a table cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tc_pr.append(shd)

def _set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set cell internal padding in twentieths of a point (dxa)."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tc_pr.append(tc_mar)

def _set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    """Set uniform subtle borders for a table."""
    tbl_pr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tbl_pr.append(borders)

def generate_docx_stream(report: ClientReportData) -> io.BytesIO:
    """Generate Word (.docx) binary stream from ClientReportData in memory."""
    doc = Document()

    # Set page margins: 0.75 in
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # 1. Document Banner: Sub-title / Title
    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_before = Pt(0)
    p_meta.paragraph_format.space_after = Pt(2)
    run_meta = p_meta.add_run("CLIENT REPORT  ·  PROSPECT BRIEF")
    run_meta.font.name = "Calibri"
    run_meta.font.size = Pt(9.5)
    run_meta.font.bold = True
    run_meta.font.color.rgb = RGBColor(2, 132, 199)  # Freight Cyan

    # Company Legal Name Header
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run(report.header.company_name.upper())
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(17)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(30, 58, 138)  # Deep Navy

    # One-line Subtitle
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(8)
    run_sub = p_sub.add_run(report.header.subtitle)
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(10.5)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(71, 85, 105)  # Slate Muted

    # Metadata Strip Table (Prepared for, Prepared by, Date)
    tbl_meta = doc.add_table(rows=1, cols=3)
    tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_meta.autofit = False
    _set_table_borders(tbl_meta, color="E2E8F0")

    col_widths_meta = [Inches(2.5), Inches(2.5), Inches(2.0)]
    meta_items = [
        ("Prepared for: ", report.header.prepared_for),
        ("Prepared by: ", report.header.prepared_by),
        ("Date: ", report.header.date),
    ]
    for col_idx, (label, val) in enumerate(meta_items):
        cell = tbl_meta.rows[0].cells[col_idx]
        cell.width = col_widths_meta[col_idx]
        _set_cell_background(cell, "F8FAFC")
        _set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        
        r1 = p.add_run(label)
        r1.font.name = "Calibri"
        r1.font.size = Pt(9)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(100, 116, 139)
        
        r2 = p.add_run(f"[ {val} ]")
        r2.font.name = "Calibri"
        r2.font.size = Pt(9)
        r2.font.italic = True
        r2.font.color.rgb = RGBColor(30, 41, 59)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Helper: Build 2-column key-value section table
    def _add_section_table(section_title: str, rows_data: list):
        # Section Header Paragraph
        p_sec = doc.add_paragraph()
        p_sec.paragraph_format.space_before = Pt(10)
        p_sec.paragraph_format.space_after = Pt(3)
        run_sec = p_sec.add_run(section_title)
        run_sec.font.name = "Calibri"
        run_sec.font.size = Pt(11)
        run_sec.font.bold = True
        run_sec.font.color.rgb = RGBColor(30, 58, 138)

        # 2-column Table: Label (30%), Content (70%)
        tbl = doc.add_table(rows=len(rows_data), cols=2)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        _set_table_borders(tbl, color="CBD5E1")

        for r_idx, (label, val) in enumerate(rows_data):
            row = tbl.rows[r_idx]
            cell_label = row.cells[0]
            cell_val = row.cells[1]
            cell_label.width = Inches(2.2)
            cell_val.width = Inches(4.8)

            _set_cell_background(cell_label, COLOR_LIGHT_BG_HEX)
            _set_cell_margins(cell_label, top=90, bottom=90, left=120, right=120)
            _set_cell_margins(cell_val, top=90, bottom=90, left=120, right=120)

            # Label paragraph
            p_lbl = cell_label.paragraphs[0]
            p_lbl.paragraph_format.space_before = Pt(0)
            p_lbl.paragraph_format.space_after = Pt(0)
            r_lbl = p_lbl.add_run(label)
            r_lbl.font.name = "Calibri"
            r_lbl.font.size = Pt(9.5)
            r_lbl.font.bold = True
            r_lbl.font.color.rgb = RGBColor(51, 65, 85)

            # Value paragraph
            p_v = cell_val.paragraphs[0]
            p_v.paragraph_format.space_before = Pt(0)
            p_v.paragraph_format.space_after = Pt(0)
            r_v = p_v.add_run(val)
            r_v.font.name = "Calibri"
            r_v.font.size = Pt(9.5)
            r_v.font.color.rgb = RGBColor(30, 41, 59)

        doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # 2. Section 1: Company Background
    b = report.section_1_background
    _add_section_table(
        "1 · Company Background",
        [
            ("What they do / product lines", b.what_they_do),
            ("HQ & key facilities", b.hq_facilities),
            ("Export markets", b.export_markets),
            ("Scale / credibility", b.scale_credibility),
        ],
    )

    # 3. Section 2: Trade Lane & Commodity
    t = report.section_2_trade_lane
    metrics_str = f"{t.primary_mode} · Shipments: {t.total_shipments:,} · Export Value: ${t.total_value_usd:,.2f} USD · Port: {t.lading_port}"
    _add_section_table(
        "2 · Trade Lane & Commodity",
        [
            ("Origin → Destination", t.origin_destination),
            ("Commodity / cargo type", t.commodity),
            ("Primary mode: Ocean / Air", metrics_str),
            ("Special handling", t.special_handling),
        ],
    )

    # 4. Section 3: JFLL Fit — Why Us
    j = report.section_3_jfll_fit
    _add_section_table(
        "3 · JFLL Fit — Why Us",
        [
            ("Cargo → JFLL strength", j.cargo_strength),
            ("Lead the pitch with", j.pitch_angle),
        ],
    )

    # 5. Section 4: Decision-Makers / Logistics Contacts Table
    p_sec4 = doc.add_paragraph()
    p_sec4.paragraph_format.space_before = Pt(10)
    p_sec4.paragraph_format.space_after = Pt(3)
    run_sec4 = p_sec4.add_run("4 · Decision-Makers / Logistics Contacts")
    run_sec4.font.name = "Calibri"
    run_sec4.font.size = Pt(11)
    run_sec4.font.bold = True
    run_sec4.font.color.rgb = RGBColor(30, 58, 138)

    contacts = report.section_4_contacts or []
    tbl_contacts = doc.add_table(rows=len(contacts) + 1, cols=4)
    tbl_contacts.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_contacts.autofit = False
    _set_table_borders(tbl_contacts, color="CBD5E1")

    # Header Row
    col_widths_c = [Inches(1.8), Inches(1.8), Inches(2.0), Inches(1.4)]
    c_headers = ["Name", "Designation / Role", "Contact Information", "Notes / Context"]
    hdr_row = tbl_contacts.rows[0]
    for idx, h_text in enumerate(c_headers):
        cell = hdr_row.cells[idx]
        cell.width = col_widths_c[idx]
        _set_cell_background(cell, "E2E8F0")
        _set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h_text)
        r.font.name = "Calibri"
        r.font.size = Pt(9)
        r.font.bold = True
        r.font.color.rgb = RGBColor(30, 41, 59)

    # Contact Rows
    for r_idx, c in enumerate(contacts):
        row = tbl_contacts.rows[r_idx + 1]
        fields = [c.name, c.designation, c.contact_info, c.notes]
        for c_idx, val in enumerate(fields):
            cell = row.cells[c_idx]
            cell.width = col_widths_c[c_idx]
            _set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            if r_idx % 2 == 1:
                _set_cell_background(cell, "F8FAFC")
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Calibri"
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(30, 41, 59)

    # Save to in-memory BytesIO
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
