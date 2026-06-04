import asyncio
import traceback
from app.services.report_service import ReportService
from app.core.database import db

async def test():
    print("=== Testing Report Service PDF Generation ===")
    try:
        # Check database connectivity
        await db.command("ping")
        print("[✓] MongoDB Connected.")

        # Test Executive Summary
        exec_bytes = await ReportService.generate_executive_summary_pdf()
        print(f"[✓] Executive Summary PDF generated: {len(exec_bytes)} bytes")

        # Test Device Inventory
        inv_bytes = await ReportService.generate_device_inventory_pdf()
        print(f"[✓] Device Inventory PDF generated: {len(inv_bytes)} bytes")

        # Test Compliance Audit
        comp_bytes = await ReportService.generate_compliance_audit_pdf()
        print(f"[✓] Compliance Audit PDF generated: {len(comp_bytes)} bytes")

        # Test Config Comparison
        comparison_bytes = await ReportService.generate_config_comparison_pdf()
        print(f"[✓] Config Comparison PDF generated: {len(comparison_bytes)} bytes")

        # Test Full Network Audit
        full_bytes = await ReportService.generate_full_network_audit_pdf()
        print(f"[✓] Full Network Audit PDF generated: {len(full_bytes)} bytes")

        print("\nAll Report Generation Tests Passed Successfully!")
    except Exception as e:
        print(f"\n[✗] Test failed with exception: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
