from datetime import datetime

from fastapi import (
    APIRouter,
    HTTPException
)

from app.schemas.common_schema import (
    GoldenTemplateCreate,
    GoldenTemplateResponse
)

from app.services.template_service import (
    TemplateService
)

from app.services.template_parser import (
    parse_template_content,
    render_template_preview
)
from fastapi import (
    UploadFile,
    File,
    Form
)

router = APIRouter(
    prefix="/api/templates",
    tags=["Templates"]
)

@router.get(
    "",
    response_model=list[GoldenTemplateResponse]
)
async def get_templates(
    vendor: str = None,
    device_type: str = None
):

    templates = await TemplateService.get_templates(
        vendor=vendor,
        device_type=device_type
    )

    response = []

    for template in templates:

        response.append(
            GoldenTemplateResponse(
                id=str(template["_id"]),
                vendor=template["vendor"],
                device_type=template["device_type"],
                template_name=template["template_name"],
                template_type=template["template_type"],
                template_content=template["template_content"],
                sections=template.get(
                    "sections",
                    {}
                ),
                created_at=template.get(
                    "created_at"
                ),
                updated_at=template.get(
                    "updated_at"
                )
            )
        )

    return response

@router.get(
"/{template_id}",
response_model=GoldenTemplateResponse
)
async def get_template(
    template_id: str
):

    template = await TemplateService.get_template(
        template_id
    )

    if not template:

        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )

    return GoldenTemplateResponse(
        id=template["_id"],
        vendor=template["vendor"],
        device_type=template["device_type"],
        template_name=template["template_name"],
        template_type=template["template_type"],
        template_content=template["template_content"],
        sections=template.get(
            "sections",
            {}
        ),
        created_at=template.get(
            "created_at"
        ),
        updated_at=template.get(
            "updated_at"
        )
    )

@router.post(
    "/upload",
    response_model=GoldenTemplateResponse
)
async def upload_template(

    vendor: str = Form(...),

    device_type: str = Form(...),

    template_name: str = Form(...),

    file: UploadFile = File(...)
):

    content = (
        await file.read()
    ).decode(
        "utf-8"
    )

    parsed = parse_template_content(
        content
    )

    doc = {
        "vendor": vendor,
        "device_type": device_type,
        "template_name": template_name,
        "template_type": "jinja2",
        "template_content": content,
        "sections": parsed.sections,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    template_id = (
        await TemplateService.create_template(
            doc
        )
    )

    created = (
        await TemplateService.get_template(
            template_id
        )
    )

    return GoldenTemplateResponse(
        id=created["_id"],
        **{
            k: v
            for k, v in created.items()
            if k != "_id"
        }
    )

# @router.post(
#     "",
#     response_model=GoldenTemplateResponse
# )

# async def create_template(
#     template: GoldenTemplateCreate
# ):

#     parsed = parse_template_content(
#         template.template_content
#     )

#     doc = template.model_dump()

#     doc["sections"] = parsed.sections
#     doc["created_at"] = datetime.utcnow()
#     doc["updated_at"] = datetime.utcnow()

#     template_id = await TemplateService.create_template(
#         doc
#     )

#     created = await TemplateService.get_template(
#         template_id
#     )

#     return GoldenTemplateResponse(
#         id=created["_id"],
#         **{
#             k: v
#             for k, v in created.items()
#             if k != "_id"
#         }
#     )

@router.put(
    "/{template_id}",
    response_model=GoldenTemplateResponse
)
async def update_template(
    template_id: str,
    template: GoldenTemplateCreate
):

    parsed = parse_template_content(
        template.template_content
    )

    data = template.model_dump()

    data["sections"] = parsed.sections
    data["updated_at"] = datetime.utcnow()

    updated = await TemplateService.update_template(
        template_id,
        data
    )

    if not updated:

        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )

    template_doc = await TemplateService.get_template(
        template_id
    )

    return GoldenTemplateResponse(
        id=template_doc["_id"],
        **{
            k: v
            for k, v in template_doc.items()
            if k != "_id"
        }
    )

@router.delete(
    "/{template_id}"
)
async def delete_template(
    template_id: str
):

    deleted = await TemplateService.delete_template(
        template_id
    )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )

    return {
        "message": "Template deleted successfully"
    }

@router.post(
    "/{template_id}/preview"
)
async def preview_template(
    template_id: str,
    variables: dict | None = None
):

    template = await TemplateService.get_template(
        template_id
    )

    if not template:

        raise HTTPException(
            status_code=404,
            detail="Template not found"
        )

    rendered = render_template_preview(
        template["template_content"],
        variables
    )

    return {
        "rendered": rendered
    }