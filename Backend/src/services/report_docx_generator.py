"""In-memory Word document (.docx) streaming generator for Client Reports.
Strictly replicates the executive prospect briefing standard of Jet Freight Logistics Ltd.
Generates purely in-memory using io.BytesIO() to eliminate disk I/O and temporary file management.
"""
import io
import logging
import os

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
from docx.shared import Inches, Pt, RGBColor

from src.api.report_models import ClientReportData

# Jet Freight Brand Palette Constants
COLOR_LIGHT_BG_HEX = "F1F5F9"        # Standard Light Table Label Fill
COLOR_HIGHLIGHT_BG_HEX = "EFF6FF"    # Accent Soft Blue Label Fill (JFLL Fit & Takeaways)
COLOR_ZEBRA_BG_HEX = "F8FAFC"        # Alternating Zebra Fill for Contacts
COLOR_BORDER_HEX = "CBD5E1"          # Subtle Slate Table Border
COLOR_NAVY_RGB = RGBColor(30, 58, 138)       # Jet Freight Deep Navy (#1E3A8A)
COLOR_CYAN_RGB = RGBColor(2, 132, 199)       # Freight Cyan Accent (#0284C7)
COLOR_SLATE_DARK_RGB = RGBColor(30, 41, 59)  # Text Body Slate Dark (#1E293B)
COLOR_SLATE_MUTED_RGB = RGBColor(100, 116, 139)  # Secondary Label Slate (#64748B)
COLOR_EMERALD_RGB = RGBColor(4, 120, 87)     # Metrics Green (#047857)
COLOR_PLACEHOLDER_RGB = RGBColor(148, 163, 184)  # Empty State Placeholder (#94A3B8)

logger = logging.getLogger("report_docx")


