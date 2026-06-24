"""Generate Excel compliance audit reports."""

import io
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill


def generate_excel_report(report: dict) -> bytes:
    """Generate Excel bytes from audit report data."""
    wb = Workbook()

    ws_summary = wb.active
    ws_summary.title = "Summary"
    header_fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)

    summary_data = [
        ["Network Compliance Audit Report"],
        [],
        ["Device Name", report.get("device_name", "")],
        ["Device Type", report.get("device_type", "")],
        ["Vendor", report.get("vendor", "Cisco")],
        ["Audit Mode", report.get("audit_mode", "full")],
        ["Overall Score", f"{report.get('overall_score', 0)}%"],
        ["Generated", str(report.get("created_at", datetime.utcnow().isoformat()))],
    ]
    for row in summary_data:
        ws_summary.append(row)

    ws_summary["A1"].font = Font(bold=True, size=14)
    ws_summary.column_dimensions["A"].width = 20
    ws_summary.column_dimensions["B"].width = 40

    ws_categories = wb.create_sheet("Category Scores")
    ws_categories.append(["Category", "Score (%)"])
    for cell in ws_categories[1]:
        cell.fill = header_fill
        cell.font = header_font

    for cat, score in sorted(report.get("category_scores", {}).items()):
        ws_categories.append([cat.replace("_", " ").title(), score])
    ws_categories.column_dimensions["A"].width = 25
    ws_categories.column_dimensions["B"].width = 15

    ws_passed = wb.create_sheet("Passed Rules")
    ws_passed.append(["Rule", "Category", "Status"])
    for cell in ws_passed[1]:
        cell.fill = PatternFill(start_color="16A34A", end_color="16A34A", fill_type="solid")
        cell.font = header_font
    for rule in report.get("passed", []):
        ws_passed.append([rule.get("rule", ""), rule.get("category", ""), rule.get("status", "PASS")])
    ws_passed.column_dimensions["A"].width = 60
    ws_passed.column_dimensions["B"].width = 15

    ws_failed = wb.create_sheet("Failed Rules")
    ws_failed.append(["Rule", "Category", "Status"])
    for cell in ws_failed[1]:
        cell.fill = PatternFill(start_color="DC2626", end_color="DC2626", fill_type="solid")
        cell.font = header_font
    for rule in report.get("failed", []):
        ws_failed.append([rule.get("rule", ""), rule.get("category", ""), rule.get("status", "FAIL")])
    ws_failed.column_dimensions["A"].width = 60

    ws_recs = wb.create_sheet("Recommendations")
    ws_recs.append(["Rule", "Recommendation", "Remediation Command"])
    for cell in ws_recs[1]:
        cell.fill = header_fill
        cell.font = header_font
    for rec in report.get("failed", []):
        if rec.get("recommendation"):
            ws_recs.append([
                rec.get("rule", ""),
                rec.get("recommendation", ""),
                rec.get("remediation", "")
            ])
    ws_recs.column_dimensions["A"].width = 40
    ws_recs.column_dimensions["B"].width = 50
    ws_recs.column_dimensions["C"].width = 50

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.read()
