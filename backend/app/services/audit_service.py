"""
Audit Service

Orchestrates device configuration audit process:
1. Load parsed device configuration JSON
2. Load golden template
3. Execute compliance rules
4. Generate findings
5. Calculate scores
6. Store results in MongoDB
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
from app.core.logger import logger
from app.audit.rule_engine import RuleEngine, ComplianceFinding
from app.repositories.audit_repository import AuditRepository
from app.repositories.device_repository import DeviceRepository
from app.models.device_model import DeviceModel


class AuditService:
    """Service for auditing device configurations."""

    def __init__(self):
        self.rule_engine = RuleEngine()

    async def audit_single_device(
        self,
        device_id: str,
        batch_id: str
    ) -> Dict[str, Any]:
        """
        Audit a single device configuration.
        
        Args:
            device_id: MongoDB device ID
            batch_id: Batch job ID for tracking
            
        Returns:
            Dict with audit results including score, findings, summary
        """
        try:
            logger.info(f"Starting audit for device {device_id}")

            # 1. Load device configuration
            device = await DeviceRepository.get_by_id(device_id)
            if not device:
                raise ValueError(f"Device {device_id} not found")

            # 2. Get configuration JSON (should be populated by parser)
            config_json = device.get("configuration_json", {})
            if not config_json:
                logger.warning(f"Device {device_id} has no configuration_json; parsing raw config")
                # Fallback: parse raw configuration
                from app.parsers.common.cisco_config_parser import CiscoConfigParser
                parser = CiscoConfigParser(device.get("configuration", ""))
                config_json = parser.parse()

            # 3. Execute all compliance rules
            findings = self.rule_engine.evaluate_all(config_json)

            # 4. Convert findings to documents
            findings_docs = []
            for finding in findings:
                finding_doc = {
                    "device_id": device_id,
                    "upload_id": device.get("upload_id"),
                    "rule_id": finding.rule_id,
                    "section": finding.section,
                    "severity": finding.severity,
                    "status": finding.status,
                    "expected": finding.expected,
                    "actual": finding.actual,
                    "remediation": finding.remediation,
                    "evidence": finding.evidence,
                    "audit_batch_id": batch_id,
                    "created_at": datetime.utcnow()
                }
                findings_docs.append(finding_doc)

            # 5. Store findings in MongoDB
            if findings_docs:
                finding_ids = await AuditRepository.create_findings_batch(findings_docs)
            else:
                finding_ids = []

            # 6. Calculate scores and summary
            summary = self.rule_engine.get_findings_summary(findings)
            audit_score = self.rule_engine.calculate_audit_score(findings)
            risk_score = self.rule_engine.calculate_risk_score(findings)

            # 7. Determine compliance status
            critical_failures = summary["by_severity"]["CRITICAL"]
            high_failures = summary["by_severity"]["HIGH"]

            if critical_failures > 0:
                compliance_status = "NON_COMPLIANT"
            elif high_failures >= 3:
                compliance_status = "PARTIALLY_COMPLIANT"
            elif audit_score >= 80:
                compliance_status = "COMPLIANT"
            else:
                compliance_status = "PARTIALLY_COMPLIANT"

            # 8. Generate executive summary
            executive_summary = self._generate_executive_summary(
                device.get("device_name"),
                compliance_status,
                critical_failures,
                high_failures,
                audit_score
            )

            # 9. Create audit report
            report_doc = {
                "device_id": device_id,
                "upload_id": device.get("upload_id"),
                "device_name": device.get("device_name"),
                "device_type": device.get("device_type"),
                "vendor": device.get("vendor", "Unknown"),
                "audit_score": audit_score,
                "risk_score": risk_score,
                "compliance_status": compliance_status,
                "summary": summary,
                "findings_count": len(findings),
                "passed_rules": summary["passed"],
                "failed_rules": summary["failed"],
                "not_applicable_rules": summary["not_applicable"],
                "findings_ids": finding_ids,
                "executive_summary": executive_summary,
                "generated_at": datetime.utcnow(),
                "generated_by": batch_id
            }

            report_id = await AuditRepository.create_report(report_doc)

            # 10. Update device with audit results
            await DeviceRepository.update(device_id, {
                "audit_status": "SUCCESS",
                "audit_score": audit_score,
                "audit_summary": summary,
                "audit_findings_id": finding_ids[0] if finding_ids else None,
                "audit_report_id": report_id,
                "batch_job_id": batch_id,
                "updated_at": datetime.utcnow()
            })

            logger.info(f"Audit completed for device {device_id}: score={audit_score}, status={compliance_status}")

            return {
                "device_id": device_id,
                "audit_score": audit_score,
                "risk_score": risk_score,
                "compliance_status": compliance_status,
                "findings_count": len(findings),
                "report_id": report_id,
                "finding_ids": finding_ids
            }

        except Exception as e:
            logger.error(f"Error auditing device {device_id}: {e}")
            # Update device with error status
            await DeviceRepository.update(device_id, {
                "audit_status": "FAILED",
                "error_message": str(e),
                "updated_at": datetime.utcnow()
            })
            raise

    async def audit_batch_devices(
        self,
        device_ids: List[str],
        batch_id: str
    ) -> Dict[str, Any]:
        """
        Audit multiple devices in a batch.
        
        Args:
            device_ids: List of device IDs to audit
            batch_id: Batch job ID for tracking
            
        Returns:
            Dict with batch results
        """
        results = {
            "batch_id": batch_id,
            "total_devices": len(device_ids),
            "successful_audits": 0,
            "failed_audits": 0,
            "audit_results": []
        }

        for device_id in device_ids:
            try:
                result = await self.audit_single_device(device_id, batch_id)
                results["audit_results"].append(result)
                results["successful_audits"] += 1
            except Exception as e:
                logger.error(f"Failed to audit device {device_id}: {e}")
                results["failed_audits"] += 1
                results["audit_results"].append({
                    "device_id": device_id,
                    "error": str(e)
                })

        return results

    async def get_device_audit_report(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Get audit report for a device."""
        try:
            report = await AuditRepository.get_report_by_device(device_id)
            return report
        except Exception as e:
            logger.error(f"Error getting audit report for device {device_id}: {e}")
            raise

    async def get_device_findings(
        self,
        device_id: str,
        severity: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get audit findings for a device."""
        try:
            if severity:
                findings = await AuditRepository.get_findings_by_severity(device_id, severity)
            else:
                findings = await AuditRepository.get_findings_by_device(device_id)
            return findings
        except Exception as e:
            logger.error(f"Error getting findings for device {device_id}: {e}")
            raise

    async def get_batch_summary(self, batch_id: str) -> Dict[str, Any]:
        """Get summary statistics for an audit batch."""
        try:
            findings = await AuditRepository.get_findings_by_batch(batch_id)
            summary = self.rule_engine.get_findings_summary(findings)
            
            severity_counts = await AuditRepository.count_findings_by_severity(batch_id)
            status_counts = await AuditRepository.count_findings_by_status(batch_id)

            return {
                "batch_id": batch_id,
                "total_findings": len(findings),
                "summary": summary,
                "by_severity": severity_counts,
                "by_status": status_counts
            }
        except Exception as e:
            logger.error(f"Error getting batch summary for {batch_id}: {e}")
            raise

    async def compare_with_template(
        self,
        device_id: str,
        template_id: str
    ) -> Dict[str, Any]:
        """
        Compare device configuration with golden template.
        
        Returns:
            Dict showing matched/missing/extra sections
        """
        try:
            # Load device config
            device = await DeviceRepository.get_by_id(device_id)
            device_config = device.get("configuration_json", {})

            # Load template
            template = await AuditRepository.get_template_by_id(template_id)
            template_sections = template.get("template_sections", {})

            # Compare sections
            matched = []
            missing = []
            extra = []

            for section in device_config.keys():
                if section in template_sections:
                    matched.append(section)
                else:
                    extra.append(section)

            for section in template_sections.keys():
                if section not in device_config:
                    missing.append(section)

            match_percentage = (len(matched) / (len(matched) + len(missing))) * 100 if (len(matched) + len(missing)) > 0 else 0

            return {
                "device_id": device_id,
                "template_id": template_id,
                "match_percentage": match_percentage,
                "matched_sections": matched,
                "missing_sections": missing,
                "extra_sections": extra
            }

        except Exception as e:
            logger.error(f"Error comparing device {device_id} with template: {e}")
            raise

    async def get_compliance_dashboard(self, upload_id: str) -> Dict[str, Any]:
        """Get compliance dashboard summary for an upload."""
        try:
            # Get dashboard summary from audit reports
            dashboard = await AuditRepository.get_compliance_dashboard_summary(upload_id)

            # Get batch jobs for this upload
            batch_jobs = await AuditRepository.get_batch_jobs_by_upload(upload_id)
            batch_counts = await AuditRepository.count_batch_jobs_by_status(upload_id)

            return {
                "upload_id": upload_id,
                "devices": dashboard,
                "batch_jobs": batch_counts,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting compliance dashboard for upload {upload_id}: {e}")
            raise

    def _generate_executive_summary(
        self,
        device_name: str,
        compliance_status: str,
        critical_failures: int,
        high_failures: int,
        audit_score: float
    ) -> str:
        """Generate executive summary text."""
        status_msg = {
            "COMPLIANT": "meets compliance requirements",
            "PARTIALLY_COMPLIANT": "has compliance gaps requiring remediation",
            "NON_COMPLIANT": "has critical compliance violations"
        }

        msg = f"Device {device_name} {status_msg.get(compliance_status, 'unknown status')}. "
        msg += f"Audit score: {audit_score:.0f}/100. "

        if critical_failures > 0:
            msg += f"Critical findings: {critical_failures}. "

        if high_failures > 0:
            msg += f"High-severity findings: {high_failures}. "

        if critical_failures == 0 and high_failures == 0:
            msg += "No critical or high-severity findings. "

        return msg

    async def generate_remediation_recommendations(
        self,
        device_id: str
    ) -> List[Dict[str, Any]]:
        """
        Generate remediation recommendations for failed rules.
        
        Returns:
            List of remediation recommendations sorted by priority
        """
        try:
            findings = await AuditRepository.get_findings_by_device(device_id)

            recommendations = []
            priority = 1

            # Sort by severity
            severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
            failed_findings = [f for f in findings if f["status"] == "FAIL"]
            failed_findings.sort(key=lambda x: severity_order.get(x["severity"], 999))

            for finding in failed_findings:
                recommendation = {
                    "priority": priority,
                    "rule_id": finding["rule_id"],
                    "section": finding["section"],
                    "severity": finding["severity"],
                    "issue": finding["expected"],
                    "current_state": finding["actual"],
                    "recommended_action": finding["remediation"],
                    "estimated_effort": self._estimate_effort(finding["severity"]),
                    "risk_if_not_addressed": f"Device remains exposed to {finding['severity'].lower()}-severity compliance gap"
                }
                recommendations.append(recommendation)
                priority += 1

            return recommendations

        except Exception as e:
            logger.error(f"Error generating remediation recommendations for device {device_id}: {e}")
            raise

    def _estimate_effort(self, severity: str) -> str:
        """Estimate implementation effort based on severity."""
        effort_map = {
            "CRITICAL": "HIGH",
            "HIGH": "MEDIUM",
            "MEDIUM": "MEDIUM",
            "LOW": "LOW",
            "INFO": "LOW"
        }
        return effort_map.get(severity, "MEDIUM")

    async def re_audit_device(self, device_id: str, batch_id: str) -> Dict[str, Any]:
        """Re-run audit for a previously audited device."""
        try:
            # Delete old findings and reports
            device = await DeviceRepository.get_by_id(device_id)
            old_batch_id = device.get("batch_job_id")

            if old_batch_id:
                await AuditRepository.delete_findings_by_batch(old_batch_id)

            # Run new audit
            result = await self.audit_single_device(device_id, batch_id)
            return result

        except Exception as e:
            logger.error(f"Error re-auditing device {device_id}: {e}")
            raise
