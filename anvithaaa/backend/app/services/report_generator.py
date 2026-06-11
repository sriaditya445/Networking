"""Orchestrate audit report generation."""

from app.reports.excel_generator import generate_excel_report
from app.reports.pdf_generator import generate_pdf_report
from app.schemas.common import AuditReportResponse, RuleResult


def build_audit_report_response(report_doc: dict) -> AuditReportResponse:
    """Convert MongoDB document to AuditReportResponse."""
    return AuditReportResponse(
        id=report_doc.get("id"),
        device_name=report_doc["device_name"],
        device_type=report_doc["device_type"],
        vendor=report_doc.get("vendor", "Cisco"),
        overall_score=report_doc["overall_score"],
        category_scores=report_doc["category_scores"],
        passed=[RuleResult(**r) for r in report_doc.get("passed", [])],
        failed=[RuleResult(**r) for r in report_doc.get("failed", [])],
        recommendations=[RuleResult(**r) for r in report_doc.get("recommendations", [])],
        audit_mode=report_doc.get("audit_mode", "full"),
        created_at=report_doc.get("created_at"),
    )


def export_pdf(report: dict) -> bytes:
    return generate_pdf_report(report)


def export_excel(report: dict) -> bytes:
    return generate_excel_report(report)
