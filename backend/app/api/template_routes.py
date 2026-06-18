from datetime import datetime

from fastapi import (
    APIRouter,
    HTTPException
)

from app.schemas.common_schema import (
    GoldenTemplateCreate,
    GoldenTemplateResponse,
    ActionResponse
)

from app.services.template_service import (
    TemplateService
)

from app.services.template_parser import (
    render_template_preview,parse_template_content
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
    device_type: str = None,
    model: str | None = None
):
    return await TemplateService.get_templates(
        vendor=vendor,
        device_type=device_type,
        model=model
    )

@router.get(
    "/{template_id}",
    response_model=GoldenTemplateResponse
)
async def get_template(
    template_id: str
):
    return await TemplateService.get_template(
        template_id
    )

@router.post(
    "/upload",response_model=ActionResponse
)
async def upload_template(
    vendor: str = Form(...),
    device_type: str = Form(...),
    model: str | None = Form(None),
    template_name: str = Form(...),
    file: UploadFile = File(...)
):

    content = (
        await file.read()
    ).decode("utf-8")

    parsed = parse_template_content(
        content
    )

    if model in ["", "None", "null"]:
        model = None

    template_id = await TemplateService.create_template(
        {
            "vendor": vendor,
            "device_type": device_type,
            "model": model,
            "template_name": template_name,
            "template_type": "jinja2",
            "template_content": content,
            "sections": parsed.sections,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    )

    return {
        "message": "Template created successfully",
        "id": template_id
    }

@router.put(
    "/{template_id}",
    response_model=GoldenTemplateResponse
)
async def update_template(
    template_id: str,
    template: GoldenTemplateCreate
):
    return await TemplateService.update_template(
        template_id,
        template.model_dump()
    )

@router.delete("/{template_id}",response_model=ActionResponse)
async def delete_template(
    template_id: str
):
    return await TemplateService.delete_template(
        template_id
    )

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

    rendered = render_template_preview(
        template["template_content"],
        variables
    )

    return {
        "rendered": rendered
    }