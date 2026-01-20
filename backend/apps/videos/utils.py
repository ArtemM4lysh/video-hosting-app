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


def generate_hover_thumbnails_from_s3(video_s3_key, user_id, video_id):
    """
    Generate thumbnails at 5-second intervals for hover preview
    Returns list of S3 keys for generated thumbnails
    """
    s3_client = boto3.client(
        's3',
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
    )

    video_path = None
    thumbnail_s3_keys = []

    try:
        # Create temporary file for video
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as video_temp:
            video_path = video_temp.name

        # Download video from S3
        s3_client.download_file(
            settings.AWS_STORAGE_BUCKET_NAME,
            video_s3_key,
            video_path
        )

        # Get video duration
        probe = ffmpeg.probe(video_path)
        duration = float(probe['format']['duration'])

        # Generate thumbnails every 5 seconds
        interval = 5
        timestamps = []
        current_time = 0

        while current_time < duration:
            timestamps.append(current_time)
            current_time += interval

        # Generate a thumbnail for each timestamp
        for idx, timestamp in enumerate(timestamps):
            thumb_path = None
            try:
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as thumb_temp:
                    thumb_path = thumb_temp.name

                # Extract thumbnail at specific timestamp
                (
                    ffmpeg
                    .input(video_path, ss=timestamp)
                    .filter('scale', 640, -1)
                    .output(thumb_path, vframes=1, format='image2', vcodec='mjpeg')
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True, quiet=True)
                )

                # Upload to S3
                thumbnail_s3_key = f"thumbnails/hover/{user_id}/{video_id}_{idx}.jpg"
                with open(thumb_path, 'rb') as thumb_file:
                    s3_client.upload_fileobj(
                        thumb_file,
                        settings.AWS_STORAGE_BUCKET_NAME,
                        thumbnail_s3_key,
                        ExtraArgs={'ContentType': 'image/jpeg'}
                    )

                thumbnail_s3_keys.append(thumbnail_s3_key)

                # Cleanup thumbnail temp file
                os.unlink(thumb_path)

            except Exception as e:
                print(f"Error generating thumbnail at {timestamp}s: {e}")
                if thumb_path and os.path.exists(thumb_path):
                    os.unlink(thumb_path)
                continue

        # Cleanup video temp file
        if video_path and os.path.exists(video_path):
            os.unlink(video_path)

        return thumbnail_s3_keys

    except Exception as e:
        print(f"Error generating hover thumbnails: {e}")
        if video_path and os.path.exists(video_path):
            try:
                os.unlink(video_path)
            except:
                pass
        return []
