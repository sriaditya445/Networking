from app.reports.pdf_generator import (
    generate_pdf_report,
    generate_group_pdf_report,
    generate_upload_pdf_report
)

from app.reports.excel_generator import (
    generate_excel_report,
    generate_group_excel_report,
    generate_upload_excel_report
)


class ReportGenerator:

    @staticmethod
    def export_pdf(
        report: dict
    ):

        return generate_pdf_report(
            report
        )

    @staticmethod
    def export_excel(
        report: dict
    ):

        return generate_excel_report(
            report
        )

    @staticmethod
    def export_group_pdf(
        group_info: dict,
        devices: list,
        audit_results: list
    ):
        return generate_group_pdf_report(
            group_info,
            devices,
            audit_results
        )

    @staticmethod
    def export_group_excel(
        group_info: dict,
        devices: list,
        audit_results: list
    ):
        return generate_group_excel_report(
            group_info,
            devices,
            audit_results
        )

    @staticmethod
    def export_upload_pdf(
        upload_info: dict,
        groups: list,
        devices_by_group: dict,
        audit_results_by_device: dict
    ):
        return generate_upload_pdf_report(
            upload_info,
            groups,
            devices_by_group,
            audit_results_by_device
        )

    @staticmethod
    def export_upload_excel(
        upload_info: dict,
        groups: list,
        devices_by_group: dict,
        audit_results_by_device: dict
    ):
        return generate_upload_excel_report(
            upload_info,
            groups,
            devices_by_group,
            audit_results_by_device
        )