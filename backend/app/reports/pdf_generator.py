"""Generate PDF compliance audit reports."""

import io
import os
import re
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def extract_ip_from_device(device: dict) -> str:
    """Extract an IP address from the device configuration file if available."""
    file_path = device.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                # Search for interface IP addresses
                match = re.search(r"ip\s+address\s+(\d+\.\d+\.\d+\.\d+)", content, re.I)
                if match:
                    return match.group(1)
                # Fallback to any IPv4 address in the configuration file
                match = re.search(r"\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b", content)
                if match:
                    return match.group(1)
        except Exception:
            pass
    return "N/A"


def get_horizontal_line():
    """Create a table-based horizontal separator line compatible with ReportLab."""
    line_table = Table([[""]], colWidths=[7.5 * inch], rowHeights=[1])
    line_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#cbd5e1")), # slate-300
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    return line_table


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


def generate_group_pdf_report(group_info: dict, devices: list, audit_results: list) -> bytes:
    """Generate consolidated PDF report for a device group."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch
    )
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        "GroupTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        spaceAfter=15,
        textColor=colors.HexColor("#1e40af")
    )
    section_heading = ParagraphStyle(
        "SecHeading",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        spaceBefore=12,
        spaceAfter=8,
        textColor=colors.HexColor("#0f172a")
    )
    sub_heading = ParagraphStyle(
        "SubHeading",
        parent=styles["Heading3"],
        fontSize=11,
        leading=14,
        spaceBefore=8,
        spaceAfter=4,
        textColor=colors.HexColor("#334155")
    )
    normal = styles["Normal"]
    bold_style = ParagraphStyle("BoldText", parent=styles["Normal"], fontName="Helvetica-Bold")
    code_style = ParagraphStyle(
        "CodeStyle",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    elements = []
    
    # Title
    elements.append(Paragraph("Device Group Compliance Report", title_style))
    elements.append(get_horizontal_line())
    elements.append(Spacer(1, 0.15 * inch))
    
    # Metadata Block
    group_data = [
        [Paragraph("<b>Vendor:</b>", normal), Paragraph(group_info.get("vendor", "N/A"), normal),
         Paragraph("<b>Device Type:</b>", normal), Paragraph(group_info.get("device_type", "N/A"), normal)],
        [Paragraph("<b>Model:</b>", normal), Paragraph(group_info.get("model", "N/A"), normal),
         Paragraph("<b>Template Name:</b>", normal), Paragraph(group_info.get("template_name", "N/A") or "N/A", normal)],
        [Paragraph("<b>Audit Mode:</b>", normal), Paragraph(str(group_info.get("audit_mode", "full")).title(), normal),
         Paragraph("<b>Devices:</b>", normal), Paragraph(str(len(devices)), normal)]
    ]
    if group_info.get("audit_mode") == "sections":
        sections_str = ", ".join(group_info.get("selected_sections", [])) or "None"
        group_data.append([
            Paragraph("<b>Selected Sections:</b>", normal), Paragraph(sections_str, normal),
            "", ""
        ])
        
    info_table = Table(group_data, colWidths=[1.5 * inch, 2.25 * inch, 1.5 * inch, 2.25 * inch])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # Calculations
    passed_count = 0
    failed_count = 0
    total_score = 0.0
    valid_results_count = 0
    
    device_results = {r["device_id"]: r for r in audit_results if r}
    
    for d in devices:
        res = device_results.get(str(d["_id"]))
        if res:
            score = res.get("overall_score", 0.0)
            total_score += score
            valid_results_count += 1
            if score >= 80:
                passed_count += 1
            else:
                failed_count += 1
        else:
            failed_count += 1
            
    compliance_pct = (total_score / valid_results_count) if valid_results_count > 0 else 0.0
    
    # Executive Summary Table
    elements.append(Paragraph("Executive Summary", section_heading))
    exec_data = [
        ["Total Devices", "Passed Devices", "Failed Devices", "Compliance Percentage"],
        [str(len(devices)), str(passed_count), str(failed_count), f"{compliance_pct:.2f}%"]
    ]
    exec_table = Table(exec_data, colWidths=[1.87 * inch] * 4)
    exec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    elements.append(exec_table)
    elements.append(Spacer(1, 0.25 * inch))
    
    # Device Summary
    elements.append(Paragraph("Device Summary", section_heading))
    summary_cols = [2.8 * inch, 1.8 * inch, 1.4 * inch, 1.5 * inch]
    summary_data = [["Device Name", "IP Address", "Compliance Score", "Audit Result"]]
    
    for d in devices:
        dev_id = str(d["_id"])
        res = device_results.get(dev_id)
        ip = extract_ip_from_device(d)
        score_val = "—"
        result_val = "PENDING"
        if res:
            score_val = f"{round(res.get('overall_score', 0))}%"
            result_val = "PASS" if res.get('overall_score', 0) >= 80 else "FAIL"
            
        summary_data.append([
            d.get("device_name", "N/A"),
            ip,
            score_val,
            result_val
        ])
        
    summary_table = Table(summary_data, colWidths=summary_cols)
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Device Details
    elements.append(Paragraph("Detailed Device Reports", section_heading))
    elements.append(get_horizontal_line())
    elements.append(Spacer(1, 0.15 * inch))
    
    for idx, d in enumerate(devices):
        dev_id = str(d["_id"])
        res = device_results.get(dev_id)
        ip = extract_ip_from_device(d)
        
        elements.append(Paragraph(f"Device {idx + 1}: {d.get('device_name')}", sub_heading))
        
        score = res.get("overall_score", 0) if res else 0
        details_meta = [
            [Paragraph("<b>IP Address:</b>", normal), Paragraph(ip, normal),
             Paragraph("<b>Compliance Score:</b>", normal), Paragraph(f"{score:.2f}%", normal)],
            [Paragraph("<b>Status:</b>", normal), Paragraph("Audited" if res else "Not Audited", normal),
             Paragraph("<b>Result:</b>", normal), Paragraph("PASS" if score >= 80 else "FAIL", normal)]
        ]
        meta_table = Table(details_meta, colWidths=[1.5 * inch, 2.25 * inch, 1.5 * inch, 2.25 * inch])
        meta_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 0.1 * inch))
        
        if res:
            failed_rules = res.get("failed", [])
            passed_rules = res.get("passed", [])
            
            elements.append(Paragraph(f"Audit Summary: Checked {len(passed_rules) + len(failed_rules)} rules. Passed: {len(passed_rules)}, Failed: {len(failed_rules)}.", normal))
            
            if failed_rules:
                elements.append(Spacer(1, 0.05 * inch))
                elements.append(Paragraph("Failed Rules & Recommendations:", bold_style))
                for f_rule in failed_rules[:15]:
                    elements.append(Paragraph(f"• <b>{f_rule.get('rule')}</b> [Category: {f_rule.get('category')}]", normal))
                    if f_rule.get('recommendation'):
                        elements.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;<i>Recommendation:</i> {f_rule.get('recommendation')}", normal))
                    if f_rule.get('remediation'):
                        elements.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;<i>Remediation Command:</i>", normal))
                        elements.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;<code>{f_rule.get('remediation')}</code>", code_style))
                    elements.append(Spacer(1, 0.05 * inch))
                    
                if len(failed_rules) > 15:
                    elements.append(Paragraph(f"• ... and {len(failed_rules) - 15} more failures.", normal))
            else:
                elements.append(Paragraph("All rules passed successfully.", normal))
                
        elements.append(Spacer(1, 0.2 * inch))
        elements.append(get_horizontal_line())
        elements.append(Spacer(1, 0.15 * inch))
        
    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


def generate_upload_pdf_report(upload_info: dict, groups: list, devices_by_group: dict, audit_results_by_device: dict) -> bytes:
    """Generate comprehensive PDF compliance report for an entire upload."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch
    )
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        "UploadTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        spaceAfter=15,
        textColor=colors.HexColor("#1e40af")
    )
    section_heading = ParagraphStyle(
        "SecHeading",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        spaceBefore=12,
        spaceAfter=8,
        textColor=colors.HexColor("#0f172a")
    )
    sub_heading = ParagraphStyle(
        "SubHeading",
        parent=styles["Heading3"],
        fontSize=11,
        leading=14,
        spaceBefore=8,
        spaceAfter=4,
        textColor=colors.HexColor("#334155")
    )
    normal = styles["Normal"]
    bold_style = ParagraphStyle("BoldText", parent=styles["Normal"], fontName="Helvetica-Bold")
    code_style = ParagraphStyle(
        "CodeStyle",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    elements = []
    
    # Title
    elements.append(Paragraph("Complete Compliance Audit Report", title_style))
    elements.append(get_horizontal_line())
    elements.append(Spacer(1, 0.15 * inch))
    
    # Metadata Block
    created_at_str = str(upload_info.get("created_at", ""))
    if isinstance(upload_info.get("created_at"), datetime):
        created_at_str = upload_info["created_at"].strftime("%Y-%m-%d %H:%M:%S UTC")
        
    upload_data = [
        [Paragraph("<b>Folder Name:</b>", normal), Paragraph(upload_info.get("folder_name", "N/A"), normal),
         Paragraph("<b>Upload Date:</b>", normal), Paragraph(created_at_str, normal)],
        [Paragraph("<b>Uploaded By:</b>", normal), Paragraph(upload_info.get("created_by", "N/A") or "N/A", normal),
         Paragraph("<b>Total Groups:</b>", normal), Paragraph(str(len(groups)), normal)],
        [Paragraph("<b>Total Devices:</b>", normal), Paragraph(str(upload_info.get("total_devices", 0)), normal),
         "", ""]
    ]
    info_table = Table(upload_data, colWidths=[1.5 * inch, 2.25 * inch, 1.5 * inch, 2.25 * inch])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.2 * inch))
    
    # Overall and Group Calculations
    overall_passed_devices = 0
    overall_failed_devices = 0
    overall_total_score = 0.0
    overall_valid_results_count = 0
    
    group_summaries = []
    
    for group in groups:
        g_id = group["group_id"]
        g_devices = devices_by_group.get(g_id, [])
        
        g_passed_count = 0
        g_failed_count = 0
        g_total_score = 0.0
        g_valid_count = 0
        
        for d in g_devices:
            dev_id = str(d["_id"])
            res = audit_results_by_device.get(dev_id)
            if res:
                score = res.get("overall_score", 0.0)
                g_total_score += score
                g_valid_count += 1
                
                if score >= 80:
                    g_passed_count += 1
                    overall_passed_devices += 1
                else:
                    g_failed_count += 1
                    overall_failed_devices += 1
            else:
                g_failed_count += 1
                overall_failed_devices += 1
                
        g_compliance = (g_total_score / g_valid_count) if g_valid_count > 0 else 0.0
        
        overall_total_score += g_total_score
        overall_valid_results_count += g_valid_count
        
        group_summaries.append({
            "vendor": group.get("vendor", "N/A"),
            "device_type": group.get("device_type", "N/A"),
            "model": group.get("model", "N/A"),
            "device_count": len(g_devices),
            "compliance": g_compliance
        })
        
    overall_compliance_pct = (overall_total_score / overall_valid_results_count) if overall_valid_results_count > 0 else 0.0
    
    # Executive Summary Table
    elements.append(Paragraph("Overall Compliance Summary", section_heading))
    overall_data = [
        ["Total Devices Audited", "Passed Devices", "Failed Devices", "Overall Compliance Score"],
        [str(overall_valid_results_count), str(overall_passed_devices), str(overall_failed_devices), f"{overall_compliance_pct:.2f}%"]
    ]
    overall_table = Table(overall_data, colWidths=[1.87 * inch] * 4)
    overall_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
    ]))
    elements.append(overall_table)
    elements.append(Spacer(1, 0.25 * inch))
    
    # Group summaries
    elements.append(Paragraph("Group Summaries", section_heading))
    g_cols = [1.8 * inch, 1.4 * inch, 1.4 * inch, 1.4 * inch, 1.5 * inch]
    g_data = [["Vendor", "Device Type", "Model", "Device Count", "Compliance Score"]]
    for gs in group_summaries:
        g_data.append([
            gs["vendor"],
            gs["device_type"],
            gs["model"],
            str(gs["device_count"]),
            f"{gs['compliance']:.2f}%"
        ])
    g_table = Table(g_data, colWidths=g_cols)
    g_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    elements.append(g_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Group Sections details
    for group in groups:
        g_id = group["group_id"]
        g_devices = devices_by_group.get(g_id, [])
        
        elements.append(Paragraph(f"Group: {group.get('vendor')} {group.get('device_type')} {group.get('model') or ''}", section_heading))
        elements.append(get_horizontal_line())
        elements.append(Spacer(1, 0.1 * inch))
        
        g_data_meta = [
            [Paragraph("<b>Template Name:</b>", normal), Paragraph(group.get("template_name", "N/A") or "N/A", normal),
             Paragraph("<b>Audit Mode:</b>", normal), Paragraph(str(group.get("audit_mode", "full")).title(), normal)],
            [Paragraph("<b>Devices:</b>", normal), Paragraph(str(len(g_devices)), normal),
             "", ""]
        ]
        g_meta_table = Table(g_data_meta, colWidths=[1.5 * inch, 2.25 * inch, 1.5 * inch, 2.25 * inch])
        g_meta_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(g_meta_table)
        elements.append(Spacer(1, 0.1 * inch))
        
        for idx, d in enumerate(g_devices):
            dev_id = str(d["_id"])
            res = audit_results_by_device.get(dev_id)
            ip = extract_ip_from_device(d)
            
            elements.append(Paragraph(f"• Device {idx + 1}: {d.get('device_name')} ({ip})", sub_heading))
            if res:
                score = res.get("overall_score", 0)
                elements.append(Paragraph(f"Compliance: <b>{score:.2f}%</b> (Result: {'PASS' if score >= 80 else 'FAIL'})", normal))
                
                failed_rules = res.get("failed", [])
                if failed_rules:
                    elements.append(Paragraph(f"Failed Rules: {len(failed_rules)} failures.", normal))
                    for f_rule in failed_rules[:5]:
                        elements.append(Paragraph(f"  - <b>{f_rule.get('rule')}</b>: {f_rule.get('recommendation')}", normal))
                    if len(failed_rules) > 5:
                        elements.append(Paragraph(f"  - ... and {len(failed_rules) - 5} more failures.", normal))
                else:
                    elements.append(Paragraph("All rules passed successfully.", normal))
            else:
                elements.append(Paragraph("Audit pending or failed.", normal))
                
            elements.append(Spacer(1, 0.05 * inch))
            
        elements.append(Spacer(1, 0.2 * inch))
        
    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
