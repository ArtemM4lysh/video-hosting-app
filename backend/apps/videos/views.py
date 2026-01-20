from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import boto3
from django.conf import settings
from .models import Video
from .serializers import VideoSerializer, VideoCreateSerializer
import uuid


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can see all videos, but filter can be added
        return Video.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return VideoCreateSerializer
        return VideoSerializer

    def create(self, request):
        """
        Step 1: Create video metadata and generate presigned upload URL
        Frontend will use this URL to upload directly to S3
        """
        serializer = VideoCreateSerializer(data=request.data)
        if serializer.is_valid():
            # Generate unique S3 key
            file_extension = request.data.get('file_extension', 'mp4')
            s3_key = f"videos/{request.user.id}/{uuid.uuid4()}.{file_extension}"

            # Create video record
            video = serializer.save(
                user=request.user,
                s3_key=s3_key,
                status='processing'
            )

            # Generate presigned URL for upload
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
                ExpiresIn=3600  # URL expires in 1 hour
            )

            return Response({
                'video_id': video.id,
                'upload_url': presigned_url,
                's3_key': s3_key
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def upload_complete(self, request, pk=None):
        """
        Step 2: Mark upload as complete after frontend uploads to S3
        """
        video = self.get_object()

        if video.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        # Here you would typically:
        # 1. Verify the file exists in S3
        # 2. Extract video metadata (duration, resolution)
        # 3. Generate thumbnail
        # 4. Update status to 'ready'

        video.status = 'ready'
        video.save()

        serializer = VideoSerializer(video)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_videos(self, request):
        """Get videos uploaded by the current user"""
        videos = Video.objects.filter(user=request.user)
        serializer = VideoSerializer(videos, many=True)
        return Response(serializer.data)
