import api from './api';

const playlistService = {
    // Get all playlists (user's own + public playlists)
    getPlaylists: async () => {
        const response = await api.get('/playlists/');
        return response.data;
    },

    // Get user's playlists
    getMyPlaylists: async () => {
        const response = await api.get('/playlists/my_playlists/');
        return response.data;
    },

    // Get single playlist
    getPlaylist: async (playlistId) => {
        const response = await api.get(`/playlists/${playlistId}/`);
        return response.data;
    },

    // Create new playlist
    createPlaylist: async (data) => {
        const response = await api.post('/playlists/', data);
        return response.data;
    },

    // Update playlist
    updatePlaylist: async (playlistId, data) => {
        const response = await api.patch(`/playlists/${playlistId}/`, data);
        return response.data;
    },

    // Delete playlist
    deletePlaylist: async (playlistId) => {
        const response = await api.delete(`/playlists/${playlistId}/`);
        return response.data;
    },

    // Add video to playlist
    addVideoToPlaylist: async (playlistId, videoId) => {
        const response = await api.post(`/playlists/${playlistId}/add_video/`, {
            video_id: videoId
        });
        return response.data;
    },

    // Remove video from playlist
    removeVideoFromPlaylist: async (playlistId, videoId) => {
        const response = await api.post(`/playlists/${playlistId}/remove_video/`, {
            video_id: videoId
        });
        return response.data;
    }
};

export default playlistService;
