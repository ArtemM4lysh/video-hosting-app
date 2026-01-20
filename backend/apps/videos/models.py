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
    hover_thumbnails = models.JSONField(default=list, blank=True)  # List of S3 keys for hover preview

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


class Subscription(models.Model):
    """User subscribing to another user's channel"""
    subscriber = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    channel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscribers'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('subscriber', 'channel')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subscriber.username} subscribed to {self.channel.username}"


class Like(models.Model):
    """User liking a video"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'video')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} liked {self.video.title}"


class Playlist(models.Model):
    """User-created playlists"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='playlists'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} by {self.user.username}"

    @property
    def video_count(self):
        return self.playlist_videos.count()


class PlaylistVideo(models.Model):
    """Videos in a playlist"""
    playlist = models.ForeignKey(
        Playlist,
        on_delete=models.CASCADE,
        related_name='playlist_videos'
    )
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='playlist_items'
    )
    position = models.IntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('playlist', 'video')
        ordering = ['position', '-added_at']

    def __str__(self):
        return f"{self.video.title} in {self.playlist.name}"


class WatchHistory(models.Model):
    """Track user's watch history"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='watch_history'
    )
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='watches'
    )
    watched_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'video')
        ordering = ['-watched_at']
        verbose_name_plural = 'Watch histories'

    def __str__(self):
        return f"{self.user.username} watched {self.video.title}"
