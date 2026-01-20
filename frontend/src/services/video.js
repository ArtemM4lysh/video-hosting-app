import api from './api';
import axios from 'axios';

export const videoService = {
  async createVideo(videoData) {
    const response = await api.post('/videos/', videoData);
    return response.data;
  },

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

  async markUploadComplete(videoId) {
    const response = await api.post(`/videos/${videoId}/upload_complete/`);
    return response.data;
  },

  async getVideos() {
    const response = await api.get('/videos/');
    return response.data;
  },

  async getAllVideos(page = 1, search = '') {
    const params = new URLSearchParams({ page });
    if (search) params.append('search', search);
    const response = await api.get(`/videos/?${params.toString()}`);
    return response.data;
  },

  async getMyVideos() {
    const response = await api.get('/videos/my_videos/');
    return response.data;
  },

  async getUserVideos(userId, page = 1) {
    const params = new URLSearchParams({ page, user_id: userId });
    const response = await api.get(`/videos/?${params.toString()}`);
    return response.data;
  },

  // Get single video
  async getVideo(videoId) {
    const response = await api.get(`/videos/${videoId}/`);
    return response.data;
  },

  async incrementView(videoId) {
    const response = await api.post(`/videos/${videoId}/increment_view/`);
    return response.data;
  },

  async deleteVideo(videoId) {
    const response = await api.delete(`/videos/${videoId}/delete_video/`);
    return response.data;
  },
};

export default videoService;
