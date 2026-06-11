"""Seed golden templates into MongoDB."""

import asyncio
from pathlib import Path

from app.config import settings
from app.database.mongodb import connect_db, close_db, get_db
from app.services.template_parser import parse_template_content

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

SEED_TEMPLATES = [
    {
        "vendor": "Cisco",
        "device_type": "switch",
        "template_name": "Cisco3650Standard",
        "file": "cisco_switch_golden.j2",
    },
    {
        "vendor": "Cisco",
        "device_type": "router",
        "template_name": "CiscoRouterStandard",
        "file": "cisco_router_golden.j2",
    },
    {
        "vendor": "Cisco",
        "device_type": "wlc",
        "template_name": "Cisco9800WLCStandard",
        "file": "cisco_wlc_golden.j2",
    },
]


async def seed_templates() -> None:
    await connect_db()
    db = get_db()

    for tmpl in SEED_TEMPLATES:
        file_path = TEMPLATES_DIR / tmpl["file"]
        content = file_path.read_text()
        parsed = parse_template_content(content)

        doc = {
            "vendor": tmpl["vendor"],
            "device_type": tmpl["device_type"],
            "template_name": tmpl["template_name"],
            "template_type": "jinja2",
            "template_content": content,
            "sections": parsed.sections,
        }

        await db.golden_templates.update_one(
            {
                "vendor": tmpl["vendor"],
                "device_type": tmpl["device_type"],
                "template_name": tmpl["template_name"],
            },
            {"$set": doc},
            upsert=True,
        )
        print(f"Seeded template: {tmpl['template_name']}")

    await close_db()
    print("Done seeding templates.")


if __name__ == "__main__":
    asyncio.run(seed_templates())
