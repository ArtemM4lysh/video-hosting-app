import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import playlistService from '../services/playlist';
import './Playlists.css';

const Playlists = () => {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const data = await playlistService.getMyPlaylists();
      setPlaylists(data);
    } catch (err) {
      console.error('Error loading playlists:', err);
      setError('Failed to load playlists');
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
        is_public: isPublic
      });
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setIsPublic(true);
      setShowCreateModal(false);
      loadPlaylists();
    } catch (err) {
      console.error('Error creating playlist:', err);
      alert('Failed to create playlist');
    }
  };

  if (loading) {
    return (
      <div className="playlists-page">
        <div className="playlists-loading">
          <div className="spinner"></div>
          <p>Loading playlists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="playlists-page">
        <div className="playlists-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="playlists-page">
      <div className="playlists-header">
        <h1>Playlists</h1>
        <button className="create-playlist-btn" onClick={() => setShowCreateModal(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="playlists-empty">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <h2>No playlists yet</h2>
          <p>Create your first playlist to organize your favorite videos</p>
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
            Create Playlist
          </button>
        </div>
      ) : (
        <div className="playlists-grid">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="playlist-card"
              onClick={() => navigate(`/playlist/${playlist.id}`)}
            >
              <div className="playlist-thumbnail">
                {playlist.playlist_videos && playlist.playlist_videos.length > 0 && playlist.playlist_videos[0].video.thumbnail_url ? (
                  <img src={playlist.playlist_videos[0].video.thumbnail_url} alt={playlist.name} />
                ) : (
                  <div className="playlist-placeholder">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="8" y1="18" x2="21" y2="18"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                  </div>
                )}
                <div className="playlist-overlay">
                  <span className="playlist-count">{playlist.video_count} videos</span>
                </div>
              </div>
              <div className="playlist-info">
                <h3 className="playlist-name">{playlist.name}</h3>
                {playlist.description && (
                  <p className="playlist-description">{playlist.description}</p>
                )}
                <div className="playlist-meta">
                  <span className="playlist-privacy">
                    {playlist.is_public ? (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                      </svg> Public</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg> Private</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Playlist</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreatePlaylist}>
              <div className="form-group">
                <label htmlFor="playlist-name">Name *</label>
                <input
                  id="playlist-name"
                  type="text"
                  placeholder="Enter playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="playlist-description">Description</label>
                <textarea
                  id="playlist-description"
                  placeholder="Enter playlist description (optional)"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  Make this playlist public
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-create">
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Playlists;
