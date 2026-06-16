from app.reports.pdf_generator import (
    generate_pdf_report
)

from app.reports.excel_generator import (
    generate_excel_report
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