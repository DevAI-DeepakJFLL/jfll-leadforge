"""API routes for automated Client Report generation and Word (.docx) streaming.
"""
from typing import List
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
import re

from src.api.report_models import (
    ClientReportData,
    GenerateReportRequest,
    ReportCompanySuggestion,
)
from src.services.report_service import (
    generate_client_report_data,
    search_report_companies,
)
from src.services.report_docx_generator import generate_docx_stream

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

@router.get(
    "/companies",
    response_model=List[ReportCompanySuggestion],
    summary="Search companies in DataMyne for client report autocomplete",
)
def get_report_companies(
    q: str = Query(..., min_length=1, description="Company name or ID prefix"),
    limit: int = Query(10, ge=1, le=50),
):
    """Search DataMyne for company suggestions to auto-complete report generation."""
    return search_report_companies(query=q, limit=limit)

@router.post(
    "/generate",
    response_model=ClientReportData,
    summary="Synthesize 4-section client briefing report data",
)
def post_generate_report(payload: GenerateReportRequest):
    """Generate structured 4-section prospect briefing data for a company."""
    if not payload.company_name_or_id or not payload.company_name_or_id.strip():
        raise HTTPException(status_code=400, detail="Company name or ID is required")
    
    return generate_client_report_data(
        company_query=payload.company_name_or_id,
        prepared_for=payload.prepared_for or "Mumbai Sales Branch",
        prepared_by=payload.prepared_by or "Tyra Theknath",
    )

@router.post(
    "/export-docx",
    summary="Export client report data as formatted Word (.docx) document stream",
)
def post_export_docx(report: ClientReportData):
    """Stream an in-memory formatted Word (.docx) document without disk I/O."""
    try:
        docx_buffer = generate_docx_stream(report)
        clean_company = re.sub(r"[^\w\s-]", "", report.header.company_name).strip().replace(" ", "_")
        clean_date = re.sub(r"[^\w-]", "_", report.header.date)
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
        raise HTTPException(status_code=500, detail=f"Failed to generate Word document: {str(exc)}")
