from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.pagination import PageNumberPagination
import boto3
from django.conf import settings
from django.db.models import Q
from .models import Video, Subscription, Like, Playlist, PlaylistVideo, WatchHistory
from .serializers import (VideoSerializer, VideoCreateSerializer,
                         SubscriptionSerializer, LikeSerializer,
                         PlaylistSerializer, PlaylistCreateSerializer,
                         PlaylistVideoSerializer, WatchHistorySerializer)
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class VideoPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = VideoPagination

    def get_queryset(self):
        # For list actions, only show ready videos
        if self.action == 'list':
            queryset = Video.objects.filter(status='ready').select_related('user').order_by('-views_count', '-created_at')
        else:
            # For detail actions (retrieve, update, delete, custom actions), show all videos
            queryset = Video.objects.all().select_related('user')

        # Search functionality
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(user__username__icontains=search_query)
            )

        # Filter by user for channel page
        user_id = self.request.query_params.get('user_id', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return VideoCreateSerializer
        return VideoSerializer

    def create(self, request):
        serializer = VideoCreateSerializer(data=request.data)
        if serializer.is_valid():
            file_extension = request.data.get('file_extension', 'mp4')
            s3_key = f"videos/{request.user.id}/{uuid.uuid4()}.{file_extension}"

            video = serializer.save(
                user=request.user,
                s3_key=s3_key,
                status='processing'
            )

            s3_client = boto3.client(
                's3',
                region_name=settings.AWS_S3_REGION_NAME,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )

            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': s3_key,
                    'ContentType': 'video/mp4'
                },
                ExpiresIn=3600
            )

            return Response({
                'video_id': video.id,
                'upload_url': presigned_url,
                's3_key': s3_key
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upload_complete(self, request, pk=None):
        video = self.get_object()

        if video.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        video.status = 'ready'
        video.save()

        # TODO: Trigger thumbnail generation task here
        # This would be done asynchronously with Celery + FFmpeg
        # For now, we'll handle it in a separate endpoint or background task

        serializer = VideoSerializer(video)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_videos(self, request):
        videos = Video.objects.filter(user=request.user).order_by('-created_at')
        page = self.paginate_queryset(videos)
        if page is not None:
            serializer = VideoSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = VideoSerializer(videos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def increment_view(self, request, pk=None):
        """Increment view count when video is played and track in watch history"""
        video = self.get_object()
        video.views_count += 1
        video.save(update_fields=['views_count'])

        # Track in watch history if user is authenticated
        if request.user.is_authenticated:
            WatchHistory.objects.update_or_create(
                user=request.user,
                video=video
            )

        return Response({'views_count': video.views_count})

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def delete_video(self, request, pk=None):
        """Delete video and its S3 file"""
        video = self.get_object()

        if video.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        # Delete from S3
        try:
            s3_client = boto3.client(
                's3',
                region_name=settings.AWS_S3_REGION_NAME,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
            s3_client.delete_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=video.s3_key
            )
            # Delete thumbnail if exists
            if video.thumbnail_s3_key:
                s3_client.delete_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=video.thumbnail_s3_key
                )
        except Exception as e:
            print(f"Error deleting from S3: {e}")

        # Delete from database
        video.delete()
        return Response({'message': 'Video deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


class SubscriptionViewSet(viewsets.ViewSet):
    """Handle subscriptions to channels"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def subscribe(self, request):
        """Subscribe to a channel"""
        channel_id = request.data.get('channel_id')

        if not channel_id:
            return Response({'error': 'channel_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        if str(channel_id) == str(request.user.id):
            return Response({'error': 'Cannot subscribe to yourself'}, status=status.HTTP_400_BAD_REQUEST)

        channel = get_object_or_404(User, id=channel_id)

        subscription, created = Subscription.objects.get_or_create(
            subscriber=request.user,
            channel=channel
        )

        if created:
            # Update subscriber count
            channel.subscriber_count += 1
            channel.save(update_fields=['subscriber_count'])

        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def unsubscribe(self, request):
        """Unsubscribe from a channel"""
        channel_id = request.data.get('channel_id')

        if not channel_id:
            return Response({'error': 'channel_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        channel = get_object_or_404(User, id=channel_id)

        try:
            subscription = Subscription.objects.get(
                subscriber=request.user,
                channel=channel
            )
            subscription.delete()

            # Update subscriber count
            if channel.subscriber_count > 0:
                channel.subscriber_count -= 1
                channel.save(update_fields=['subscriber_count'])

            return Response({'message': 'Unsubscribed successfully'}, status=status.HTTP_200_OK)
        except Subscription.DoesNotExist:
            return Response({'error': 'Not subscribed'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def my_subscriptions(self, request):
        """Get list of channels user is subscribed to"""
        subscriptions = Subscription.objects.filter(
            subscriber=request.user
        ).select_related('channel')
        serializer = SubscriptionSerializer(subscriptions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def check(self, request):
        """Check if user is subscribed to a channel"""
        channel_id = request.query_params.get('channel_id')

        if not channel_id:
            return Response({'error': 'channel_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        is_subscribed = Subscription.objects.filter(
            subscriber=request.user,
            channel_id=channel_id
        ).exists()

        return Response({'is_subscribed': is_subscribed})

    @action(detail=False, methods=['get'])
    def subscribed_videos(self, request):
        """Get latest videos from subscribed channels"""
        subscriptions = Subscription.objects.filter(
            subscriber=request.user
        ).values_list('channel_id', flat=True)

        videos = Video.objects.filter(
            user_id__in=subscriptions,
            status='ready'
        ).select_related('user').order_by('-created_at')

        serializer = VideoSerializer(videos, many=True)
        return Response(serializer.data)


class LikeViewSet(viewsets.ViewSet):
    """Handle video likes"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Like or unlike a video"""
        video_id = request.data.get('video_id')

        if not video_id:
            return Response({'error': 'video_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        video = get_object_or_404(Video, id=video_id)

        try:
            like = Like.objects.get(user=request.user, video=video)
            like.delete()

            # Update like count
            if video.likes_count > 0:
                video.likes_count -= 1
                video.save(update_fields=['likes_count'])

            return Response({'liked': False, 'likes_count': video.likes_count})
        except Like.DoesNotExist:
            Like.objects.create(user=request.user, video=video)

            # Update like count
            video.likes_count += 1
            video.save(update_fields=['likes_count'])

            return Response({'liked': True, 'likes_count': video.likes_count}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def check(self, request):
        """Check if user has liked a video"""
        video_id = request.query_params.get('video_id')

        if not video_id:
            return Response({'error': 'video_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        is_liked = Like.objects.filter(
            user=request.user,
            video_id=video_id
        ).exists()

        return Response({'is_liked': is_liked})

    @action(detail=False, methods=['get'])
    def my_likes(self, request):
        """Get all videos liked by the user"""
        likes = Like.objects.filter(
            user=request.user
        ).select_related('video', 'video__user')
        serializer = LikeSerializer(likes, many=True)
        return Response(serializer.data)


class PlaylistViewSet(viewsets.ModelViewSet):
    """Handle playlists"""
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Show user's own playlists + public playlists from others
        return Playlist.objects.filter(
            Q(user=self.request.user) | Q(is_public=True)
        ).select_related('user').prefetch_related('playlist_videos__video__user')

    def get_serializer_class(self):
        if self.action == 'create':
            return PlaylistCreateSerializer
        return PlaylistSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_playlists(self, request):
        """Get user's playlists"""
        playlists = Playlist.objects.filter(user=request.user)
        serializer = PlaylistSerializer(playlists, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_video(self, request, pk=None):
        """Add a video to playlist"""
        playlist = self.get_object()

        if playlist.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        video_id = request.data.get('video_id')
        if not video_id:
            return Response({'error': 'video_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        video = get_object_or_404(Video, id=video_id)

        # Get max position
        max_position = PlaylistVideo.objects.filter(playlist=playlist).count()

        playlist_video, created = PlaylistVideo.objects.get_or_create(
            playlist=playlist,
            video=video,
            defaults={'position': max_position}
        )

        if not created:
            return Response({'error': 'Video already in playlist'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PlaylistVideoSerializer(playlist_video)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def remove_video(self, request, pk=None):
        """Remove a video from playlist"""
        playlist = self.get_object()

        if playlist.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        video_id = request.data.get('video_id')
        if not video_id:
            return Response({'error': 'video_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            playlist_video = PlaylistVideo.objects.get(
                playlist=playlist,
                video_id=video_id
            )
            playlist_video.delete()
            return Response({'message': 'Video removed from playlist'}, status=status.HTTP_200_OK)
        except PlaylistVideo.DoesNotExist:
            return Response({'error': 'Video not in playlist'}, status=status.HTTP_404_NOT_FOUND)


class WatchHistoryViewSet(viewsets.ViewSet):
    """Handle watch history"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def track(self, request):
        """Track a video watch"""
        video_id = request.data.get('video_id')

        if not video_id:
            return Response({'error': 'video_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        video = get_object_or_404(Video, id=video_id)

        watch_history, created = WatchHistory.objects.update_or_create(
            user=request.user,
            video=video
        )

        serializer = WatchHistorySerializer(watch_history)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def my_history(self, request):
        """Get user's watch history"""
        limit = int(request.query_params.get('limit', 20))

        history = WatchHistory.objects.filter(
            user=request.user
        ).select_related('video', 'video__user').order_by('-watched_at')[:limit]

        serializer = WatchHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """Clear watch history"""
        WatchHistory.objects.filter(user=request.user).delete()
        return Response({'message': 'Watch history cleared'}, status=status.HTTP_200_OK)
