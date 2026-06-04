import logging
from fastapi import APIRouter, HTTPException, Response
from app.services.report_service import ReportService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/api/reports/executive-summary")
async def get_executive_summary():
    """
    Endpoint to download the Executive Summary PDF.
    """
    try:
        pdf_bytes = await ReportService.generate_executive_summary_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=network_audit_executive_summary.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.error(f"Error generating executive summary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate executive summary report: {str(e)}"
        )

@router.get("/api/reports/device-inventory")
async def get_device_inventory():
    """
    Endpoint to download the Device Inventory PDF.
    """
    try:
        pdf_bytes = await ReportService.generate_device_inventory_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=network_device_inventory.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.error(f"Error generating device inventory: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate device inventory report: {str(e)}"
        )

@router.get("/api/reports/compliance-audit")
async def get_compliance_audit():
    """
    Endpoint to download the Compliance Audit PDF.
    """
    try:
        pdf_bytes = await ReportService.generate_compliance_audit_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=network_compliance_audit.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.error(f"Error generating compliance audit: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate compliance audit report: {str(e)}"
        )

@router.get("/api/reports/config-comparison")
async def get_config_comparison():
    """
    Endpoint to download the Configuration Comparison PDF.
    """
    try:
        pdf_bytes = await ReportService.generate_config_comparison_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=network_configuration_comparison.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.error(f"Error generating config comparison: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate config comparison report: {str(e)}"
        )

@router.get("/api/reports/full-network-audit")
async def get_full_network_audit():
    """
    Endpoint to download the Full Network Audit PDF.
    """
    try:
        pdf_bytes = await ReportService.generate_full_network_audit_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=full_network_audit_report.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.error(f"Error generating full network audit: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate full network audit report: {str(e)}"
        )
