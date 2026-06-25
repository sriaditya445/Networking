from fastapi import APIRouter, HTTPException, Response

from app.services.audit_report_service import (
    AuditReportService
)

from app.services.audit_result_service import (
    AuditResultService
)

from app.services.report_generator import (
    ReportGenerator
)

router = APIRouter(
    prefix="/api/audit",
    tags=["Audit"]
)

@router.get("/results")
async def get_all_results():

    return await AuditResultService.get_all_results()

@router.get("/results/{result_id}")
async def get_result(
    result_id: str
):

    result = await AuditResultService.get_result(
        result_id
    )

    if not result:

        raise HTTPException(
            status_code=404,
            detail="Audit result not found"
        )

    return result

@router.get("/results/device/{device_id}")
async def get_device_results(
    device_id: str
):

    return await AuditResultService.get_device_results(
        device_id
    )

@router.get(
    "/results/upload/{upload_id}"
)
async def get_upload_results(
    upload_id: str
):
    return await AuditResultService.get_upload_results(
        upload_id
    )

@router.get("/reports")
async def get_all_reports():

    return await AuditReportService.get_all_reports()

@router.get("/reports/{report_id}")
async def get_report(
    report_id: str
):

    report = await AuditReportService.get_report(
        report_id
    )

    if not report:

        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    return report

@router.get("/reports/device/{device_id}")
async def get_device_reports(
    device_id: str
):

    return await AuditReportService.get_device_reports(
        device_id
    )

@router.get(
    "/reports/{report_id}/pdf"
)
async def export_pdf(
    report_id: str
):

    report = await AuditReportService.get_report(
        report_id
    )

    if not report:

        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    audit_result = await AuditResultService.get_result(
        report["audit_result_id"]
    )
    pdf_bytes = ReportGenerator.export_pdf(
        audit_result
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
            f"attachment; filename={audit_result['device_name']}.pdf"
        }
    )

@router.get(
    "/reports/{report_id}/excel"
)
async def export_excel(
    report_id: str
):

    report = await AuditReportService.get_report(
        report_id
    )

    if not report:

        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    audit_result = await AuditResultService.get_result(
        report["audit_result_id"]
    )

    excel_bytes = ReportGenerator.export_excel(
        audit_result
    )

    return Response(
        content=excel_bytes,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
            f"attachment; filename={audit_result['device_name']}.xlsx"
        }
    )  

