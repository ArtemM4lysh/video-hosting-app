import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import videoService from '../services/video';
import subscriptionService from '../services/subscription';
import likeService from '../services/like';
import Avatar from './Avatar';
import './Watch.css';

const Watch = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasIncrementedView, setHasIncrementedView] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    fetchVideo();
  }, [videoId]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await videoService.getVideo(videoId);
      setVideo(response);
      setSubscriberCount(response.user.subscriber_count);
      setLikeCount(response.likes_count);
      setError(null);

      // Check if user is subscribed and if video is liked
      try {
        const [subStatus, likeStatus] = await Promise.all([
          subscriptionService.checkSubscription(response.user.id),
          likeService.checkLike(videoId)
        ]);
        setIsSubscribed(subStatus.is_subscribed);
        setIsLiked(likeStatus.is_liked);
      } catch (err) {
        console.error('Error checking subscription/like status:', err);
      }
    } catch (err) {
      console.error('Error fetching video:', err);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPlay = async () => {
    if (!hasIncrementedView && video) {
      try {
        await videoService.incrementView(video.id);
        setHasIncrementedView(true);
        // Update local view count
        setVideo((prev) => ({
          ...prev,
          views_count: prev.views_count + 1,
        }));
      } catch (err) {
        console.error('Error incrementing view:', err);
      }
    }
  };

  const handleChannelClick = () => {
    if (video && video.user) {
      navigate(`/channel/${video.user.id}`);
    }
  };

  const handleSubscribe = async () => {
    try {
      if (isSubscribed) {
        await subscriptionService.unsubscribe(video.user.id);
        setIsSubscribed(false);
        setSubscriberCount((prev) => Math.max(0, prev - 1));
      } else {
        await subscriptionService.subscribe(video.user.id);
        setIsSubscribed(true);
        setSubscriberCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Error toggling subscription:', err);
      alert('Failed to update subscription. Please try again.');
    }
  };

  const handleLike = async () => {
    try {
      const response = await likeService.toggleLike(video.id);
      setIsLiked(response.liked);
      setLikeCount(response.likes_count);
    } catch (err) {
      console.error('Error toggling like:', err);
      alert('Failed to update like. Please try again.');
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="watch-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="watch-container">
        <div className="error-message">{error || 'Video not found'}</div>
        <button className="back-button" onClick={() => navigate('/home')}>
          Go back to home
        </button>
      </div>
    );
  }

  return (
    <div className="watch-container">
      <div className="watch-content">
        {/* Video player */}
        <div className="video-player-wrapper">
          {video.video_url ? (
            <video
              ref={videoRef}
              className="video-player"
              controls
              onPlay={handleVideoPlay}
            >
              <source src={video.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="video-unavailable">
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
              <p>Video is being processed</p>
            </div>
          )}
        </div>

        {/* Video info */}
        <div className="video-details">
          <h1 className="video-title">{video.title}</h1>

          <div className="video-stats-actions">
            <div className="video-stats">
              <span>{formatViewCount(video.views_count)} views</span>
              <span className="separator">•</span>
              <span>{formatDate(video.created_at)}</span>
            </div>

            <button
              className={`like-button ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              <span>{formatViewCount(likeCount)}</span>
            </button>
          </div>

          {/* Channel info */}
          <div className="channel-info-section">
            <div className="channel-info-left" onClick={handleChannelClick}>
              <Avatar user={video.user} size="large" />
              <div className="channel-details">
                <div className="channel-name">{video.user.username}</div>
                <div className="subscriber-count">
                  {formatViewCount(subscriberCount)} subscribers
                </div>
              </div>
            </div>

            <button
              className={`subscribe-button ${isSubscribed ? 'subscribed' : ''}`}
              onClick={handleSubscribe}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>

          {/* Description */}
          {video.description && (
            <div className="video-description">
              <h3>Description</h3>
              <p>{video.description}</p>
            </div>
          )}

          {/* Additional metadata */}
          <div className="video-metadata">
            {video.resolution && (
              <div className="metadata-item">
                <span className="metadata-label">Resolution:</span>
                <span className="metadata-value">{video.resolution}</span>
              </div>
            )}
            {video.duration && (
              <div className="metadata-item">
                <span className="metadata-label">Duration:</span>
                <span className="metadata-value">
                  {Math.floor(video.duration / 60)}:
                  {String(video.duration % 60).padStart(2, '0')}
                </span>
              </div>
            )}
            {video.file_size && (
              <div className="metadata-item">
                <span className="metadata-label">Size:</span>
                <span className="metadata-value">
                  {(video.file_size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar with related videos could go here in the future */}
      <div className="watch-sidebar">
        <h3 className="sidebar-title">More videos coming soon</h3>
      </div>
    </div>
  );
};

export default Watch;
