import os
import shutil
import tempfile
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from bson import ObjectId

from database import uploads_collection, devices_collection, check_db_connection, logger
from models import UploadJobResponse, DeviceResponse, StatsResponse
from parser import process_upload_job

app = FastAPI(
    title="Network Configuration Processing System",
    description="FastAPI Backend for parsing Cisco/Juniper networking files",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure the uploads directory exists
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.on_event("startup")
async def startup_db_client():
    await check_db_connection()

@app.get("/api/health")
async def health_check():
    db_alive = await check_db_connection()
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "database": "connected" if db_alive else "disconnected"
    }

@app.post("/api/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_files(
    background_tasks: BackgroundTasks,
    folder_name: str = Form("configs"),
    files: List[UploadFile] = File(...)
):
    """
    Staged upload endpoint:
    1. Saves configuration files to disk.
    2. Instantly stores raw details (filepath, raw content) in MongoDB as 'pending'.
    3. Triggers background regex parser to analyze and segregate configs.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files were provided for upload."
        )

    # Pre-generate the job ObjectID and local path location
    job_id_obj = ObjectId()
    job_id = str(job_id_obj)
    job_folder = os.path.join(UPLOAD_DIR, job_id)

    # Create parent upload job doc (including folder_path location)
    job_doc = {
        "_id": job_id_obj,
        "folder_name": folder_name,
        "status": "pending",
        "files_count": len(files),
        "folder_path": job_folder,
        "error_message": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    try:
        await uploads_collection.insert_one(job_doc)
    except Exception as e:
        logger.error(f"Failed to create job metadata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database write failed."
        )

    # Save files locally and stage raw records in DB
    os.makedirs(job_folder, exist_ok=True)

    try:
        for file in files:
            clean_filename = os.path.basename(file.filename)
            file_path = os.path.join(job_folder, clean_filename)
            
            # Save raw file to disk
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Read configuration content
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_config = f.read()

            # Stage raw device in devices collection as 'pending'
            device_doc = {
                "upload_id": job_id,
                "device_name": os.path.splitext(clean_filename)[0],
                "device_type": "Pending Analysis",
                "configuration": raw_config,
                "status": "pending",
                "file_path": file_path,
                "error_message": None,
                "parsed_at": None,
                "parsed_data": None
            }
            await devices_collection.insert_one(device_doc)
                
    except Exception as e:
        logger.error(f"Failed to stage files for job {job_id}: {e}")
        if os.path.exists(job_folder):
            shutil.rmtree(job_folder)
        await uploads_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": "failed", "error_message": f"Staging failed: {e}", "updated_at": datetime.utcnow()}}
        )
        await devices_collection.delete_many({"upload_id": job_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stage uploaded files on backend."
        )

    # Trigger background tasks to parse the configuration contents
    background_tasks.add_task(process_upload_job, job_id, job_folder)

    return {
        "job_id": job_id,
        "folder_name": folder_name,
        "status": "pending",
        "files_count": len(files),
        "message": "Upload successful. Raw data staged. Processing starts in background."
    }

@app.get("/api/jobs", response_model=List[UploadJobResponse])
async def get_jobs():
    cursor = uploads_collection.find().sort("created_at", -1)
    jobs = await cursor.to_list(length=100)
    return jobs

@app.get("/api/devices", response_model=List[DeviceResponse])
async def get_devices(upload_id: Optional[str] = None):
    query = {}
    if upload_id:
        query["upload_id"] = upload_id
        
    cursor = devices_collection.find(query).sort("parsed_at", -1)
    devices = await cursor.to_list(length=200)
    return devices

@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    try:
        total_jobs = await uploads_collection.count_documents({})
        pending_jobs = await uploads_collection.count_documents({"status": "pending"})
        processing_jobs = await uploads_collection.count_documents({"status": "processing"})
        success_jobs = await uploads_collection.count_documents({"status": "success"})
        failed_jobs = await uploads_collection.count_documents({"status": "failed"})

        total_devices = await devices_collection.count_documents({})
        switches = await devices_collection.count_documents({"device_type": "Switch"})
        routers = await devices_collection.count_documents({"device_type": "Router"})
        firewalls = await devices_collection.count_documents({"device_type": "Firewall"})
        
        # Everything else (Access Points, Unknowns, Pending Analysis)
        unknowns = await devices_collection.count_documents({
            "device_type": {"$nin": ["Switch", "Router", "Firewall"]}
        })

        return {
            "total_jobs": total_jobs,
            "pending_jobs": pending_jobs + processing_jobs,
            "success_jobs": success_jobs,
            "failed_jobs": failed_jobs,
            "total_devices": total_devices,
            "switches_count": switches,
            "routers_count": routers,
            "firewalls_count": firewalls,
            "unknowns_count": unknowns
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system statistics."
        )

@app.delete("/api/jobs/{job_id}", status_code=status.HTTP_200_OK)
async def delete_job(job_id: str):
    """
    Deletes an upload job, local disk files, and staged/parsed devices from MongoDB.
    """
    try:
        # Delete job from uploads
        job_result = await uploads_collection.delete_one({"_id": ObjectId(job_id)})
        if job_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")

        # Delete related device documents
        await devices_collection.delete_many({"upload_id": job_id})

        # Remove local directory
        job_folder = os.path.join(UPLOAD_DIR, job_id)
        if os.path.exists(job_folder):
            shutil.rmtree(job_folder)

        return {"message": f"Job {job_id} and all staged data successfully deleted."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete job: {str(e)}"
        )

@app.get("/api/devices/{device_id}/download")
async def download_device_config(device_id: str):
    """
    Downloads a single configuration file.
    """
    try:
        device = await devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        file_path = device.get("file_path")
        if not file_path or not os.path.exists(file_path):
            # Fallback to direct text content download if the file is missing from local disk
            filename = f"{device.get('device_name', 'config')}.cfg"
            return Response(
                content=device.get("configuration", ""),
                media_type="application/octet-stream",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
            
        filename = os.path.basename(file_path)
        return FileResponse(path=file_path, filename=filename, media_type="application/octet-stream")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading configuration file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download configuration file: {str(e)}"
        )

@app.get("/api/jobs/{job_id}/download")
async def download_job_folder(job_id: str, background_tasks: BackgroundTasks):
    """
    Downloads the entire upload job folder zipped.
    """
    try:
        job = await uploads_collection.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise HTTPException(status_code=404, detail="Upload job not found")
        
        folder_path = job.get("folder_path")
        if not folder_path or not os.path.exists(folder_path):
            raise HTTPException(status_code=404, detail="Configuration directory not found on server")

        # Create a temporary ZIP file path using tempfile
        temp_dir = tempfile.gettempdir()
        zip_base_name = os.path.join(temp_dir, f"{job['folder_name']}_{job_id}")
        
        # shutil.make_archive creates <zip_base_name>.zip
        zip_filepath_created = shutil.make_archive(zip_base_name, 'zip', folder_path)

        def cleanup_temp_zip(file_path: str):
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Cleaned up temporary zip file: {file_path}")
            except Exception as e:
                logger.error(f"Error cleaning up temp zip: {e}")

        background_tasks.add_task(cleanup_temp_zip, zip_filepath_created)

        filename = f"{job['folder_name']}.zip"
        return FileResponse(
            path=zip_filepath_created,
            filename=filename,
            media_type="application/zip"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating zip archive: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create zip download: {str(e)}"
        )
