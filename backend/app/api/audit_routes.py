from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.config import settings
from app.database.mongodb import get_db
from app.schemas.common import AuditMode, AuditReportResponse, DashboardStats, GoldenTemplateCreate, GoldenTemplateResponse
from app.services.audit_service import AuditService
from app.services.mongodb_service import MongoDBService
from app.services.report_generator import export_excel, export_pdf
from app.services.template_loader import list_templates
from app.schemas.common import RuleResult  

router = APIRouter(prefix="/api/audit", tags=["Audit"])

# POST /audit/run/{device_id}
# POST /audit/run-batch
# GET  /audit/reports
# GET  /audit/report/{id}
# GET  /audit/export/pdf/{id}
# GET  /audit/export/excel/{id}

def get_audit_service(db=Depends(get_db)) -> AuditService:
    return AuditService(db)


@router.post("/upload", summary="Upload folder of network configuration files")
async def upload_configs(
    files: list[UploadFile] = File(...),
    service: AuditService = Depends(get_audit_service),
):
    """Accept multiple config files (simulates folder upload)."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    file_data = []
    for f in files:
        content = await f.read()
        filename = f.filename or "unknown.cfg"
        file_data.append((filename, content))

    result = await service.process_upload_batch(file_data, settings.upload_dir)
    return result


@router.post("/run/{config_id}", response_model=AuditReportResponse, summary="Run compliance audit")
async def run_audit(
    config_id: str,
    audit_mode: AuditMode = AuditMode.FULL,
    template_name: str | None = None,
    service: AuditService = Depends(get_audit_service),
):
    try:
        return await service.run_audit(config_id, audit_mode.value, template_name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/run-batch", response_model=list[AuditReportResponse], summary="Run batch audit")
async def run_batch_audit(
    config_ids: list[str],
    audit_mode: AuditMode = AuditMode.FULL,
    service: AuditService = Depends(get_audit_service),
):
    return await service.run_batch_audit(config_ids, audit_mode.value)


@router.get("/reports", response_model=list[AuditReportResponse], summary="List audit reports")
async def list_reports(db=Depends(get_db)):
    mongo = MongoDBService(db)
    reports = await mongo.list_audit_reports()
    return [
        AuditReportResponse(
            id=r["id"],
            device_name=r["device_name"],
            device_type=r["device_type"],
            vendor=r.get("vendor", "Cisco"),
            overall_score=r["overall_score"],
            category_scores=r["category_scores"],
            passed=[RuleResult(**p) for p in r.get("passed", [])],
            failed=[RuleResult(**f) for f in r.get("failed", [])],
            recommendations=[RuleResult(**rec) for rec in r.get("recommendations", [])],
            audit_mode=r.get("audit_mode", "full"),
            created_at=r.get("created_at"),
        )
        for r in reports
    ]


@router.get("/reports/{report_id}", response_model=AuditReportResponse, summary="Get audit report")
async def get_report(report_id: str, db=Depends(get_db)):
    from app.services.report_generator import build_audit_report_response

    mongo = MongoDBService(db)
    doc = await mongo.get_audit_report(report_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    return build_audit_report_response(doc)


@router.get("/reports/{report_id}/export/pdf", summary="Export report as PDF")
async def export_report_pdf(report_id: str, db=Depends(get_db)):
    mongo = MongoDBService(db)
    doc = await mongo.get_audit_report(report_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    pdf_bytes = export_pdf(doc)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=audit_{doc['device_name']}.pdf"},
    )


@router.get("/reports/{report_id}/export/excel", summary="Export report as Excel")
async def export_report_excel(report_id: str, db=Depends(get_db)):
    mongo = MongoDBService(db)
    doc = await mongo.get_audit_report(report_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")
    excel_bytes = export_excel(doc)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=audit_{doc['device_name']}.xlsx"},
    )


@router.get("/dashboard", response_model=DashboardStats, summary="Dashboard statistics")
async def dashboard(db=Depends(get_db)):
    mongo = MongoDBService(db)
    stats = await mongo.get_dashboard_stats()
    from app.schemas.common import ComplianceTrendPoint, RuleResult

    recent = [
        AuditReportResponse(
            id=r["id"],
            device_name=r["device_name"],
            device_type=r["device_type"],
            vendor=r.get("vendor", "Cisco"),
            overall_score=r["overall_score"],
            category_scores=r["category_scores"],
            passed=[],
            failed=[],
            recommendations=[],
            audit_mode=r.get("audit_mode", "full"),
            created_at=r.get("created_at"),
        )
        for r in stats["recent_reports"]
    ]
    trends = [
        ComplianceTrendPoint(
            date=t["date"],
            overall_score=t["overall_score"],
            device_count=t["device_count"],
        )
        for t in stats["compliance_trends"]
    ]
    return DashboardStats(
        total_devices=stats["total_devices"],
        total_audits=stats["total_audits"],
        average_compliance=stats["average_compliance"],
        total_templates=stats["total_templates"],
        recent_reports=recent,
        compliance_trends=trends,
        device_inventory=stats["device_inventory"],
    )


@router.get("/devices", summary="List uploaded device configs")
async def list_devices(db=Depends(get_db)):
    mongo = MongoDBService(db)
    configs = await mongo.list_device_configs()
    return [
        {
            "id": c["id"],
            "device_name": c["device_name"],
            "device_type": c["device_type"],
            "vendor": c["vendor"],
            "file_path": c["file_path"],
            "detected_at": c.get("detected_at"),
        }
        for c in configs
    ]



