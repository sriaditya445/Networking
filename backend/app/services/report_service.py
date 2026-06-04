import io
import re
from datetime import datetime
from collections import Counter
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from app.repositories.upload_repository import UploadRepository
from app.repositories.device_repository import DeviceRepository
from app.repositories.comparison_repository import ComparisonRepository

# Define Golden Templates for Configuration Comparisons
SWITCH_TEMPLATE = """! Standard Switch Template v1.0
hostname {hostname}
service password-encryption
no ip domain-lookup
vtp mode transparent
snmp-server community public RO
banner motd ^C Unauthorized access is prohibited ^C
interface GigabitEthernet0/1
 switchport mode access
 switchport access vlan 10
line vty 0 4
 transport input ssh
"""

ROUTER_TEMPLATE = """! Standard Router Template v1.0
hostname {hostname}
service password-encryption
no ip domain-lookup
ip routing
snmp-server community public RO
banner motd ^C Unauthorized access is prohibited ^C
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
router ospf 1
 network 192.168.1.0 0.0.0.255 area 0
line vty 0 4
 transport input ssh
"""

FIREWALL_TEMPLATE = """! Standard Firewall Template v1.0
hostname {hostname}
service password-encryption
no ip domain-lookup
snmp-server community public RO
banner motd ^C Unauthorized access is prohibited ^C
interface GigabitEthernet0/0
 security-level 100
 nameif inside
interface GigabitEthernet0/1
 security-level 0
 nameif outside
access-list outside_access_in extended deny ip any any
access-group outside_access_in in interface outside
line vty 0 4
 transport input ssh
"""

DEFAULT_TEMPLATE = """! Standard Network Template v1.0
hostname {hostname}
service password-encryption
no ip domain-lookup
snmp-server community public RO
banner motd ^C Unauthorized access is prohibited ^C
line vty 0 4
 transport input ssh
"""


def clean_lines(text):
    """
    Cleans lines of configuration text: strips whitespace, skips empty lines, and skips comments.
    """
    lines = []
    for line in text.split("\n"):
        line = line.strip()
        if not line or line.startswith("!") or line.startswith("#"):
            continue
        lines.append(line)
    return lines


def compare_config(config_text: str, device_type: str, device_name: str) -> dict:
    """
    Compares the device's configuration text against the golden template for its type.
    """
    if device_type == "Switch":
        template = SWITCH_TEMPLATE
        template_name = "Standard Switch Template v1.0"
    elif device_type == "Router":
        template = ROUTER_TEMPLATE
        template_name = "Standard Router Template v1.0"
    elif device_type == "Firewall":
        template = FIREWALL_TEMPLATE
        template_name = "Standard Firewall Template v1.0"
    else:
        template = DEFAULT_TEMPLATE
        template_name = "Standard Network Template v1.0"

    # Fill placeholder
    template_filled = template.replace("{hostname}", device_name)

    actual_lines = clean_lines(config_text)
    template_lines = clean_lines(template_filled)

    # Missing configs
    missing = []
    for t_line in template_lines:
        found = False
        for a_line in actual_lines:
            if t_line.lower() in a_line.lower():
                found = True
                break
        if not found:
            missing.append(t_line)

    # Extra configs
    extra = []
    for a_line in actual_lines:
        found = False
        for t_line in template_lines:
            if t_line.lower() in a_line.lower():
                found = True
                break
        if not found:
            extra.append(a_line)

    deviations_count = len(missing) + len(extra)
    status = "Compliant" if len(missing) == 0 else "Non-Compliant"

    return {
        "golden_template_name": template_name,
        "comparison_status": status,
        "deviations_count": deviations_count,
        "missing_configs": missing,
        "extra_configs": extra[:15]
    }


