import { useState } from 'react';
import { videoService } from '../services/video';

function VideoUpload({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid video file');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file || !title) {
      setError('Please provide title and select a video file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Step 1: Create video metadata and get presigned URL
      const fileExtension = file.name.split('.').pop();
      const { video_id, upload_url } = await videoService.createVideo({
        title,
        description,
        file_size: file.size,
        file_extension: fileExtension,
      });

      // Step 2: Upload directly to S3
      await videoService.uploadToS3(upload_url, file, setUploadProgress);

      // Step 3: Notify backend that upload is complete
      await videoService.markUploadComplete(video_id);

      alert('Video uploaded successfully!');

      // Reset form
      setTitle('');
      setDescription('');
      setFile(null);
      setUploadProgress(0);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="video-upload">
      <h2>Upload Video</h2>
      <form onSubmit={handleUpload}>
        <div>
          <label>Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={uploading}
          />
        </div>

        <div>
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
          />
        </div>

        <div>
          <label>Video File:</label>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={uploading}
            required
          />
        </div>

        {file && <p>Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}

        {uploading && (
          <div className="upload-progress">
            <progress value={uploadProgress} max="100" />
            <span>{uploadProgress}%</span>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  );
}

export default VideoUpload;
