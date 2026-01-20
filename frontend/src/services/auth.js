import api from './api';

const authService = {
  async register(userData) {
    const response = await api.post('/auth/register/', userData);
    const tokens = response.data.tokens;
    if (tokens && tokens.access && tokens.refresh) {
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/auth/login/', { email, password });
    const tokens = response.data.tokens;
    if (tokens && tokens.access && tokens.refresh) {
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken,
      });

      if (response.data.access) {
        localStorage.setItem('accessToken', response.data.access);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },

  getAccessToken() {
    return localStorage.getItem('accessToken');
  },
};

export default authService;