def run_compliance_check(config_text: str) -> dict:
    """
    Runs dynamic security compliance checks against a configuration string.
    """
    violations = []
    total_checks = 6
    passed_checks = 0

    # Check 1: Password Encryption
    if re.search(r"service\s+password-encryption", config_text, re.IGNORECASE):
        passed_checks += 1
    else:
        violations.append("Password encryption is not enabled (missing 'service password-encryption')")

    # Check 2: Domain Lookup disabled
    if re.search(r"no\s+ip\s+domain-lookup", config_text, re.IGNORECASE):
        passed_checks += 1
    else:
        violations.append("IP domain lookup is enabled (missing 'no ip domain-lookup')")

    # Check 3: SSH enabled on lines
    if re.search(r"transport\s+input\s+ssh", config_text, re.IGNORECASE):
        passed_checks += 1
    else:
        violations.append("SSH is not enforced on terminal lines (missing 'transport input ssh')")

    # Check 4: Secure SNMP
    if re.search(r"snmp-server\s+community\s+(public|private)", config_text, re.IGNORECASE):
        violations.append("Insecure default SNMP community configured (found 'public' or 'private')")
    else:
        passed_checks += 1

    # Check 5: MOTD Banner
    if re.search(r"banner\s+motd", config_text, re.IGNORECASE):
        passed_checks += 1
    else:
        violations.append("Banner Message of the Day (MOTD) is not configured")

    # Check 6: Default Credentials Check
    if re.search(r"username\s+admin\s+password\s+(admin|cisco)", config_text, re.IGNORECASE) or \
       re.search(r"enable\s+password\s+(cisco|admin|12345)", config_text, re.IGNORECASE):
        violations.append("Weak default credentials detected (found cisco/admin enabling passwords)")
    else:
        passed_checks += 1

    score = int((passed_checks / total_checks) * 100)
    status = "Passed" if score >= 80 else "Failed"

    return {
        "compliance_score": score,
        "violations": violations,
        "status": status
    }


def extract_ip_address(ips_list) -> str:
    """
    Extracts the first IP address from a list of IP interface strings.
    """
    if not ips_list:
        return "N/A"
    for ip_str in ips_list:
        match = re.search(r"IP:\s*([0-9.]+)", ip_str, re.IGNORECASE)
        if match:
            return match.group(1)
    return "N/A"


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw total page count,
    headers, and footers on all pages except the cover page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Draw beautiful border on Cover Page
            self.saveState()
            self.setStrokeColor(colors.HexColor("#1e293b"))
            self.setLineWidth(2)
            self.rect(30, 30, 552, 732)
            self.restoreState()
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header Text and Line
        self.drawString(54, 750, "Network Audit Report | Enterprise Configuration Analysis")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)

        # Footer Text and Line
        self.line(54, 52, 558, 52)
        self.drawString(54, 40, "CONFIDENTIAL - Internal IT Operations Only")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 40, page_text)
        self.restoreState()


