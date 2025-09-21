import os
from typing import List

class Settings:
    PROJECT_NAME: str = "Eryzaa Compute Network"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS settings
    ALLOWED_HOSTS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"  # Allow all for development
    ]
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./eryzaa.db")
    
    # Blockchain
    AVALANCHE_RPC_URL: str = os.getenv("AVALANCHE_RPC_URL", "https://api.avax-test.network/ext/bc/C/rpc")
    PRIVATE_KEY: str = os.getenv("PRIVATE_KEY", "")
    
    # Server
    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8000"))

settings = Settings()
