from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.pagination import PageNumberPagination
import boto3
from django.conf import settings
from django.db.models import Q
from .models import Video
from .serializers import VideoSerializer, VideoCreateSerializer
import uuid


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
        """Increment view count when video is played"""
        video = self.get_object()
        video.views_count += 1
        video.save(update_fields=['views_count'])
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
