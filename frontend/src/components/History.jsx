import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import watchHistoryService from '../services/watchHistory';
import './History.css';

const History = () => {
  const navigate = useNavigate();
  const [watchHistory, setWatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await watchHistoryService.getMyHistory(100);
      setWatchHistory(data);
    } catch (err) {
      console.error('Error loading watch history:', err);
      setError('Failed to load watch history');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your entire watch history?')) {
      return;
    }

    try {
      await watchHistoryService.clearHistory();
      setWatchHistory([]);
    } catch (err) {
      console.error('Error clearing history:', err);
      alert('Failed to clear history');
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
      <div className="history-page">
        <div className="history-loading">
          <div className="spinner"></div>
          <p>Loading watch history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-page">
        <div className="history-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Watch History</h1>
        {watchHistory.length > 0 && (
          <button className="clear-history-btn" onClick={handleClearHistory}>
            Clear All History
          </button>
        )}
      </div>

      {watchHistory.length === 0 ? (
        <div className="history-empty">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <h2>No watch history yet</h2>
          <p>Videos you watch will appear here</p>
          <button className="browse-btn" onClick={() => navigate('/home')}>
            Browse Videos
          </button>
        </div>
      ) : (
        <div className="history-grid">
          {watchHistory.map((item) => (
            <div
              key={item.id}
              className="history-video-card"
              onClick={() => navigate(`/watch/${item.video.id}`)}
            >
              <div className="history-video-thumbnail">
                {item.video.thumbnail_url ? (
                  <img src={item.video.thumbnail_url} alt={item.video.title} />
                ) : (
                  <div className="thumbnail-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                )}
                {item.video.duration && (
                  <span className="video-duration">
                    {Math.floor(item.video.duration / 60)}:{String(item.video.duration % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
              <div className="history-video-info">
                <h3 className="history-video-title">{item.video.title}</h3>
                <div className="history-video-meta">
                  <span className="video-channel">{item.video.user.username}</span>
                  <span className="video-views">{item.video.views_count.toLocaleString()} views</span>
                  <span className="video-watched">Watched {formatDate(item.watched_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
