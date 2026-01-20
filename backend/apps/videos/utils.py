import boto3
import ffmpeg
import tempfile
import os
from django.conf import settings
from io import BytesIO


def generate_thumbnail_from_s3(video_s3_key, thumbnail_s3_key):
    """
    Download video from S3, extract thumbnail using FFmpeg, upload back to S3
    Returns True if successful, False otherwise
    """
    s3_client = boto3.client(
        's3',
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )

    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as video_temp:
            video_path = video_temp.name

        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as thumb_temp:
            thumb_path = thumb_temp.name

        # Download video from S3
        s3_client.download_file(
            settings.AWS_STORAGE_BUCKET_NAME,
            video_s3_key,
            video_path
        )

        # Extract thumbnail at 1 second mark using FFmpeg
        (
            ffmpeg
            .input(video_path, ss=1)
            .filter('scale', 640, -1)
            .output(thumb_path, vframes=1, format='image2', vcodec='mjpeg')
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )

        # Upload thumbnail to S3
        with open(thumb_path, 'rb') as thumb_file:
            s3_client.upload_fileobj(
                thumb_file,
                settings.AWS_STORAGE_BUCKET_NAME,
                thumbnail_s3_key,
                ExtraArgs={'ContentType': 'image/jpeg'}
            )

        # Cleanup temp files
        os.unlink(video_path)
        os.unlink(thumb_path)

        return True

    except Exception as e:
        print(f"Error generating thumbnail: {e}")
        # Cleanup temp files on error
        try:
            if os.path.exists(video_path):
                os.unlink(video_path)
            if os.path.exists(thumb_path):
                os.unlink(thumb_path)
        except:
            pass
        return False


def get_video_metadata(video_s3_key):
    """
    Download video from S3 and extract metadata (duration, resolution)
    Returns dict with duration (seconds) and resolution (string)
    """
    s3_client = boto3.client(
        's3',
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )

    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as video_temp:
            video_path = video_temp.name

        # Download video from S3
        s3_client.download_file(
            settings.AWS_STORAGE_BUCKET_NAME,
            video_s3_key,
            video_path
        )

        # Get video metadata using FFmpeg probe
        probe = ffmpeg.probe(video_path)
        video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')

        duration = float(probe['format']['duration'])
        width = int(video_info['width'])
        height = int(video_info['height'])
        resolution = f"{width}x{height}"

        # Cleanup
        os.unlink(video_path)

        return {
            'duration': int(duration),
            'resolution': resolution
        }

    except Exception as e:
        print(f"Error extracting video metadata: {e}")
        try:
            if os.path.exists(video_path):
                os.unlink(video_path)
        except:
            pass
        return None