def _get_logo_path() -> str | None:
    """Resolve path to Jet Freight official logo with multiple repository fallbacks."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(current_dir, "..", "assets", "jfll-logo.jpeg"),
        os.path.join(current_dir, "..", "..", "Frontend", "public", "assets", "jfll-logo.jpeg"),
        os.path.join(current_dir, "..", "..", "..", "Frontend", "public", "assets", "jfll-logo.jpeg"),
    ]
    for c in candidates:
        norm = os.path.normpath(c)
        if os.path.exists(norm):
            return norm
    return None


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


def _set_table_borders(table, color=COLOR_BORDER_HEX, sz="4", val="single"):
    """Set uniform subtle 4-sided and internal borders for a table."""
    tbl_pr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
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

    # 1. Official Header Banner: Logo + Corporate Identity + Canvas Standard
    tbl_hdr = doc.add_table(rows=1, cols=3)
    tbl_hdr.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_hdr.autofit = False
    _set_table_borders(tbl_hdr, val="none")

    c0, c1, c2 = tbl_hdr.rows[0].cells
    c0.width = Inches(0.75)
    c1.width = Inches(4.35)
    c2.width = Inches(1.90)
    _set_cell_margins(c0, top=0, bottom=40, left=0, right=40)
    _set_cell_margins(c1, top=0, bottom=40, left=40, right=0)
    _set_cell_margins(c2, top=0, bottom=40, left=0, right=0)

    # Cell 0: Jet Freight Logo
    logo_path = _get_logo_path()
    p0 = c0.paragraphs[0]
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after = Pt(0)
    if logo_path:
        try:
            run_logo = p0.add_run()
            run_logo.add_picture(logo_path, width=Inches(0.65), height=Inches(0.65))
        except Exception as exc:
            logger.debug("Failed to embed optional logo image: %s", exc)

    # Cell 1: Subtitle & Credentials
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_before = Pt(0)
    p1.paragraph_format.space_after = Pt(1)
    r1 = p1.add_run("CLIENT REPORT  ·  PROSPECT BRIEF")
    r1.font.name = "Calibri"
    r1.font.size = Pt(9.5)
    r1.font.bold = True
    r1.font.color.rgb = COLOR_CYAN_RGB

    if report.header.web_grounded:
        r1_wg = p1.add_run("  [Web Grounded · Gemini 3.8 Flash]")
        r1_wg.font.name = "Calibri"
        r1_wg.font.size = Pt(8.5)
        r1_wg.font.bold = True
        r1_wg.font.color.rgb = COLOR_NAVY_RGB

    p1_sub = c1.add_paragraph()
    p1_sub.paragraph_format.space_before = Pt(0)
    p1_sub.paragraph_format.space_after = Pt(0)
    r1_sub = p1_sub.add_run("Jet Freight Logistics Ltd · BSE/NSE: JETFREIGHT · ISO 9001:2015")
    r1_sub.font.name = "Calibri"
    r1_sub.font.size = Pt(8.5)
    r1_sub.font.color.rgb = COLOR_SLATE_MUTED_RGB

    # Cell 2: Right alignment label
    p2 = c2.paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p2.paragraph_format.space_before = Pt(0)
    p2.paragraph_format.space_after = Pt(1)
    r2 = p2.add_run("Executive Briefing Canvas")
    r2.font.name = "Calibri"
    r2.font.size = Pt(9)
    r2.font.bold = True
    r2.font.color.rgb = COLOR_SLATE_DARK_RGB

    p2_sub = c2.add_paragraph()
    p2_sub.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p2_sub.paragraph_format.space_before = Pt(0)
    p2_sub.paragraph_format.space_after = Pt(0)
    r2_sub = p2_sub.add_run("Official Commercial Standard")
    r2_sub.font.name = "Calibri"
    r2_sub.font.size = Pt(8)
    r2_sub.font.color.rgb = COLOR_PLACEHOLDER_RGB

    # Company Legal Name Header
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(8)
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run(report.header.company_name.upper())
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(17)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_NAVY_RGB

    # One-line Subtitle
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(8)
    run_sub = p_sub.add_run(report.header.subtitle)
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(10.5)
    run_sub.font.italic = True
    run_sub.font.color.rgb = COLOR_SLATE_MUTED_RGB

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
        _set_cell_background(cell, COLOR_ZEBRA_BG_HEX)
        _set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)

        r1_m = p.add_run(label)
        r1_m.font.name = "Calibri"
        r1_m.font.size = Pt(9)
        r1_m.font.bold = True
        r1_m.font.color.rgb = COLOR_SLATE_MUTED_RGB

        # Clean value without artificial square brackets
        r2_m = p.add_run(str(val or ""))
        r2_m.font.name = "Calibri"
        r2_m.font.size = Pt(9)
        r2_m.font.italic = True
        r2_m.font.color.rgb = COLOR_SLATE_DARK_RGB

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Helper: Build 2-column key-value section table
    def _add_section_table(
        section_title: str,
        rows_data: list,
        subtitle_right: str | None = None,
        highlight_all: bool = False,
        highlight_first_row: bool = False,
    ):
        # Section Header Paragraph / Bar
        if subtitle_right:
            tbl_sec_hdr = doc.add_table(rows=1, cols=2)
            tbl_sec_hdr.alignment = WD_TABLE_ALIGNMENT.CENTER
            tbl_sec_hdr.autofit = False
            _set_table_borders(tbl_sec_hdr, val="none")

            c_left = tbl_sec_hdr.rows[0].cells[0]
            c_right = tbl_sec_hdr.rows[0].cells[1]
            c_left.width = Inches(4.5)
            c_right.width = Inches(2.5)
            _set_cell_margins(c_left, top=60, bottom=40, left=0, right=0)
            _set_cell_margins(c_right, top=60, bottom=40, left=0, right=0)

            p_l = c_left.paragraphs[0]
            p_l.paragraph_format.space_before = Pt(8)
            p_l.paragraph_format.space_after = Pt(2)
            r_l = p_l.add_run(section_title)
            r_l.font.name = "Calibri"
            r_l.font.size = Pt(11)
            r_l.font.bold = True
            r_l.font.color.rgb = COLOR_NAVY_RGB

            p_r = c_right.paragraphs[0]
            p_r.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            p_r.paragraph_format.space_before = Pt(8)
            p_r.paragraph_format.space_after = Pt(2)
            r_r = p_r.add_run(subtitle_right)
            r_r.font.name = "Calibri"
            r_r.font.size = Pt(9.5)
            r_r.font.bold = True
            r_r.font.color.rgb = COLOR_EMERALD_RGB
        else:
            p_sec = doc.add_paragraph()
            p_sec.paragraph_format.space_before = Pt(10)
            p_sec.paragraph_format.space_after = Pt(3)
            run_sec = p_sec.add_run(section_title)
            run_sec.font.name = "Calibri"
            run_sec.font.size = Pt(11)
            run_sec.font.bold = True
            run_sec.font.color.rgb = COLOR_NAVY_RGB

        # 2-column Table: Label (31.4%), Content (68.6%)
        tbl = doc.add_table(rows=len(rows_data), cols=2)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        _set_table_borders(tbl, color=COLOR_BORDER_HEX)

        for r_idx, item in enumerate(rows_data):
            label = item[0]
            val = item[1]
            is_placeholder = item[2] if len(item) > 2 else False

            row = tbl.rows[r_idx]
            cell_label = row.cells[0]
            cell_val = row.cells[1]
            cell_label.width = Inches(2.2)
            cell_val.width = Inches(4.8)

            is_hl = highlight_all or (highlight_first_row and r_idx == 0)
            bg_color = COLOR_HIGHLIGHT_BG_HEX if is_hl else COLOR_LIGHT_BG_HEX
            _set_cell_background(cell_label, bg_color)
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
            r_lbl.font.color.rgb = COLOR_NAVY_RGB if is_hl else RGBColor(51, 65, 85)

            # Value paragraph(s) - handle multi-line strings cleanly
            lines = str(val or "").split("\n")
            for l_idx, line_text in enumerate(lines):
                if l_idx == 0:
                    p_v = cell_val.paragraphs[0]
                else:
                    p_v = cell_val.add_paragraph()
                p_v.paragraph_format.space_before = Pt(0)
                p_v.paragraph_format.space_after = Pt(1 if l_idx < len(lines) - 1 else 0)
                r_v = p_v.add_run(line_text)
                r_v.font.name = "Calibri"
                r_v.font.size = Pt(9.5)
                if is_placeholder:
                    r_v.font.italic = True
                    r_v.font.color.rgb = COLOR_PLACEHOLDER_RGB
                else:
                    r_v.font.color.rgb = COLOR_SLATE_DARK_RGB
                    if is_hl:
                        r_v.font.bold = True

        doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # 2. Section 1: Company Background
    b = report.section_1_background
    _add_section_table(
        "1 · Company Background",
        [
            ("What they do / product lines", b.what_they_do),
            ("Corporate / Registered Address", b.address or "Registered Corporate Office"),
            ("HQ & key facilities", b.hq_facilities),
            ("Export markets", b.export_markets),
            ("Scale / credibility", b.scale_credibility),
        ],
    )

    # 3. Section 2: Trade Lane & Commodity
    t = report.section_2_trade_lane
    has_metrics = (t.total_shipments or 0) > 0 or (t.total_value_usd or 0) > 0
    stat_badge = f"{t.total_shipments:,} shipments · ${t.total_value_usd:,.2f} USD" if has_metrics else None
    mode_text = f"{t.primary_mode} · Gateway: {t.lading_port}" if t.lading_port else t.primary_mode
    _add_section_table(
        "2 · Trade Lane & Commodity",
        [
            ("Origin → Destination", t.origin_destination),
            ("Commodity / cargo type", t.commodity),
            ("Primary mode: Ocean / Air", mode_text),
            ("Special handling", t.special_handling),
        ],
        subtitle_right=stat_badge,
    )

    # 4. Section 3: JFLL Fit — Why Us (Soft Blue Highlight)
    j = report.section_3_jfll_fit
    _add_section_table(
        "3 · JFLL Fit — Why Us",
        [
            ("Cargo → JFLL strength", j.cargo_strength),
            ("Lead the pitch with", j.pitch_angle),
        ],
        highlight_all=True,
    )

    # 5. Section 4: Decision-Makers / Logistics Contacts Table
    p_sec4 = doc.add_paragraph()
    p_sec4.paragraph_format.space_before = Pt(10)
    p_sec4.paragraph_format.space_after = Pt(3)
    run_sec4 = p_sec4.add_run("4 · Decision-Makers / Logistics Contacts")
    run_sec4.font.name = "Calibri"
    run_sec4.font.size = Pt(11)
    run_sec4.font.bold = True
    run_sec4.font.color.rgb = COLOR_NAVY_RGB

    contacts = report.section_4_contacts or []
    tbl_contacts = doc.add_table(rows=len(contacts) + 1, cols=4)
    tbl_contacts.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_contacts.autofit = False
    _set_table_borders(tbl_contacts, color=COLOR_BORDER_HEX)

    # Header Row (4 equal 1.75 in columns)
    col_widths_c = [Inches(1.75), Inches(1.75), Inches(1.75), Inches(1.75)]
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
        r.font.color.rgb = COLOR_SLATE_DARK_RGB

    # Contact Rows
    for r_idx, c in enumerate(contacts):
        row = tbl_contacts.rows[r_idx + 1]
        fields = [c.name, c.designation, c.contact_info, c.notes]
        for c_idx, val in enumerate(fields):
            cell = row.cells[c_idx]
            cell.width = col_widths_c[c_idx]
            _set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            if r_idx % 2 == 1:
                _set_cell_background(cell, COLOR_ZEBRA_BG_HEX)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Calibri"
            r.font.size = Pt(8.5)
            r.font.color.rgb = COLOR_SLATE_DARK_RGB
            if c_idx == 0:
                r.font.bold = True  # Bold contact name to match in-app font-semibold

    # 6. Section 5: Sales Executive Feedback & Action Plan
    f = report.section_5_feedback
    takeaway_val = f.meeting_takeaways.strip() if (f.meeting_takeaways and f.meeting_takeaways.strip()) else ""
    carriers_val = f.preferred_carriers.strip() if (f.preferred_carriers and f.preferred_carriers.strip()) else ""
    pricing_val = f.target_pricing.strip() if (f.target_pricing and f.target_pricing.strip()) else ""
    followup_val = f.next_action_followup.strip() if (f.next_action_followup and f.next_action_followup.strip()) else ""

    _add_section_table(
        "5 · Sales Executive Feedback & Action Plan",
        [
            (
                "Meeting Takeaways & Client Needs",
                takeaway_val or "[ Pending customer meeting / discovery notes ]",
                takeaway_val == "",
            ),
            (
                "Preferred Carriers / Lines",
                carriers_val or "[ None specified ]",
                carriers_val == "",
            ),
            (
                "Target Rates / Pricing Notes",
                pricing_val or "[ Pending quotation ]",
                pricing_val == "",
            ),
            (
                "Next Action & Follow-up Date",
                followup_val or "[ Follow-up pending ]",
                followup_val == "",
            ),
        ],
        highlight_first_row=True,
    )

    # Save to in-memory BytesIO
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