class ReportService:

    @staticmethod
    async def get_device_comparisons_and_compliance(devices):
        """
        Processes devices to ensure compliance audits and configuration comparisons are stored in MongoDB.
        """
        results = []
        for d in devices:
            device_id = str(d["_id"])
            device_name = d.get("device_name", "Unknown")
            device_type = d.get("device_type", "Unknown")
            config_text = d.get("configuration", "")

            # Run Audit Engines
            comp = compare_config(config_text, device_type, device_name)
            compliance = run_compliance_check(config_text)

            # Save results in comparisons collection (MongoDB)
            await ComparisonRepository.create_or_update(device_id, {
                "device_name": device_name,
                "device_type": device_type,
                "golden_template_name": comp["golden_template_name"],
                "comparison_status": comp["comparison_status"],
                "deviations_count": comp["deviations_count"],
                "missing_configs": comp["missing_configs"],
                "extra_configs": comp["extra_configs"],
                "compliance_score": compliance["compliance_score"],
                "violations": compliance["violations"],
                "compliance_status": compliance["status"],
                "compared_at": datetime.utcnow()
            })

            # Format item
            results.append({
                "device_id": device_id,
                "device_name": device_name,
                "device_type": device_type,
                "golden_template_name": comp["golden_template_name"],
                "comparison_status": comp["comparison_status"],
                "deviations_count": comp["deviations_count"],
                "missing_configs": comp["missing_configs"],
                "extra_configs": comp["extra_configs"],
                "compliance_score": compliance["compliance_score"],
                "violations": compliance["violations"],
                "compliance_status": compliance["status"],
                "ips": d.get("parsed_data", {}).get("ips", []),
                "upload_id": d.get("upload_id", ""),
                "parsed_at": d.get("parsed_at")
            })
        return results

    @staticmethod
    def get_styles():
        """
        Returns a style sheet with customized styles.
        """
        styles = getSampleStyleSheet()
        styles['Normal'].textColor = colors.HexColor('#334155')

        # Add custom unique styles if not existing
        custom_styles = {
            'ReportTitle': ParagraphStyle(
                'ReportTitle',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=26,
                leading=32,
                textColor=colors.HexColor('#1e293b'),
                spaceAfter=10
            ),
            'ReportSubtitle': ParagraphStyle(
                'ReportSubtitle',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=13,
                leading=16,
                textColor=colors.HexColor('#64748b'),
                spaceAfter=25
            ),
            'H1_Custom': ParagraphStyle(
                'H1_Custom',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=16,
                leading=20,
                textColor=colors.HexColor('#0f172a'),
                spaceBefore=18,
                spaceAfter=10,
                keepWithNext=True
            ),
            'H2_Custom': ParagraphStyle(
                'H2_Custom',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=11,
                leading=14,
                textColor=colors.HexColor('#1e293b'),
                spaceBefore=12,
                spaceAfter=6,
                keepWithNext=True
            ),
            'Body_Custom': ParagraphStyle(
                'Body_Custom',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=9,
                leading=13,
                textColor=colors.HexColor('#334155'),
                spaceAfter=6
            ),
            'Body_Bold': ParagraphStyle(
                'Body_Bold',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=9,
                leading=13,
                textColor=colors.HexColor('#1e293b'),
                spaceAfter=6
            ),
            'MetaLabel': ParagraphStyle(
                'MetaLabel',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=9,
                leading=12,
                textColor=colors.HexColor('#475569')
            ),
            'MetaVal': ParagraphStyle(
                'MetaVal',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=9,
                leading=12,
                textColor=colors.HexColor('#1e293b')
            ),
            'Code_Custom': ParagraphStyle(
                'Code_Custom',
                parent=styles['Normal'],
                fontName='Courier',
                fontSize=7.5,
                leading=10,
                textColor=colors.HexColor('#0f172a'),
                backColor=colors.HexColor('#f8fafc'),
                borderColor=colors.HexColor('#e2e8f0'),
                borderWidth=0.5,
                borderPadding=4,
                spaceAfter=6
            )
        }

        for name, style in custom_styles.items():
            if name in styles:
                styles.remove(name)
            styles.add(style)

        return styles

    @staticmethod
    def add_cover_page(story, title_text, styles):
        """
        Adds a beautiful cover page to the story.
        """
        story.append(Spacer(1, 80))

        # Logo Icon block
        logo_data = [[
            Paragraph("<b><font size=16 color='#ffffff'>NETCONFIG AUDIT SYSTEM</font></b>",
                      ParagraphStyle('LogoText', parent=styles['Normal'], alignment=1))
        ]]
        logo_table = Table(logo_data, colWidths=[240], rowHeights=[36])
        logo_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(logo_table)
        story.append(Spacer(1, 40))

        # Title and Subtitle
        story.append(Paragraph(title_text, styles['ReportTitle']))
        story.append(Paragraph("Enterprise Infrastructure Configuration Analysis & Compliance Staging Report", styles['ReportSubtitle']))
        story.append(Spacer(1, 140))

        # Metadata
        meta_data = [
            [Paragraph("Audit Report Type:", styles['MetaLabel']), Paragraph(title_text, styles['MetaVal'])],
            [Paragraph("Generated Timestamp:", styles['MetaLabel']), Paragraph(datetime.now().strftime("%Y-%m-%d %H:%M:%S"), styles['MetaVal'])],
            [Paragraph("System Status:", styles['MetaLabel']), Paragraph("<font color='#059669'><b>COMPLIANCE READY</b></font>", styles['MetaVal'])],
            [Paragraph("Security Classification:", styles['MetaLabel']), Paragraph("<font color='#dc2626'><b>CONFIDENTIAL - INTERNAL ONLY</b></font>", styles['MetaVal'])],
        ]
        meta_table = Table(meta_data, colWidths=[150, 250])
        meta_table.setStyle(TableStyle([
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ]))
        story.append(meta_table)
        story.append(PageBreak())

    @classmethod
    async def generate_executive_summary_pdf(cls) -> bytes:
        """
        Generates the Executive Summary PDF.
        """
        devices = await DeviceRepository.get_all()
        jobs = await UploadRepository.get_all()
        audited = await cls.get_device_comparisons_and_compliance(devices)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = cls.get_styles()
        story = []

        # 1. Cover Page
        cls.add_cover_page(story, "Executive Summary Report", styles)

        # 2. Executive Summary Content
        story.append(Paragraph("Executive Summary", styles['H1_Custom']))
        story.append(Paragraph(
            "This report summarizes the operational state and staging analytics for your enterprise networking configurations. "
            "NetConfig parsed and audited these devices from the administrative upload center to analyze type segregation, routing protocols, and compliance status.",
            styles['Body_Custom']
        ))
        story.append(Spacer(1, 15))

        # Compliance score, total jobs, total devices calculations
        total_jobs = len(jobs)
        total_devices = len(devices)
        success_jobs = len([j for j in jobs if j.get("status") == "success"])
        success_rate = int((success_jobs / total_jobs * 100)) if total_jobs > 0 else 0

        avg_score = 0
        if audited:
            avg_score = int(sum(d["compliance_score"] for d in audited) / len(audited))

        # Summary Metric Cards
        metrics_data = [
            [
                Paragraph("<b>Total Upload Batches</b><br/><font size=16 color='#0ea5e9'>{}</font>".format(total_jobs), styles['Body_Custom']),
                Paragraph("<b>Parsed Devices</b><br/><font size=16 color='#0ea5e9'>{}</font>".format(total_devices), styles['Body_Custom']),
                Paragraph("<b>Average Compliance</b><br/><font size=16 color='#059669'>{}%</font>".format(avg_score), styles['Body_Custom'])
            ]
        ]
        metrics_table = Table(metrics_data, colWidths=[166, 166, 166])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 20))

        # Device Type Distribution Table
        story.append(Paragraph("Device Type Distribution", styles['H2_Custom']))
        type_counts = Counter(d.get("device_type", "Unknown") for d in devices)
        dist_data = [["Device Type", "Count", "Percentage"]]
        for dev_type, count in type_counts.items():
            pct = int((count / total_devices * 100)) if total_devices > 0 else 0
            dist_data.append([dev_type, str(count), f"{pct}%"])

        dist_table = Table(dist_data, colWidths=[200, 150, 150])
        dist_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ]))
        story.append(dist_table)
        story.append(Spacer(1, 20))

        # Job Summary Table
        story.append(Paragraph("Upload Job Execution Summary", styles['H2_Custom']))
        job_data = [["Folder Name", "Files Count", "Status", "Success Rate"]]
        for j in jobs[:8]: # limit to last 8
            status_text = j.get("status", "pending").upper()
            status_color = "#dc2626" if status_text == "FAILED" else "#059669"
            job_data.append([
                j.get("folder_name", "configs"),
                str(j.get("files_count", 0)),
                Paragraph(f"<font color='{status_color}'><b>{status_text}</b></font>", styles['Body_Custom']),
                f"{success_rate}%" if status_text == "SUCCESS" else "0%"
            ])

        job_table = Table(job_data, colWidths=[180, 100, 110, 110])
        job_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ]))
        story.append(job_table)

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    async def generate_device_inventory_pdf(cls) -> bytes:
        """
        Generates the Device Inventory PDF.
        """
        devices = await DeviceRepository.get_all()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = cls.get_styles()
        story = []

        cls.add_cover_page(story, "Device Inventory Report", styles)

        story.append(Paragraph("Device Inventory", styles['H1_Custom']))
        story.append(Paragraph(
            f"This inventory lists all {len(devices)} discovered and parsed network elements currently staged in the database. "
            "Information is dynamically updated from upload logs and parser metadata.",
            styles['Body_Custom']
        ))
        story.append(Spacer(1, 15))

        # Table data
        inv_data = [["Device Name", "Device Type", "IP Address", "Discovery Date"]]
        for d in devices:
            parsed_at_str = ""
            if d.get("parsed_at"):
                parsed_at_str = d["parsed_at"].strftime("%Y-%m-%d %H:%M")

            ips = d.get("parsed_data", {}).get("ips", [])
            ip_addr = extract_ip_address(ips)

            inv_data.append([
                d.get("device_name", "Unknown"),
                d.get("device_type", "Unknown"),
                ip_addr,
                parsed_at_str
            ])

        inv_table = Table(inv_data, colWidths=[150, 110, 120, 120])
        inv_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ]))
        story.append(inv_table)

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    async def generate_compliance_audit_pdf(cls) -> bytes:
        """
        Generates the Compliance Audit PDF.
        """
        devices = await DeviceRepository.get_all()
        audited = await cls.get_device_comparisons_and_compliance(devices)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = cls.get_styles()
        story = []

        cls.add_cover_page(story, "Compliance Audit Report", styles)

        story.append(Paragraph("Security Compliance Audit", styles['H1_Custom']))
        story.append(Paragraph(
            "This section evaluates staged configuration templates against default enterprise security guidelines, "
            "including password encryption, domain name lockouts, SNMP communities, and SSH authentication.",
            styles['Body_Custom']
        ))
        story.append(Spacer(1, 15))

        # Compliance metrics calculations
        total = len(audited)
        passed = len([d for d in audited if d["compliance_status"] == "Passed"])
        failed = total - passed
        avg_score = int(sum(d["compliance_score"] for d in audited) / total) if total > 0 else 0

        # Cards
        comp_metrics = [
            [
                Paragraph("<b>Audited Devices</b><br/><font size=16 color='#1e293b'>{}</font>".format(total), styles['Body_Custom']),
                Paragraph("<b>Passed</b><br/><font size=16 color='#059669'>{}</font>".format(passed), styles['Body_Custom']),
                Paragraph("<b>Failed</b><br/><font size=16 color='#dc2626'>{}</font>".format(failed), styles['Body_Custom']),
                Paragraph("<b>Score</b><br/><font size=16 color='#059669'>{}%</font>".format(avg_score), styles['Body_Custom'])
            ]
        ]
        metrics_table = Table(comp_metrics, colWidths=[125, 125, 125, 125])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 20))

        # Top violations
        all_violations = []
        for d in audited:
            all_violations.extend(d["violations"])

        violation_counts = Counter(all_violations)

        story.append(Paragraph("Identified Top Security Violations", styles['H2_Custom']))
        if violation_counts:
            violation_data = [["Violation Description", "Affected Devices", "Severity"]]
            for viol, count in violation_counts.most_common(5):
                severity = "HIGH" if "credential" in viol.lower() or "password" in viol.lower() else "MEDIUM"
                sev_color = "#dc2626" if severity == "HIGH" else "#d97706"
                violation_data.append([
                    viol,
                    str(count),
                    Paragraph(f"<font color='{sev_color}'><b>{severity}</b></font>", styles['Body_Custom'])
                ])

            v_table = Table(violation_data, colWidths=[300, 100, 100])
            v_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
            ]))
            story.append(v_table)
        else:
            story.append(Paragraph("<font color='#059669'><b>No policy violations detected. The configuration files meet standard criteria.</b></font>", styles['Body_Custom']))
        story.append(Spacer(1, 20))

        # Device details
        story.append(Paragraph("Individual Device Compliance Scorecard", styles['H2_Custom']))
        dev_data = [["Device Name", "Type", "Compliance Score", "Audit Status"]]
        for d in audited:
            score = d["compliance_score"]
            status_text = d["compliance_status"]
            status_color = "#059669" if status_text == "Passed" else "#dc2626"

            dev_data.append([
                d["device_name"],
                d["device_type"],
                f"{score}%",
                Paragraph(f"<font color='{status_color}'><b>{status_text}</b></font>", styles['Body_Custom'])
            ])

        dev_table = Table(dev_data, colWidths=[150, 100, 120, 130])
        dev_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
        ]))
        story.append(dev_table)

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    async def generate_config_comparison_pdf(cls) -> bytes:
        """
        Generates the Configuration Comparison PDF.
        """
        devices = await DeviceRepository.get_all()
        audited = await cls.get_device_comparisons_and_compliance(devices)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = cls.get_styles()
        story = []

        cls.add_cover_page(story, "Configuration Comparison Report", styles)

        story.append(Paragraph("Configuration Template Deviations", styles['H1_Custom']))
        story.append(Paragraph(
            "This report analyzes configurations against default templates, showing missing commands and extra configs.",
            styles['Body_Custom']
        ))
        story.append(Spacer(1, 15))

        # Comparison summary table
        comp_data = [["Device Name", "Device Type", "Golden Template Used", "Comparison Status", "Deviations"]]
        for d in audited:
            status_text = d["comparison_status"]
            status_color = "#059669" if status_text == "Compliant" else "#dc2626"

            comp_data.append([
                d["device_name"],
                d["device_type"],
                d["golden_template_name"],
                Paragraph(f"<font color='{status_color}'><b>{status_text}</b></font>", styles['Body_Custom']),
                str(d["deviations_count"])
            ])

        comp_table = Table(comp_data, colWidths=[100, 70, 160, 110, 60])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
        ]))
        story.append(comp_table)
        story.append(Spacer(1, 20))

        # Detailed breakdown of deviations per device
        deviated_devices = [d for d in audited if d["deviations_count"] > 0]
        if deviated_devices:
            story.append(Paragraph("Detailed Deviation Breakdowns", styles['H2_Custom']))
            for d in deviated_devices[:5]:  # show up to 5 devices in summary
                story.append(Paragraph(f"<b>Device: {d['device_name']} ({d['device_type']})</b>", styles['Body_Bold']))

                # Missing configs
                if d["missing_configs"]:
                    story.append(Paragraph("Missing Commands (Required by Golden Template):", styles['Body_Custom']))
                    code_block = "\n".join(f"- {c}" for c in d["missing_configs"])
                    story.append(Paragraph(code_block.replace("\n", "<br/>"), styles['Code_Custom']))

                # Extra configs
                if d["extra_configs"]:
                    story.append(Paragraph("Extra/Non-Standard Config Line Snippets:", styles['Body_Custom']))
                    code_block = "\n".join(f"+ {c}" for c in d["extra_configs"][:6])
                    story.append(Paragraph(code_block.replace("\n", "<br/>"), styles['Code_Custom']))
                story.append(Spacer(1, 10))
        else:
            story.append(Paragraph("<font color='#059669'><b>No configuration deviations detected. All devices are fully compliant with corporate templates.</b></font>", styles['Body_Custom']))

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    async def generate_full_network_audit_pdf(cls) -> bytes:
        """
        Generates the Full Network Audit PDF combining all report modules.
        """
        devices = await DeviceRepository.get_all()
        jobs = await UploadRepository.get_all()
        audited = await cls.get_device_comparisons_and_compliance(devices)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = cls.get_styles()
        story = []

        # 1. Title Cover Page
        cls.add_cover_page(story, "Full Network Audit Report", styles)

        # 2. Executive Summary Section
        story.append(Paragraph("1. Executive Summary", styles['H1_Custom']))
        story.append(Paragraph(
            "This enterprise report compiles the configuration audit findings across all uploaded batches. "
            "It outlines asset distributions, configuration consistency, template compliance scores, and key security considerations.",
            styles['Body_Custom']
        ))
        story.append(Spacer(1, 10))

        # Metrics cards
        total_jobs = len(jobs)
        total_devices = len(devices)
        avg_score = int(sum(d["compliance_score"] for d in audited) / len(audited)) if audited else 0
        passed_devices = len([d for d in audited if d["compliance_status"] == "Passed"])
        failed_devices = total_devices - passed_devices

        metrics_data = [
            [
                Paragraph("<b>Total Upload Batches</b><br/><font size=16 color='#0ea5e9'>{}</font>".format(total_jobs), styles['Body_Custom']),
                Paragraph("<b>Audited Devices</b><br/><font size=16 color='#0ea5e9'>{}</font>".format(total_devices), styles['Body_Custom']),
                Paragraph("<b>Overall Compliance</b><br/><font size=16 color='#059669'>{}%</font>".format(avg_score), styles['Body_Custom'])
            ]
        ]
        metrics_table = Table(metrics_data, colWidths=[166, 166, 166])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(metrics_table)
        story.append(Spacer(1, 15))

        # Device Type counts
        type_counts = Counter(d.get("device_type", "Unknown") for d in devices)
        dist_data = [["Device Type", "Count", "Percentage"]]
        for dev_type, count in type_counts.items():
            pct = int((count / total_devices * 100)) if total_devices > 0 else 0
            dist_data.append([dev_type, str(count), f"{pct}%"])

        dist_table = Table(dist_data, colWidths=[200, 150, 150])
        dist_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
        ]))
        story.append(dist_table)
        story.append(PageBreak())

        # 3. Device Inventory Section
        story.append(Paragraph("2. Device Inventory", styles['H1_Custom']))
        inv_data = [["Device Name", "Device Type", "IP Address", "Status"]]
        for d in devices:
            ips = d.get("parsed_data", {}).get("ips", [])
            ip_addr = extract_ip_address(ips)
            inv_data.append([
                d.get("device_name", "Unknown"),
                d.get("device_type", "Unknown"),
                ip_addr,
                d.get("status", "success").upper()
            ])

        inv_table = Table(inv_data, colWidths=[150, 110, 120, 120])
        inv_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
        ]))
        story.append(inv_table)
        story.append(PageBreak())

        # 4. Compliance Analysis Section
        story.append(Paragraph("3. Security Compliance Analysis", styles['H1_Custom']))
        comp_metrics = [
            [
                Paragraph("<b>Audited</b><br/><font size=14 color='#1e293b'>{}</font>".format(total_devices), styles['Body_Custom']),
                Paragraph("<b>Passed</b><br/><font size=14 color='#059669'>{}</font>".format(passed_devices), styles['Body_Custom']),
                Paragraph("<b>Failed</b><br/><font size=14 color='#dc2626'>{}</font>".format(failed_devices), styles['Body_Custom']),
                Paragraph("<b>Compliance Score</b><br/><font size=14 color='#059669'>{}%</font>".format(avg_score), styles['Body_Custom'])
            ]
        ]
        c_table = Table(comp_metrics, colWidths=[125, 125, 125, 125])
        c_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(c_table)
        story.append(Spacer(1, 15))

        # Top violations
        all_violations = []
        for d in audited:
            all_violations.extend(d["violations"])
        violation_counts = Counter(all_violations)

        story.append(Paragraph("Top Policies Violated", styles['H2_Custom']))
        if violation_counts:
            violation_data = [["Violation Details", "Affected Count"]]
            for viol, count in violation_counts.most_common(4):
                violation_data.append([viol, str(count)])

            v_table = Table(violation_data, colWidths=[380, 120])
            v_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
            ]))
            story.append(v_table)
        else:
            story.append(Paragraph("No violations recorded. All devices meet the evaluated policy standards.", styles['Body_Custom']))
        story.append(PageBreak())

        # 5. Configuration Comparison Results
        story.append(Paragraph("4. Configuration Template Comparison", styles['H1_Custom']))
        comp_sum_data = [["Device Name", "Golden Template", "Status", "Deviations Count"]]
        for d in audited:
            status_text = d["comparison_status"]
            status_color = "#059669" if status_text == "Compliant" else "#dc2626"
            comp_sum_data.append([
                d["device_name"],
                d["golden_template_name"],
                Paragraph(f"<font color='{status_color}'><b>{status_text}</b></font>", styles['Body_Custom']),
                str(d["deviations_count"])
            ])

        comp_sum_table = Table(comp_sum_data, colWidths=[120, 180, 110, 90])
        comp_sum_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
        ]))
        story.append(comp_sum_table)
        story.append(Spacer(1, 15))

        # Show detailed deviations
        deviated = [d for d in audited if d["deviations_count"] > 0]
        if deviated:
            story.append(Paragraph("Sample Configuration Deviations Breakdown", styles['H2_Custom']))
            for d in deviated[:3]:  # Top 3 devices
                story.append(Paragraph(f"<b>Device: {d['device_name']}</b> (Template: {d['golden_template_name']})", styles['Body_Bold']))
                if d["missing_configs"]:
                    miss_str = "\n".join(f"- {c}" for c in d["missing_configs"][:6])
                    story.append(Paragraph("Missing Commands:<br/>" + miss_str.replace("\n", "<br/>"), styles['Code_Custom']))
                if d["extra_configs"]:
                    extr_str = "\n".join(f"+ {c}" for c in d["extra_configs"][:6])
                    story.append(Paragraph("Extra Snippets:<br/>" + extr_str.replace("\n", "<br/>"), styles['Code_Custom']))
                story.append(Spacer(1, 5))
        story.append(PageBreak())

        # 6. Security Observations & Recommendations
        story.append(Paragraph("5. Security Observations & Recommendations", styles['H1_Custom']))
        story.append(Paragraph(
            "Based on the results of the compliance auditing and configuration templates comparisons, we have compiled the following recommendations to secure the infrastructure environment:",
            styles['Body_Custom']
        ))
        story.append(Spacer(1, 10))

        recs = [
            "<b>1. Enforce Global Password Encryption:</b> Ensure that `service password-encryption` is enabled on all IOS switches and routers. This secures enable/local credentials stored in the configuration from plain text inspection.",
            "<b>2. Restrict Terminal Lines (VTY):</b> Enforce SSH-only access on all remote console lines via `transport input ssh`. Disable Telnet access entirely to prevent credential sniffing in transit.",
            "<b>3. Update Default Community Strings:</b> Modify any active SNMP community configs to replace default strings (like `public` or `private`) with secure, random passwords. Limit SNMP access to designated Network Management System (NMS) IP addresses.",
            "<b>4. Establish Banner Notifications:</b> Deploy legal MOTD warning banners on all devices to establish regulatory notice and deter unauthorized access attempts.",
            "<b>5. Disable IP Domain Lookup:</b> Implement `no ip domain-lookup` on devices where DNS resolution is not required, preventing keyboard typos from triggering DNS lockouts."
        ]

        for rec in recs:
            story.append(Paragraph(rec, styles['Body_Custom']))
            story.append(Spacer(1, 4))

        story.append(Spacer(1, 15))

        # 7. Audit Conclusion
        story.append(Paragraph("6. Audit Conclusion", styles['H1_Custom']))
        story.append(Paragraph(
            "In conclusion, the network configuration staging environment shows a solid framework but requires some technical hardening. "
            "Remediating the deviations and policy violations identified in sections 3 and 4 will ensure alignment with security baselines and support production-ready deployments.",
            styles['Body_Custom']
        ))

        doc.build(story, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()
