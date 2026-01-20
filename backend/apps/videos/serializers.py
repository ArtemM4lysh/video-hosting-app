from rest_framework import serializers
from .models import Video, Subscription, Like, Playlist, PlaylistVideo, WatchHistory
from ..users.serializers import UserSerializer


class VideoSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    upload_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Video
        fields = [
            'id', 'user', 'title', 'description', 's3_key', 'thumbnail_s3_key',
            'duration', 'file_size', 'resolution', 'status',
            'views_count', 'likes_count', 'created_at', 'updated_at',
            'upload_url', 'video_url', 'thumbnail_url'
        ]
        read_only_fields = ['id', 'user', 's3_key', 'thumbnail_s3_key', 'status', 'views_count', 'likes_count', 'created_at', 'updated_at']

    def get_upload_url(self, obj):
        # Return presigned URL for uploading (will be generated in view)
        return None

    def get_video_url(self, obj):
        # Return presigned URL for viewing
        if obj.status == 'ready':
            import boto3
            from django.conf import settings
            s3_client = boto3.client('s3', region_name=settings.AWS_S3_REGION_NAME)
            return s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': obj.s3_key},
                ExpiresIn=3600  # URL expires in 1 hour
            )
        return None

    def get_thumbnail_url(self, obj):
        # Return presigned URL for thumbnail
        if obj.thumbnail_s3_key:
            import boto3
            from django.conf import settings
            s3_client = boto3.client('s3', region_name=settings.AWS_S3_REGION_NAME)
            return s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': obj.thumbnail_s3_key},
                ExpiresIn=3600
            )
        return None


class VideoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = ['title', 'description', 'file_size']


class SubscriptionSerializer(serializers.ModelSerializer):
    subscriber = UserSerializer(read_only=True)
    channel = UserSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = ['id', 'subscriber', 'channel', 'created_at']
        read_only_fields = ['id', 'created_at']


class LikeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    video = VideoSerializer(read_only=True)

    class Meta:
        model = Like
        fields = ['id', 'user', 'video', 'created_at']
        read_only_fields = ['id', 'created_at']


class PlaylistVideoSerializer(serializers.ModelSerializer):
    video = VideoSerializer(read_only=True)

    class Meta:
        model = PlaylistVideo
        fields = ['id', 'video', 'position', 'added_at']
        read_only_fields = ['id', 'added_at']


class PlaylistSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    playlist_videos = PlaylistVideoSerializer(many=True, read_only=True)
    video_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Playlist
        fields = ['id', 'user', 'name', 'description', 'is_public', 'video_count', 'playlist_videos', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class PlaylistCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Playlist
        fields = ['name', 'description', 'is_public']


class WatchHistorySerializer(serializers.ModelSerializer):
    video = VideoSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = WatchHistory
        fields = ['id', 'user', 'video', 'watched_at']
        read_only_fields = ['id', 'watched_at']
