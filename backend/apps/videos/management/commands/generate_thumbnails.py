from django.core.management.base import BaseCommand
from apps.videos.models import Video
from apps.videos.utils import generate_thumbnail_from_s3, get_video_metadata
import uuid


class Command(BaseCommand):
    help = 'Generate thumbnails for videos that do not have one'

    def add_arguments(self, parser):
        parser.add_argument(
            '--video-id',
            type=str,
            help='Generate thumbnail for specific video ID',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Regenerate thumbnails even if they exist',
        )

    def handle(self, *args, **options):
        video_id = options.get('video_id')
        force = options.get('force', False)

        if video_id:
            # Process single video
            try:
                video = Video.objects.get(id=video_id)
                self.process_video(video, force)
            except Video.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Video with ID {video_id} not found'))
        else:
            # Process all videos without thumbnails
            if force:
                videos = Video.objects.filter(status='ready')
                self.stdout.write(f'Processing {videos.count()} videos (force mode)...')
            else:
                videos = Video.objects.filter(status='ready', thumbnail_s3_key__isnull=True)
                self.stdout.write(f'Processing {videos.count()} videos without thumbnails...')

            for video in videos:
                self.process_video(video, force)

        self.stdout.write(self.style.SUCCESS('Done!'))

    def process_video(self, video, force=False):
        if not force and video.thumbnail_s3_key:
            self.stdout.write(f'Skipping {video.title} - already has thumbnail')
            return

        self.stdout.write(f'Processing video: {video.title} (ID: {video.id})')

        # Generate thumbnail S3 key
        thumbnail_key = f"thumbnails/{video.user.id}/{uuid.uuid4()}.jpg"

        # Generate thumbnail
        success = generate_thumbnail_from_s3(video.s3_key, thumbnail_key)

        if success:
            video.thumbnail_s3_key = thumbnail_key

            # Also extract video metadata if not present
            if not video.duration or not video.resolution:
                metadata = get_video_metadata(video.s3_key)
                if metadata:
                    video.duration = metadata.get('duration')
                    video.resolution = metadata.get('resolution')

            video.save()
            self.stdout.write(self.style.SUCCESS(f'✓ Generated thumbnail for: {video.title}'))
        else:
            self.stdout.write(self.style.ERROR(f'✗ Failed to generate thumbnail for: {video.title}'))
