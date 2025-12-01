from .base import *

DEBUG = True

SECRET_KEY = "YOUR-INSECURE-DEV-KEY"

ALLOWED_HOSTS = ["*"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

#STATIC_URL = "static/"
#MEDIA_URL = "media/"
