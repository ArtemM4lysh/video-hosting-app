import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import watchHistoryService from '../services/watchHistory';
import subscriptionService from '../services/subscription';
import playlistService from '../services/playlist';
import './Sidebar.css';

const Sidebar = () => {
    const [watchHistory, setWatchHistory] = useState([]);
    const [subscribedVideos, setSubscribedVideos] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSidebarData();
    }, []);

    const loadSidebarData = async () => {
        try {
            setLoading(true);
            const [historyData, subscribedData, playlistsData] = await Promise.all([
                watchHistoryService.getMyHistory(20),
                subscriptionService.getSubscribedVideos(),
                playlistService.getMyPlaylists()
            ]);
            setWatchHistory(historyData);
            setSubscribedVideos(subscribedData);
            setPlaylists(playlistsData);
        } catch (error) {
            console.error('Error loading sidebar data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        try {
            await playlistService.createPlaylist({
                name: newPlaylistName,
                description: newPlaylistDescription,
                is_public: true
            });
            setNewPlaylistName('');
            setNewPlaylistDescription('');
            setShowCreatePlaylist(false);
            loadSidebarData();
        } catch (error) {
            console.error('Error creating playlist:', error);
            alert('Failed to create playlist');
        }
    };

    if (loading) {
        return (
            <div className="sidebar">
                <div className="sidebar-loading">Loading...</div>
            </div>
        );
    }

    return (
        <div className="sidebar">
            {/* Recently Watched */}
            <div className="sidebar-section">
                <h3 className="sidebar-section-title">Recently Watched</h3>
                {watchHistory.length === 0 ? (
                    <p className="sidebar-empty">No watch history yet</p>
                ) : (
                    <div className="sidebar-videos">
                        {watchHistory.map((item) => (
                            <Link
                                key={item.id}
                                to={`/watch/${item.video.id}`}
                                className="sidebar-video-item"
                            >
                                <div className="sidebar-video-thumbnail">
                                    {(item.video.thumbnail_url || item.video.preview_url) ? (
                                        <img src={item.video.thumbnail_url || item.video.preview_url} alt={item.video.title} />
                                    ) : (
                                        <div className="sidebar-video-placeholder">
                                            <span>No thumbnail</span>
                                        </div>
                                    )}
                                </div>
                                <div className="sidebar-video-info">
                                    <div className="sidebar-video-title">{item.video.title}</div>
                                    <div className="sidebar-video-channel">{item.video.user.username}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Subscribed Channels Videos */}
            <div className="sidebar-section">
                <h3 className="sidebar-section-title">Subscriptions</h3>
                {subscribedVideos.length === 0 ? (
                    <p className="sidebar-empty">No videos from subscriptions</p>
                ) : (
                    <div className="sidebar-videos">
                        {subscribedVideos.map((video) => (
                            <Link
                                key={video.id}
                                to={`/watch/${video.id}`}
                                className="sidebar-video-item"
                            >
                                <div className="sidebar-video-thumbnail">
                                    {(video.thumbnail_url || video.preview_url) ? (
                                        <img src={video.thumbnail_url || video.preview_url} alt={video.title} />
                                    ) : (
                                        <div className="sidebar-video-placeholder">
                                            <span>No thumbnail</span>
                                        </div>
                                    )}
                                </div>
                                <div className="sidebar-video-info">
                                    <div className="sidebar-video-title">{video.title}</div>
                                    <div className="sidebar-video-channel">{video.user.username}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Playlists */}
            <div className="sidebar-section">
                <div className="sidebar-section-header">
                    <h3 className="sidebar-section-title">Playlists</h3>
                    <button
                        className="sidebar-create-btn"
                        onClick={() => setShowCreatePlaylist(!showCreatePlaylist)}
                    >
                        {showCreatePlaylist ? '×' : '+'}
                    </button>
                </div>

                {showCreatePlaylist && (
                    <form onSubmit={handleCreatePlaylist} className="sidebar-create-form">
                        <input
                            type="text"
                            placeholder="Playlist name"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="sidebar-input"
                            required
                        />
                        <textarea
                            placeholder="Description (optional)"
                            value={newPlaylistDescription}
                            onChange={(e) => setNewPlaylistDescription(e.target.value)}
                            className="sidebar-textarea"
                            rows="2"
                        />
                        <button type="submit" className="sidebar-submit-btn">Create</button>
                    </form>
                )}

                {playlists.length === 0 ? (
                    <p className="sidebar-empty">No playlists yet</p>
                ) : (
                    <div className="sidebar-playlists">
                        {playlists.map((playlist) => (
                            <Link
                                key={playlist.id}
                                to={`/playlist/${playlist.id}`}
                                className="sidebar-playlist-item"
                            >
                                <div className="sidebar-playlist-name">{playlist.name}</div>
                                <div className="sidebar-playlist-count">{playlist.video_count} videos</div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
