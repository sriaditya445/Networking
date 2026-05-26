import os
import re
from datetime import datetime
from bson import ObjectId
from database import uploads_collection, devices_collection, logger

# Regular expression templates for configuration analysis and segregation
HOSTNAME_REGEX = re.compile(r"^\s*hostname\s+([a-zA-Z0-9-_]+)", re.IGNORECASE | re.MULTILINE)
INTERFACE_REGEX = re.compile(r"^\s*interface\s+(\S+)", re.IGNORECASE | re.MULTILINE)
IP_REGEX = re.compile(r"^\s*ip address\s+([0-9.]+)\s+([0-9.]+)", re.IGNORECASE | re.MULTILINE)
VLAN_REGEX = re.compile(r"switchport access vlan\s+(\d+)", re.IGNORECASE)
STATIC_ROUTE_REGEX = re.compile(r"^\s*ip route\s+([0-9.]+)\s+([0-9.]+)\s+(\S+)", re.IGNORECASE | re.MULTILINE)

def parse_config_and_segregate(content: str, filename: str) -> tuple[str, str, dict]:
    """
    Parses configuration text using regex templates to extract the hostname,
    segregate it into a component type, and gather sub-component specifications.
    """
    # 1. Extract Hostname
    match = HOSTNAME_REGEX.search(content)
    if match:
        hostname = match.group(1)
    else:
        hostname = os.path.splitext(filename)[0]
        logger.info(f"No hostname found in {filename}, falling back to base name: {hostname}")

    # 2. Identify Device Type (Segregation Template Matching)
    content_lower = content.lower()
    if "switchport" in content_lower or "vlan" in content_lower:
        device_type = "Switch"
    elif "router ospf" in content_lower or "router bgp" in content_lower or "router rip" in content_lower:
        device_type = "Router"
    elif "firewall" in content_lower or "security-level" in content_lower or "access-group" in content_lower:
        device_type = "Firewall"
    elif "wlan" in content_lower or "ap name" in content_lower:
        device_type = "AccessPoint"
    else:
        device_type = "Unknown"

    # 3. Segregate detailed sub-configuration items using Regex
    interfaces = INTERFACE_REGEX.findall(content)
    
    # Extract IP configuration tuples (IP, Netmask)
    ips = []
    for m in IP_REGEX.finditer(content):
        ips.append(f"Interface IP: {m.group(1)} Mask: {m.group(2)}")

    # Extract unique VLANs
    vlans = sorted(list(set(VLAN_REGEX.findall(content))))

    # Identify active routing protocols
    protocols = []
    if "router ospf" in content_lower:
        protocols.append("OSPF")
    if "router bgp" in content_lower:
        protocols.append("BGP")
    if "router rip" in content_lower:
        protocols.append("RIP")
    if "ip route" in content_lower:
        static_routes = STATIC_ROUTE_REGEX.findall(content)
        if static_routes:
            protocols.append(f"Static Route ({len(static_routes)} configured)")
        else:
            protocols.append("Static Route")

    # Combine into a structured dict
    parsed_data = {
        "interfaces": interfaces[:15],  # Limit list to first 15 for display
        "interfaces_count": len(interfaces),
        "ips": ips,
        "vlans": vlans,
        "protocols": protocols
    }

    return hostname, device_type, parsed_data

async def process_upload_job(upload_id_str: str, folder_path: str):
    """
    Asynchronous background task. It retrieves pre-stored pending devices from MongoDB,
    reads their stored configs, applies regex templates to parse/segregate them,
    and updates their status in the database.
    """
    logger.info(f"Starting background staging & parser for job: {upload_id_str}")
    upload_id = ObjectId(upload_id_str)
    
    # Update parent job status to processing
    await uploads_collection.update_one(
        {"_id": upload_id},
        {"$set": {"status": "processing", "updated_at": datetime.utcnow()}}
    )

    try:
        # Retrieve all pending devices pre-stored in MongoDB during upload stage
        cursor = devices_collection.find({"upload_id": upload_id_str, "status": "pending"})
        pending_devices = await cursor.to_list(length=1000)

        if not pending_devices:
            # Fallback check: If database is empty but files exist, populate them first
            # (Ensures compatibility with any partial upload states)
            logger.warning(f"No pending device records found in DB for job {upload_id_str}. Check upload step.")
            raise ValueError("No staged device records found in database.")

        success_count = 0
        failed_count = 0

        for device in pending_devices:
            device_id = device["_id"]
            file_path = device["file_path"]
            file_name = os.path.basename(file_path)
            
            logger.info(f"Processing staged file from DB: {file_path}")
            
            try:
                # 1. Fetch raw configuration (read from file if empty in database)
                config_content = device.get("configuration", "")
                if not config_content and os.path.exists(file_path):
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        config_content = f.read()
                
                if not config_content:
                    raise ValueError("Configuration content is empty or file missing.")

                # 2. Segregate configuration details via Regex template matching
                device_name, device_type, parsed_data = parse_config_and_segregate(config_content, file_name)

                # 3. Update the device record in MongoDB with parsed properties
                await devices_collection.update_one(
                    {"_id": device_id},
                    {
                        "$set": {
                            "device_name": device_name,
                            "device_type": device_type,
                            "configuration": config_content,
                            "status": "success",
                            "parsed_at": datetime.utcnow(),
                            "parsed_data": parsed_data,
                            "error_message": None
                        }
                    }
                )
                success_count += 1

            except Exception as file_err:
                logger.error(f"Error parsing staged device {device_id}: {file_err}")
                await devices_collection.update_one(
                    {"_id": device_id},
                    {
                        "$set": {
                            "status": "failed",
                            "error_message": str(file_err),
                            "parsed_at": datetime.utcnow()
                        }
                    }
                )
                failed_count += 1

        # Update overall job status
        final_status = "success" if success_count > 0 else "failed"
        error_msg = None if success_count > 0 else "All configuration files failed to parse during analysis."

        await uploads_collection.update_one(
            {"_id": upload_id},
            {
                "$set": {
                    "status": final_status,
                    "error_message": error_msg,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        logger.info(f"Staged background run completed for {upload_id_str}. Status: {final_status} (Successes: {success_count}, Failures: {failed_count})")

    except Exception as e:
        logger.error(f"Critical error in job background run {upload_id_str}: {e}")
        await uploads_collection.update_one(
            {"_id": upload_id},
            {
                "$set": {
                    "status": "failed",
                    "error_message": str(e),
                    "updated_at": datetime.utcnow()
                }
            }
        )
