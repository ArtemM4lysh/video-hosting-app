import api from './api';
import axios from 'axios';

export const videoService = {
  // Step 1: Get presigned upload URL
  async createVideo(videoData) {
    const response = await api.post('/videos/', videoData);
    return response.data;
  },

  // Step 2: Upload video directly to S3 using presigned URL
  async uploadToS3(presignedUrl, file, onProgress) {
    return axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        if (onProgress) onProgress(percentCompleted);
      },
    });
  },

  // Step 3: Notify backend that upload is complete
  async markUploadComplete(videoId) {
    const response = await api.post(`/videos/${videoId}/upload_complete/`);
    return response.data;
  },

  // Get all videos
  async getVideos() {
    const response = await api.get('/videos/');
    return response.data;
  },

  // Get user's videos
  async getMyVideos() {
    const response = await api.get('/videos/my_videos/');
    return response.data;
  },

  // Get single video
  async getVideo(videoId) {
    const response = await api.get(`/videos/${videoId}/`);
    return response.data;
  },
};
