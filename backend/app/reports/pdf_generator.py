"""Generate PDF compliance audit reports."""

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_pdf_report(report: dict) -> bytes:
    """Generate PDF bytes from audit report data."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5 * inch)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=18, spaceAfter=12)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], fontSize=14, spaceAfter=8)
    normal = styles["Normal"]

    elements = []

    elements.append(Paragraph("Network Compliance Audit Report", title_style))
    elements.append(Paragraph(f"Device: {report.get('device_name', 'N/A')}", normal))
    elements.append(Paragraph(f"Device Type: {report.get('device_type', 'N/A')}", normal))
    elements.append(Paragraph(f"Vendor: {report.get('vendor', 'Cisco')}", normal))
    elements.append(Paragraph(f"Audit Mode: {report.get('audit_mode', 'full')}", normal))
    created = report.get("created_at", datetime.utcnow().isoformat())
    elements.append(Paragraph(f"Generated: {created}", normal))
    elements.append(Spacer(1, 0.3 * inch))

    score = report.get("overall_score", 0)
    score_color = colors.green if score >= 80 else colors.orange if score >= 60 else colors.red
    elements.append(Paragraph(f"Overall Compliance Score: <font color='{'#228B22' if score >= 80 else '#FF8C00' if score >= 60 else '#DC143C'}'>{score}%</font>", heading_style))
    elements.append(Spacer(1, 0.2 * inch))

    elements.append(Paragraph("Category Scores", heading_style))
    cat_scores = report.get("category_scores", {})
    cat_data = [["Category", "Score (%)"]]
    for cat, val in sorted(cat_scores.items()):
        if val > 0 or cat in ("aaa", "security", "snmp"):
            cat_data.append([cat.replace("_", " ").title(), f"{val}%"])

    cat_table = Table(cat_data, colWidths=[3 * inch, 2 * inch])
    cat_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
    ]))
    elements.append(cat_table)
    elements.append(Spacer(1, 0.3 * inch))

    failed = report.get("failed", [])
    if failed:
        elements.append(Paragraph(f"Failed Rules ({len(failed)})", heading_style))
        fail_data = [["Rule", "Category", "Status"]]
        for rule in failed[:50]:
            fail_data.append([
                rule.get("rule", "")[:60],
                rule.get("category", ""),
                rule.get("status", "FAIL"),
            ])
        fail_table = Table(fail_data, colWidths=[3.5 * inch, 1.5 * inch, 0.8 * inch])
        fail_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dc2626")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(fail_table)
        elements.append(Spacer(1, 0.3 * inch))

    recommendations = [
        rule
        for rule in report.get("failed", [])
        if rule.get("recommendation")
    ]
    if recommendations:
        elements.append(Paragraph(f"Recommendations ({len(recommendations)})", heading_style))
        for rec in recommendations[:30]:
            elements.append(Paragraph(f"<b>{rec.get('rule', '')}</b>", normal))
            elements.append(Paragraph(f"Issue: {rec.get('recommendation', 'N/A')}", normal))
            elements.append(Paragraph(f"Remediation: <font face='Courier'>{rec.get('remediation', 'N/A')}</font>", normal))
            elements.append(Spacer(1, 0.1 * inch))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
