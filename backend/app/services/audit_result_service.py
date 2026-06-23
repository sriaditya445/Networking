from datetime import datetime

from app.models.audit_results import (
    AuditResultModel
)

from app.repositories.audit_result_repository import (
    AuditResultRepository
)
from app.services.device_service import DeviceService
from app.services.upload_service import UploadService

class AuditResultService:

    @staticmethod
    async def create_result(
        device: dict,
        audit_result: dict,
        audit_mode: str,
        selected_sections: list[str]
    ):

        result_doc = AuditResultModel(
            device_id=str(device["_id"]),
            device_name=device["device_name"],
            group_id=device["group_id"],
            template_id=device["template_id"],
            audit_mode=audit_mode,
            selected_sections=selected_sections,
            overall_score=audit_result["score"],
            category_scores=audit_result["category_scores"],
            passed=audit_result["passed"],
            failed=audit_result["failed"],
            created_at=datetime.utcnow()
        )

        result = await AuditResultRepository.create(
            result_doc.model_dump()
        )

        return str(result.inserted_id)

    @staticmethod
    async def get_result(result_id: str):
        return await AuditResultRepository.get_by_id(
            result_id
        )

    @staticmethod
    async def get_device_results(device_id: str):
        return await AuditResultRepository.get_by_device_id(
            device_id
        )

    @staticmethod
    async def get_all_results():
        return await AuditResultRepository.get_all()

    @staticmethod
    async def delete_result(result_id: str):
        await AuditResultRepository.delete(
            result_id
        )

    @staticmethod
    async def get_upload_results(upload_id: str):

        devices = await DeviceService.get_devices(
            upload_id=upload_id
        )

        results = []

        for device in devices:
            device_results = await AuditResultRepository.get_by_device_id(
                str(device["_id"])
            )
            results.extend(device_results)

        return results


#     {
#     "upload_id": "...",
#     "status": "COMPLETED",
#     "total_devices": 25,
#     "average_score": 84.2,

#     "groups": [
#         {
#             "group_id": "Cisco|switch|C9300",
#             "device_count": 15,
#             "average_score": 87.5
#         },
#         {
#             "group_id": "Cisco|router|ISR",
#             "device_count": 10,
#             "average_score": 79.8
#         }
#     ]
# }
    # @staticmethod
    # async def get_upload_summary(
    #     upload_id: str
    # ):

    #     upload = await UploadService.get_upload(
    #         upload_id
    #     )

    #     devices = await DeviceService.get_devices(
    #         upload_id=upload_id
    #     )

    #     device_ids = [
    #         str(device["_id"])
    #         for device in devices
    #     ]

    #     results = (
    #         await AuditResultRepository.get_by_device_ids(
    #             device_ids
    #         )
    #     )

    #     average_score = 0

    #     if results:

    #         average_score = round(
    #             sum(
    #                 result["overall_score"]
    #                 for result in results
    #             ) / len(results),
    #             2
    #         )

    #     return {
    #         "upload_id": upload_id,
    #         "folder_name": upload["folder_name"],
    #         "status": upload["status"],

    #         "total_devices":
    #             upload.get(
    #                 "total_devices",
    #                 0
    #             ),

    #         "parsed_success_count":
    #             upload.get(
    #                 "parsed_success_count",
    #                 0
    #             ),

    #         "parsed_failed_count":
    #             upload.get(
    #                 "parsed_failed_count",
    #                 0
    #             ),

    #         "audit_success_count":
    #             upload.get(
    #                 "audit_success_count",
    #                 0
    #             ),

    #         "audit_failed_count":
    #             upload.get(
    #                 "audit_failed_count",
    #                 0
    #             ),

    #         "average_score":
    #             average_score
    #     }

    # @staticmethod
    # async def get_upload_summary(
    #     upload_id: str
    # ):

    #     devices = await DeviceService.get_devices(
    #         upload_id=upload_id
    #     )

    #     total_devices = len(devices)
    #     audited_devices = 0
    #     passed_devices = 0
    #     failed_devices = 0

    #     total_score = 0

    #     results = []

    #     for device in devices:

    #         device_results = (
    #             await AuditResultRepository.get_by_device_id(
    #                 str(device["_id"])
    #             )
    #         )

    #         if not device_results:
    #             continue

    #         result = device_results[0]

    #         audited_devices += 1

    #         score = result["overall_score"]

    #         total_score += score

    #         if score >= 80:
    #             passed_devices += 1
    #         else:
    #             failed_devices += 1

    #         results.append(result)

    #     average_score = (
    #         round(total_score / audited_devices, 2)
    #         if audited_devices
    #         else 0
    #     )

    #     return {
    #         "upload_id": upload_id,
    #         "total_devices": total_devices,
    #         "audited_devices": audited_devices,
    #         "passed_devices": passed_devices,
    #         "failed_devices": failed_devices,
    #         "average_score": average_score
    #     }