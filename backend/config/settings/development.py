from .base import *
import os
from dotenv import load_dotenv

load_dotenv()

DEBUG = True

SECRET_KEY = "123qwe123"

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:5175",
]
CORS_ALLOW_CREDENTIALS = True

# AWS S3 Configuration - Load from .env file
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-1')



DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

#STATIC_URL = "static/"
#MEDIA_URL = "media/"
