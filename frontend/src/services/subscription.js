import api from './api';

const subscriptionService = {
    // Subscribe to a channel
    subscribe: async (channelId) => {
        const response = await api.post('/subscriptions/subscribe/', {
            channel_id: channelId
        });
        return response.data;
    },

    // Unsubscribe from a channel
    unsubscribe: async (channelId) => {
        const response = await api.post('/subscriptions/unsubscribe/', {
            channel_id: channelId
        });
        return response.data;
    },

    // Get user's subscriptions
    getMySubscriptions: async () => {
        const response = await api.get('/subscriptions/my_subscriptions/');
        return response.data;
    },

    // Check if subscribed to a channel
    checkSubscription: async (channelId) => {
        const response = await api.get('/subscriptions/check/', {
            params: { channel_id: channelId }
        });
        return response.data;
    },

    // Get videos from subscribed channels
    getSubscribedVideos: async () => {
        const response = await api.get('/subscriptions/subscribed_videos/');
        return response.data;
    }
};

export default subscriptionService;
