import api from './api';

const watchHistoryService = {
    // Track a video watch
    trackWatch: async (videoId) => {
        const response = await api.post('/watch-history/track/', {
            video_id: videoId
        });
        return response.data;
    },

    // Get user's watch history
    getMyHistory: async (limit = 20) => {
        const response = await api.get('/watch-history/my_history/', {
            params: { limit }
        });
        return response.data;
    },

    // Clear watch history
    clearHistory: async () => {
        const response = await api.delete('/watch-history/clear/');
        return response.data;
    }
};

export default watchHistoryService;
