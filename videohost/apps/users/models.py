from django.contrib.auth.models import AbstractUser
from django.db import models

# Use AbstractUser instead of Django's default user model to change the auth-required field to email instead of username
class User(AbstractUser):
    email = models.EmailField(unique=True)
    profile_picture = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True, max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    subscriber_count = models.IntegerField(default=0)

    # Use email as the login identifier
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email
