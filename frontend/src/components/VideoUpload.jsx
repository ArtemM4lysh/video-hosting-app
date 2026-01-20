import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import videoService from '../services/video';
import './VideoUpload.css';

function VideoUpload({ onSuccess }) {
  const navigate = useNavigate();
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
      const fileExtension = file.name.split('.').pop();
      const { video_id, upload_url } = await videoService.createVideo({
        title,
        description,
        file_size: file.size,
        file_extension: fileExtension,
      });

      await videoService.uploadToS3(upload_url, file, setUploadProgress);

      await videoService.markUploadComplete(video_id);

      setTitle('');
      setDescription('');
      setFile(null);
      setUploadProgress(0);

      if (onSuccess) {
        onSuccess();
      }

      // Navigate to home page after successful upload
      setTimeout(() => {
        navigate('/home');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h2 className="upload-title">Upload Video</h2>
        <p className="upload-subtitle">Share your content with the world</p>

        <form onSubmit={handleUpload} className="upload-form">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Title *
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              placeholder="Enter video title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              placeholder="Tell viewers about your video"
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="video-file" className="form-label">
              Video File *
            </label>
            <div className="file-input-wrapper">
              <input
                id="video-file"
                type="file"
                accept="video/*"
                className="file-input"
                onChange={handleFileChange}
                disabled={uploading}
                required
              />
              <label htmlFor="video-file" className="file-input-label">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                {file ? 'Change file' : 'Choose video file'}
              </label>
            </div>
            {file && (
              <div className="file-info">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                <span>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>

          {uploading && (
            <div className="upload-progress-container">
              <div className="progress-bar-wrapper">
                <div
                  className="progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">{uploadProgress}%</span>
              <p className="progress-message">
                {uploadProgress < 100
                  ? 'Uploading your video...'
                  : 'Processing... Almost done!'}
              </p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="submit-button" disabled={uploading}>
            {uploading ? (
              <>
                <div className="button-spinner"></div>
                Uploading...
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Video
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default VideoUpload;
