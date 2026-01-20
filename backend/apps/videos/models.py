from django.db import models
from django.conf import settings
import uuid


class Video(models.Model):
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='videos')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # S3 storage paths
    s3_key = models.CharField(max_length=500)  # Raw video file path in S3
    thumbnail_s3_key = models.CharField(max_length=500, blank=True, null=True)

    # Video metadata
    duration = models.IntegerField(null=True, blank=True)  # in seconds
    file_size = models.BigIntegerField()  # in bytes
    resolution = models.CharField(max_length=20, blank=True)  # e.g., "1920x1080"

    # Status and engagement
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    views_count = models.IntegerField(default=0)
    likes_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} by {self.user.username}"
