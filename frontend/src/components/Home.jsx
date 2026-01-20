import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import videoService from '../services/video';
import Avatar from './Avatar';
import './Home.css';

const Home = ({ searchQuery }) => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchVideos();
  }, [searchQuery, currentPage]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await videoService.getAllVideos(currentPage, searchQuery);
      setVideos(response.results || []);
      setTotalPages(Math.ceil(response.count / 20));
      setError(null);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (videoId) => {
    navigate(`/watch/${videoId}`);
  };

  const handleChannelClick = (e, userId) => {
    e.stopPropagation();
    navigate(`/channel/${userId}`);
  };

  const formatViewCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
    return `${Math.floor(seconds / 31536000)} years ago`;
  };

  if (loading && videos.length === 0) {
    return (
      <div className="home-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {searchQuery && (
        <div className="search-results-header">
          <h2>Search results for "{searchQuery}"</h2>
          <p>{videos.length} videos found</p>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="no-videos">
          <svg
            width="64"
            height="64"
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
          <h3>No videos found</h3>
          <p>{searchQuery ? 'Try a different search term' : 'Be the first to upload a video!'}</p>
        </div>
      ) : (
        <>
          <div className="videos-grid">
            {videos.map((video) => (
              <div
                key={video.id}
                className="video-card"
                onClick={() => handleVideoClick(video.id)}
              >
                <div className="video-thumbnail">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} />
                  ) : (
                    <div className="thumbnail-placeholder">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                  )}
                  {video.duration && (
                    <div className="video-duration">
                      {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                    </div>
                  )}
                </div>

                <div className="video-info">
                  <div className="video-info-header">
                    <Avatar
                      user={video.user}
                      size="small"
                      onClick={(e) => handleChannelClick(e, video.user.id)}
                    />
                    <div className="video-details">
                      <h3 className="video-title">{video.title}</h3>
                      <div
                        className="channel-name"
                        onClick={(e) => handleChannelClick(e, video.user.id)}
                      >
                        {video.user.username}
                      </div>
                      <div className="video-meta">
                        <span>{formatViewCount(video.views_count)} views</span>
                        <span className="meta-separator">•</span>
                        <span>{formatTimeAgo(video.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="pagination-button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
