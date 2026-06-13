from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "network_config_db"
    # upload_dir: str = "/tmp/network_audit_uploads"
    # cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()



# # Fetch MongoDB details from environment variables or use defaults
# MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
# DATABASE_NAME = os.getenv("DATABASE_NAME", "network_config_db")

# logger.info(f"Connecting to MongoDB at: {MONGODB_URL}")