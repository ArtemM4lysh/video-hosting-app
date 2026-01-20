import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import subscriptionService from '../services/subscription';
import './Subscriptions.css';

const Subscriptions = () => {
  const navigate = useNavigate();
  const [subscribedVideos, setSubscribedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSubscribedVideos();
  }, []);

  const loadSubscribedVideos = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getSubscribedVideos();
      setSubscribedVideos(data);
    } catch (err) {
      console.error('Error loading subscribed videos:', err);
      setError('Failed to load subscribed videos');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (loading) {
    return (
      <div className="subscriptions-page">
        <div className="subscriptions-loading">
          <div className="spinner"></div>
          <p>Loading subscribed videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subscriptions-page">
        <div className="subscriptions-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="subscriptions-page">
      <div className="subscriptions-header">
        <h1>Subscriptions</h1>
      </div>

      {subscribedVideos.length === 0 ? (
        <div className="subscriptions-empty">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
            <polyline points="17 2 12 7 7 2"></polyline>
          </svg>
          <h2>No subscriptions yet</h2>
          <p>Subscribe to channels to see their latest videos here</p>
          <button className="browse-btn" onClick={() => navigate('/home')}>
            Discover Channels
          </button>
        </div>
      ) : (
        <div className="subscriptions-grid">
          {subscribedVideos.map((video) => (
            <div
              key={video.id}
              className="subscription-video-card"
              onClick={() => navigate(`/watch/${video.id}`)}
            >
              <div className="subscription-video-thumbnail">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} />
                ) : (
                  <div className="thumbnail-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                )}
                {video.duration && (
                  <span className="video-duration">
                    {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
              <div className="subscription-video-info">
                <h3 className="subscription-video-title">{video.title}</h3>
                <div className="subscription-video-meta">
                  <span className="video-channel" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/channel/${video.user.id}`);
                  }}>
                    {video.user.username}
                  </span>
                  <span className="video-stats">
                    {video.views_count.toLocaleString()} views • {formatDate(video.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
