from bson import ObjectId
from datetime import datetime
from typing import Dict, List, Optional, Any
from app.core.database import (
    audit_findings_collection,
    audit_reports_collection,
    batch_jobs_collection,
    golden_templates_collection,
    logger
)


class AuditRepository:
    """Repository for audit findings, reports, batch jobs, and templates."""

    # ============ Audit Findings Operations ============

    @staticmethod
    async def create_finding(finding_doc: Dict[str, Any]):
        """Create new audit finding."""
        try:
            result = await audit_findings_collection.insert_one(finding_doc)
            logger.info(f"Created audit finding: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating audit finding: {e}")
            raise

    @staticmethod
    async def create_findings_batch(findings: List[Dict[str, Any]]):
        """Create multiple audit findings."""
        try:
            result = await audit_findings_collection.insert_many(findings)
            logger.info(f"Created {len(result.inserted_ids)} audit findings")
            return [str(id_) for id_ in result.inserted_ids]
        except Exception as e:
            logger.error(f"Error creating audit findings batch: {e}")
            raise

    @staticmethod
    async def get_findings_by_device(device_id: str) -> List[Dict]:
        """Get all audit findings for a specific device."""
        try:
            findings = await audit_findings_collection.find({
                "device_id": device_id
            }).sort("severity", -1).to_list(500)
            
            for finding in findings:
                finding["_id"] = str(finding["_id"])
            
            return findings
        except Exception as e:
            logger.error(f"Error fetching findings for device {device_id}: {e}")
            raise

    @staticmethod
    async def get_findings_by_batch(batch_id: str) -> List[Dict]:
        """Get all audit findings in a batch job."""
        try:
            findings = await audit_findings_collection.find({
                "audit_batch_id": batch_id
            }).to_list(5000)
            
            for finding in findings:
                finding["_id"] = str(finding["_id"])
            
            return findings
        except Exception as e:
            logger.error(f"Error fetching findings for batch {batch_id}: {e}")
            raise

    @staticmethod
    async def get_findings_by_severity(batch_id: str, severity: str) -> List[Dict]:
        """Get findings filtered by severity level."""
        try:
            findings = await audit_findings_collection.find({
                "audit_batch_id": batch_id,
                "severity": severity
            }).to_list(1000)
            
            for finding in findings:
                finding["_id"] = str(finding["_id"])
            
            return findings
        except Exception as e:
            logger.error(f"Error fetching {severity} findings for batch {batch_id}: {e}")
            raise

    @staticmethod
    async def get_finding_by_id(finding_id: str) -> Optional[Dict]:
        """Get single audit finding by ID."""
        try:
            finding = await audit_findings_collection.find_one({
                "_id": ObjectId(finding_id)
            })
            
            if finding:
                finding["_id"] = str(finding["_id"])
            
            return finding
        except Exception as e:
            logger.error(f"Error fetching finding {finding_id}: {e}")
            raise

    @staticmethod
    async def update_finding(finding_id: str, updates: Dict[str, Any]):
        """Update audit finding."""
        try:
            result = await audit_findings_collection.update_one(
                {"_id": ObjectId(finding_id)},
                {"$set": updates}
            )
            return result.modified_count
        except Exception as e:
            logger.error(f"Error updating finding {finding_id}: {e}")
            raise

    @staticmethod
    async def count_findings_by_severity(batch_id: str) -> Dict[str, int]:
        """Get count of findings by severity for batch."""
        try:
            pipeline = [
                {"$match": {"audit_batch_id": batch_id}},
                {"$group": {
                    "_id": "$severity",
                    "count": {"$sum": 1}
                }}
            ]
            
            results = await audit_findings_collection.aggregate(pipeline).to_list(100)
            
            counts = {
                "CRITICAL": 0,
                "HIGH": 0,
                "MEDIUM": 0,
                "LOW": 0,
                "INFO": 0
            }
            
            for result in results:
                counts[result["_id"]] = result["count"]
            
            return counts
        except Exception as e:
            logger.error(f"Error counting findings by severity for batch {batch_id}: {e}")
            raise

    @staticmethod
    async def count_findings_by_status(batch_id: str) -> Dict[str, int]:
        """Get count of findings by status (PASS, FAIL, NOT_APPLICABLE)."""
        try:
            pipeline = [
                {"$match": {"audit_batch_id": batch_id}},
                {"$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }}
            ]
            
            results = await audit_findings_collection.aggregate(pipeline).to_list(100)
            
            counts = {
                "PASS": 0,
                "FAIL": 0,
                "NOT_APPLICABLE": 0
            }
            
            for result in results:
                counts[result["_id"]] = result["count"]
            
            return counts
        except Exception as e:
            logger.error(f"Error counting findings by status for batch {batch_id}: {e}")
            raise

    @staticmethod
    async def delete_findings_by_batch(batch_id: str):
        """Delete all findings for a batch (use with caution)."""
        try:
            result = await audit_findings_collection.delete_many({
                "audit_batch_id": batch_id
            })
            logger.warning(f"Deleted {result.deleted_count} findings for batch {batch_id}")
            return result.deleted_count
        except Exception as e:
            logger.error(f"Error deleting findings for batch {batch_id}: {e}")
            raise

    # ============ Audit Reports Operations ============

    @staticmethod
    async def create_report(report_doc: Dict[str, Any]):
        """Create new audit report."""
        try:
            result = await audit_reports_collection.insert_one(report_doc)
            logger.info(f"Created audit report: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating audit report: {e}")
            raise

    @staticmethod
    async def get_report_by_device(device_id: str) -> Optional[Dict]:
        """Get audit report for specific device."""
        try:
            report = await audit_reports_collection.find_one({
                "device_id": device_id
            })
            
            if report:
                report["_id"] = str(report["_id"])
            
            return report
        except Exception as e:
            logger.error(f"Error fetching report for device {device_id}: {e}")
            raise

    @staticmethod
    async def get_reports_by_batch(batch_id: str) -> List[Dict]:
        """Get all reports generated in batch."""
        try:
            reports = await audit_reports_collection.find({
                "generated_by": batch_id
            }).sort("generated_at", -1).to_list(1000)
            
            for report in reports:
                report["_id"] = str(report["_id"])
            
            return reports
        except Exception as e:
            logger.error(f"Error fetching reports for batch {batch_id}: {e}")
            raise

    @staticmethod
    async def get_report_by_id(report_id: str) -> Optional[Dict]:
        """Get single audit report by ID."""
        try:
            report = await audit_reports_collection.find_one({
                "_id": ObjectId(report_id)
            })
            
            if report:
                report["_id"] = str(report["_id"])
            
            return report
        except Exception as e:
            logger.error(f"Error fetching report {report_id}: {e}")
            raise

    @staticmethod
    async def update_report(report_id: str, updates: Dict[str, Any]):
        """Update audit report."""
        try:
            result = await audit_reports_collection.update_one(
                {"_id": ObjectId(report_id)},
                {"$set": updates}
            )
            return result.modified_count
        except Exception as e:
            logger.error(f"Error updating report {report_id}: {e}")
            raise

    @staticmethod
    async def get_compliance_dashboard_summary(upload_id: str) -> Dict[str, Any]:
        """Get compliance dashboard summary for upload."""
        try:
            # Get summary stats
            pipeline = [
                {"$match": {"upload_id": upload_id}},
                {"$group": {
                    "_id": None,
                    "total_devices": {"$sum": 1},
                    "avg_audit_score": {"$avg": "$audit_score"},
                    "compliant_count": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$compliance_status", "COMPLIANT"]},
                                1,
                                0
                            ]
                        }
                    },
                    "non_compliant_count": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$compliance_status", "NON_COMPLIANT"]},
                                1,
                                0
                            ]
                        }
                    }
                }}
            ]
            
            result = await audit_reports_collection.aggregate(pipeline).to_list(1)
            
            if result:
                return result[0]
            else:
                return {
                    "total_devices": 0,
                    "avg_audit_score": 0,
                    "compliant_count": 0,
                    "non_compliant_count": 0
                }
        except Exception as e:
            logger.error(f"Error fetching dashboard summary for upload {upload_id}: {e}")
            raise

    # ============ Batch Jobs Operations ============

    @staticmethod
    async def create_batch_job(job_doc: Dict[str, Any]) -> str:
        """Create new batch job."""
        try:
            result = await batch_jobs_collection.insert_one(job_doc)
            logger.info(f"Created batch job: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating batch job: {e}")
            raise

    @staticmethod
    async def get_batch_job(batch_id: str) -> Optional[Dict]:
        """Get batch job by ID."""
        try:
            job = await batch_jobs_collection.find_one({
                "batch_id": batch_id
            })
            
            if job:
                job["_id"] = str(job["_id"])
                if job.get("started_at"):
                    job["started_at"] = job["started_at"].isoformat()
                if job.get("completed_at"):
                    job["completed_at"] = job["completed_at"].isoformat()
            
            return job
        except Exception as e:
            logger.error(f"Error fetching batch job {batch_id}: {e}")
            raise

    @staticmethod
    async def update_batch_job(batch_id: str, updates: Dict[str, Any]):
        """Update batch job status and progress."""
        try:
            result = await batch_jobs_collection.update_one(
                {"batch_id": batch_id},
                {"$set": updates}
            )
            return result.modified_count
        except Exception as e:
            logger.error(f"Error updating batch job {batch_id}: {e}")
            raise

    @staticmethod
    async def get_batch_jobs_by_upload(upload_id: str) -> List[Dict]:
        """Get all batch jobs for an upload."""
        try:
            jobs = await batch_jobs_collection.find({
                "upload_id": upload_id
            }).sort("created_at", -1).to_list(100)
            
            for job in jobs:
                job["_id"] = str(job["_id"])
            
            return jobs
        except Exception as e:
            logger.error(f"Error fetching batch jobs for upload {upload_id}: {e}")
            raise

    @staticmethod
    async def count_batch_jobs_by_status(upload_id: str) -> Dict[str, int]:
        """Count batch jobs by status."""
        try:
            pipeline = [
                {"$match": {"upload_id": upload_id}},
                {"$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }}
            ]
            
            results = await batch_jobs_collection.aggregate(pipeline).to_list(100)
            
            counts = {
                "PENDING": 0,
                "PROCESSING": 0,
                "COMPLETED": 0,
                "FAILED": 0
            }
            
            for result in results:
                counts[result["_id"]] = result["count"]
            
            return counts
        except Exception as e:
            logger.error(f"Error counting batch jobs by status for upload {upload_id}: {e}")
            raise

    # ============ Golden Templates Operations ============

    @staticmethod
    async def create_template(template_doc: Dict[str, Any]) -> str:
        """Create new golden template."""
        try:
            result = await golden_templates_collection.insert_one(template_doc)
            logger.info(f"Created golden template: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating golden template: {e}")
            raise

    @staticmethod
    async def get_template_by_id(template_id: str) -> Optional[Dict]:
        """Get golden template by ID."""
        try:
            template = await golden_templates_collection.find_one({
                "_id": ObjectId(template_id)
            })
            
            if template:
                template["_id"] = str(template["_id"])
            
            return template
        except Exception as e:
            logger.error(f"Error fetching template {template_id}: {e}")
            raise

    @staticmethod
    async def get_template_by_device_type(device_type: str, vendor: str = None) -> Optional[Dict]:
        """Get active golden template by device type (optionally by vendor)."""
        try:
            query = {"device_type": device_type}
            if vendor:
                query["vendor"] = vendor
            
            template = await golden_templates_collection.find_one(query)
            
            if template:
                template["_id"] = str(template["_id"])
            
            return template
        except Exception as e:
            logger.error(f"Error fetching template for device type {device_type}: {e}")
            raise

    @staticmethod
    async def get_all_templates(device_type: str = None) -> List[Dict]:
        """Get all golden templates (optionally filtered by device type)."""
        try:
            query = {}
            if device_type:
                query["device_type"] = device_type
            
            templates = await golden_templates_collection.find(query).sort("created_at", -1).to_list(100)
            
            for template in templates:
                template["_id"] = str(template["_id"])
            
            return templates
        except Exception as e:
            logger.error(f"Error fetching templates: {e}")
            raise

    @staticmethod
    async def update_template(template_id: str, updates: Dict[str, Any]):
        """Update golden template."""
        try:
            updates["updated_at"] = datetime.utcnow()
            result = await golden_templates_collection.update_one(
                {"_id": ObjectId(template_id)},
                {"$set": updates}
            )
            return result.modified_count
        except Exception as e:
            logger.error(f"Error updating template {template_id}: {e}")
            raise

    @staticmethod
    async def delete_template(template_id: str):
        """Delete golden template."""
        try:
            result = await golden_templates_collection.delete_one({
                "_id": ObjectId(template_id)
            })
            logger.warning(f"Deleted template {template_id}")
            return result.deleted_count
        except Exception as e:
            logger.error(f"Error deleting template {template_id}: {e}")
            raise
