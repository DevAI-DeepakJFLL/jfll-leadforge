"""API routes for automated Client Report generation and Word (.docx) streaming.
"""
from datetime import datetime
import re

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse

from src.api.helpers import require_auth
from src.api.logger import logger
from src.api.report_models import (
    ClientReportData,
    GenerateReportRequest,
    ReportCompanySuggestion,
)
from src.services.report_docx_generator import generate_docx_stream
from src.services.report_service import (
    _build_unlisted_sme_report,
    generate_client_report_data,
    search_report_companies,
)
from src.services.gemini_report_enricher import enrich_report_with_gemini_search

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

@router.get(
    "/companies",
    response_model=list[ReportCompanySuggestion],
    summary="Search companies in DataMyne for client report autocomplete",
)
def get_report_companies(
    q: str = Query(..., min_length=1, description="Company name or ID prefix"),
    limit: int = Query(10, ge=1, le=50),
    authorization: str | None = Header(None),
):
    """Search DataMyne for company suggestions to auto-complete report generation."""
    require_auth(authorization, "report company suggestions")
    try:
        return search_report_companies(query=q, limit=limit)
    except Exception as exc:
        logger.warning("Error in get_report_companies autocomplete for '%s': %s", q, exc)
        return []

@router.post(
    "/generate",
    response_model=ClientReportData,
    summary="Synthesize 4-section client briefing report data",
)
def post_generate_report(
    payload: GenerateReportRequest,
    authorization: str | None = Header(None),
):
    """Generate structured 4-section prospect briefing data for a company."""
    require_auth(authorization, "client reports")
    if not payload.company_name_or_id or not payload.company_name_or_id.strip():
        raise HTTPException(status_code=400, detail="Company name or ID is required")
    
    prep_for = payload.prepared_for or "Mumbai Sales Branch"
    prep_by = payload.prepared_by or "Deepak Naidu"

    try:
        return generate_client_report_data(
            company_query=payload.company_name_or_id,
            prepared_for=prep_for,
            prepared_by=prep_by,
        )
    except Exception as exc:
        logger.error("Error generating report for '%s': %s", payload.company_name_or_id, exc, exc_info=True)
        today_str = datetime.now().strftime("%d-%m-%Y")
        return _build_unlisted_sme_report(
            company_name=payload.company_name_or_id,
            prepared_for=prep_for,
            prepared_by=prep_by,
            today_str=today_str,
        )

@router.post(
    "/enrich-web",
    response_model=ClientReportData,
    summary="Enrich report background, facilities, export markets, and contacts using Gemini 3.8 Flash web search grounding",
)
def post_enrich_web_report(
    report: ClientReportData,
    authorization: str | None = Header(None),
):
    """Enrich client report with live web research via Gemini 3.8 Flash Google Search grounding."""
    require_auth(authorization, "gemini web search enrichment")
    try:
        return enrich_report_with_gemini_search(
            draft=report,
            company_query=report.header.company_name,
        )
    except Exception as exc:
        logger.warning("Gemini web search enrichment failed: %s", exc)
        return report

@router.post(
    "/export-docx",
    summary="Export client report data as formatted Word (.docx) document stream",
)
def post_export_docx(
    report: ClientReportData,
    authorization: str | None = Header(None),
):
    """Stream an in-memory formatted Word (.docx) document without disk I/O."""
    require_auth(authorization, "client report document export")
    try:
        docx_buffer = generate_docx_stream(report)
        # Defense-in-depth: Strict regex sanitization preventing CRLF (CWE-113) in Content-Disposition
        clean_company = re.sub(r"[^\w-]", "_", report.header.company_name).strip("_") or "Client"
        clean_date = re.sub(r"[^\w-]", "_", report.header.date).strip("_") or "Report"
        filename = f"{clean_company}_Client_Report_{clean_date}.docx"

        return StreamingResponse(
            docx_buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate Word document: {exc!s}")
