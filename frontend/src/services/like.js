import api from './api';

const likeService = {
    // Toggle like on a video (like if not liked, unlike if liked)
    toggleLike: async (videoId) => {
        const response = await api.post('/likes/toggle/', {
            video_id: videoId
        });
        return response.data;
    },

    // Check if user has liked a video
    checkLike: async (videoId) => {
        const response = await api.get('/likes/check/', {
            params: { video_id: videoId }
        });
        return response.data;
    },

    // Get all videos liked by user
    getMyLikes: async () => {
        const response = await api.get('/likes/my_likes/');
        return response.data;
    }
};

export default likeService;
