from .base import *

DEBUG = True

SECRET_KEY = "123qwe123"

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True



DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

#STATIC_URL = "static/"
#MEDIA_URL = "media/"
