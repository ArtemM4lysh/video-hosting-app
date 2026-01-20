import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import playlistService from '../services/playlist';
import Avatar from './Avatar';
import './PlaylistDetail.css';

const PlaylistDetail = () => {
    const { playlistId } = useParams();
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPlaylist();
    }, [playlistId]);

    const fetchPlaylist = async () => {
        try {
            setLoading(true);
            const data = await playlistService.getPlaylist(playlistId);
            setPlaylist(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching playlist:', err);
            setError('Failed to load playlist');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveVideo = async (videoId) => {
        if (!window.confirm('Remove this video from the playlist?')) return;

        try {
            await playlistService.removeVideoFromPlaylist(playlistId, videoId);
            // Refresh playlist
            fetchPlaylist();
        } catch (err) {
            console.error('Error removing video:', err);
            alert('Failed to remove video from playlist');
        }
    };

    const handleDeletePlaylist = async () => {
        if (!window.confirm('Delete this entire playlist? This action cannot be undone.')) return;

        try {
            await playlistService.deletePlaylist(playlistId);
            navigate('/home');
        } catch (err) {
            console.error('Error deleting playlist:', err);
            alert('Failed to delete playlist');
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

    if (loading) {
        return (
            <div className="playlist-detail-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading playlist...</p>
                </div>
            </div>
        );
    }

    if (error || !playlist) {
        return (
            <div className="playlist-detail-container">
                <div className="error-message">{error || 'Playlist not found'}</div>
                <button className="back-button" onClick={() => navigate('/home')}>
                    Go back to home
                </button>
            </div>
        );
    }

    const isOwner = playlist.user && playlist.user.id === parseInt(localStorage.getItem('userId'));

    return (
        <div className="playlist-detail-container">
            <div className="playlist-header">
                <div className="playlist-info">
                    <h1 className="playlist-title">{playlist.name}</h1>
                    {playlist.description && (
                        <p className="playlist-description">{playlist.description}</p>
                    )}
                    <div className="playlist-meta">
                        <Avatar user={playlist.user} size="small" />
                        <span className="playlist-author">{playlist.user.username}</span>
                        <span className="playlist-separator">•</span>
                        <span className="playlist-count">{playlist.video_count} videos</span>
                        <span className="playlist-separator">•</span>
                        <span className="playlist-visibility">
                            {playlist.is_public ? 'Public' : 'Private'}
                        </span>
                    </div>
                    {isOwner && (
                        <button className="delete-playlist-btn" onClick={handleDeletePlaylist}>
                            Delete Playlist
                        </button>
                    )}
                </div>
            </div>

            <div className="playlist-videos">
                {playlist.playlist_videos && playlist.playlist_videos.length === 0 ? (
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
                        <h3>No videos in this playlist yet</h3>
                    </div>
                ) : (
                    <div className="videos-list">
                        {playlist.playlist_videos.map((item, index) => (
                            <div key={item.id} className="playlist-video-item">
                                <div className="video-index">{index + 1}</div>
                                <Link to={`/watch/${item.video.id}`} className="video-content">
                                    <div className="video-thumbnail">
                                        {item.video.thumbnail_url ? (
                                            <img src={item.video.thumbnail_url} alt={item.video.title} />
                                        ) : (
                                            <div className="thumbnail-placeholder">
                                                <svg
                                                    width="32"
                                                    height="32"
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
                                        {item.video.duration && (
                                            <div className="video-duration">
                                                {Math.floor(item.video.duration / 60)}:
                                                {String(item.video.duration % 60).padStart(2, '0')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="video-info">
                                        <h3 className="video-title">{item.video.title}</h3>
                                        <div className="video-meta">
                                            <span className="video-channel">{item.video.user.username}</span>
                                            <span className="meta-separator">•</span>
                                            <span>{formatViewCount(item.video.views_count)} views</span>
                                        </div>
                                    </div>
                                </Link>
                                {isOwner && (
                                    <button
                                        className="remove-video-btn"
                                        onClick={() => handleRemoveVideo(item.video.id)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaylistDetail;
