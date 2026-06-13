from fastapi import APIRouter, Depends, HTTPException

from app.database.mongodb import get_db
from app.schemas.common import GoldenTemplateCreate, GoldenTemplateResponse
from app.services.mongodb_service import MongoDBService
from app.services.template_loader import list_templates
from app.services.template_parser import parse_template_content, render_template_preview

router = APIRouter(prefix="/api/templates", tags=["Golden Templates"])

# GET    /templates
# GET    /templates/{id}
# POST   /templates
# PUT    /templates/{id}
# DELETE /templates/{id}

@router.get("", response_model=list[GoldenTemplateResponse], summary="List golden templates")
async def get_templates(vendor: str | None = None, device_type: str | None = None, db=Depends(get_db)):
    templates = await list_templates(db, vendor, device_type)
    return [
        GoldenTemplateResponse(
            id=t["id"],
            vendor=t["vendor"],
            device_type=t["device_type"],
            template_name=t["template_name"],
            template_type=t.get("template_type", "jinja2"),
            template_content=t["template_content"],
            sections=t.get("sections", {}),
            created_at=t.get("created_at"),
            updated_at=t.get("updated_at"),
        )
        for t in templates
    ]


@router.get("/{template_id}", response_model=GoldenTemplateResponse, summary="Get template by ID")
async def get_template(template_id: str, db=Depends(get_db)):
    from bson import ObjectId

    doc = await db.golden_templates.find_one({"_id": ObjectId(template_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Template not found")
    doc["id"] = str(doc.pop("_id"))
    return GoldenTemplateResponse(**doc)


@router.post("", response_model=GoldenTemplateResponse, summary="Create golden template")
async def create_template(template: GoldenTemplateCreate, db=Depends(get_db)):
    parsed = parse_template_content(template.template_content)
    mongo = MongoDBService(db)
    data = template.model_dump()
    data["sections"] = parsed.sections
    tid = await mongo.create_template(GoldenTemplateCreate(**data))
    from bson import ObjectId

    doc = await db.golden_templates.find_one({"_id": ObjectId(tid)})
    doc["id"] = str(doc.pop("_id"))
    return GoldenTemplateResponse(**doc)


@router.put("/{template_id}", response_model=GoldenTemplateResponse, summary="Update golden template")
async def update_template(template_id: str, template: GoldenTemplateCreate, db=Depends(get_db)):
    parsed = parse_template_content(template.template_content)
    mongo = MongoDBService(db)
    data = template.model_dump()
    data["sections"] = parsed.sections
    updated = await mongo.update_template(template_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    from bson import ObjectId

    doc = await db.golden_templates.find_one({"_id": ObjectId(template_id)})
    doc["id"] = str(doc.pop("_id"))
    return GoldenTemplateResponse(**doc)


@router.delete("/{template_id}", summary="Delete golden template")
async def delete_template(template_id: str, db=Depends(get_db)):
    mongo = MongoDBService(db)
    deleted = await mongo.delete_template(template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}


@router.post("/{template_id}/preview", summary="Preview rendered template")
async def preview_template(template_id: str, variables: dict | None = None, db=Depends(get_db)):
    from bson import ObjectId

    doc = await db.golden_templates.find_one({"_id": ObjectId(template_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Template not found")
    rendered = render_template_preview(doc["template_content"], variables)
    return {"rendered": rendered}
