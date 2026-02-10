import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import videoService from '../services/video';
import subscriptionService from '../services/subscription';
import authService from '../services/auth';
import Avatar from './Avatar';
import './Channel.css';

const Channel = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [channelUser, setChannelUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isOwnChannel, setIsOwnChannel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    fetchChannelData();
    checkIfOwnChannel();
  }, [userId, currentPage]);

  const checkIfOwnChannel = () => {
    const currentUser = authService.getCurrentUser();
    setIsOwnChannel(currentUser && currentUser.id === parseInt(userId));
  };

  const fetchChannelData = async () => {
    try {
      setLoading(true);
      const response = await videoService.getUserVideos(userId, currentPage);
      const videosList = response.results || [];
      setVideos(videosList);
      setTotalPages(Math.ceil(response.count / 20));

      // Get channel user info from first video
      if (videosList.length > 0) {
        setChannelUser(videosList[0].user);
        setSubscriberCount(videosList[0].user.subscriber_count);
      } else {
        // If no videos, try to get current user info if it's their channel
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.id === parseInt(userId)) {
          setChannelUser(currentUser);
          setSubscriberCount(currentUser.subscriber_count || 0);
        }
      }

      // Check subscription status
      if (!isOwnChannel) {
        try {
          const subStatus = await subscriptionService.checkSubscription(userId);
          setIsSubscribed(subStatus.is_subscribed);
        } catch (err) {
          console.error('Error checking subscription status:', err);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching channel data:', err);
      setError('Failed to load channel');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (videoId) => {
    navigate(`/watch/${videoId}`);
  };

  const handleDeleteClick = (e, videoId) => {
    e.stopPropagation();
    setDeleteConfirm(videoId);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await videoService.deleteVideo(deleteConfirm);
      setVideos(videos.filter((v) => v.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting video:', err);
      alert('Failed to delete video');
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleSubscribe = async () => {
    try {
      if (isSubscribed) {
        await subscriptionService.unsubscribe(userId);
        setIsSubscribed(false);
        setSubscriberCount((prev) => Math.max(0, prev - 1));
      } else {
        await subscriptionService.subscribe(userId);
        setIsSubscribed(true);
        setSubscriberCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error toggling subscription:', err);
      alert('Failed to update subscription. Please try again.');
    }
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

  if (loading) {
    return (
      <div className="channel-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading channel...</p>
        </div>
      </div>
    );
  }

  if (error || !channelUser) {
    return (
      <div className="channel-container">
        <div className="error-message">{error || 'Channel not found'}</div>
      </div>
    );
  }

  return (
    <div className="channel-container">
      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Video</h3>
            <p>Are you sure you want to delete this video? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="cancel-button" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className="delete-button" onClick={handleConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel header */}
      <div className="channel-header">
        <div className="channel-banner"></div>
        <div className="channel-info">
          <Avatar user={channelUser} size="xlarge" />
          <div className="channel-details">
            <h1 className="channel-name">{channelUser.username}</h1>
            {channelUser.bio && <p className="channel-bio">{channelUser.bio}</p>}
            <div className="channel-stats">
              <span>{formatViewCount(subscriberCount)} subscribers</span>
              <span className="stat-separator">•</span>
              <span>{videos.length} videos</span>
            </div>
          </div>
          {!isOwnChannel && (
            <button
              className={`subscribe-button-channel ${isSubscribed ? 'subscribed' : ''}`}
              onClick={handleSubscribe}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          )}
        </div>
      </div>

      {/* Videos section */}
      <div className="channel-content">
        <h2 className="section-title">
          {isOwnChannel ? 'Your Videos' : 'Videos'}
        </h2>

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
            <h3>No videos yet</h3>
            <p>
              {isOwnChannel
                ? 'Upload your first video to get started!'
                : 'This channel hasn\'t uploaded any videos yet.'}
            </p>
            {isOwnChannel && (
              <button
                className="upload-cta-button"
                onClick={() => navigate('/upload')}
              >
                Upload Video
              </button>
            )}
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
                    {(video.thumbnail_url || video.preview_url) ? (
                      <img src={video.thumbnail_url || video.preview_url} alt={video.title} />
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
                        {Math.floor(video.duration / 60)}:
                        {String(video.duration % 60).padStart(2, '0')}
                      </div>
                    )}
                    {isOwnChannel && (
                      <button
                        className="delete-icon"
                        onClick={(e) => handleDeleteClick(e, video.id)}
                        title="Delete video"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="video-info">
                    <h3 className="video-title">{video.title}</h3>
                    <div className="video-meta">
                      <span>{formatViewCount(video.views_count)} views</span>
                      <span className="meta-separator">•</span>
                      <span>{formatTimeAgo(video.created_at)}</span>
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
    </div>
  );
};

export default Channel;
