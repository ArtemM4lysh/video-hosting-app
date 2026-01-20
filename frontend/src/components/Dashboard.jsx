import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { videoService } from '../services/video';
import VideoUpload from './VideoUpload';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    } else {
      setUser(currentUser);
      loadMyVideos();
    }
  }, [navigate]);

  const loadMyVideos = async () => {
    setLoadingVideos(true);
    try {
      const data = await videoService.getMyVideos();
      setVideos(data);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    loadMyVideos(); // Reload videos after successful upload
  };

  if (!user) return null;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>VideoHost</h1>
          <div className="user-info">
            <span className="username">{user.username}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Welcome to your channel, {user.first_name || user.username}!</h2>
          <p className="channel-info">
            <strong>Channel Name:</strong> {user.username}
          </p>
          <p className="channel-info">
            <strong>Email:</strong> {user.email}
          </p>
          <p className="channel-info">
            <strong>Subscribers:</strong> {user.subscriber_count}
          </p>
        </div>

        {/* Video Upload Section */}
        <div className="upload-section">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="upload-toggle-btn"
          >
            {showUpload ? 'Hide Upload' : 'Upload Video'}
          </button>

          {showUpload && <VideoUpload onSuccess={handleUploadSuccess} />}
        </div>

        {/* My Videos Section */}
        <div className="my-videos-section">
          <h3>My Videos ({videos.length})</h3>
          {loadingVideos ? (
            <p>Loading videos...</p>
          ) : videos.length === 0 ? (
            <p>No videos uploaded yet. Upload your first video!</p>
          ) : (
            <div className="videos-grid">
              {videos.map((video) => (
                <div key={video.id} className="video-card">
                  <h4>{video.title}</h4>
                  <p className="video-description">{video.description}</p>
                  <div className="video-meta">
                    <span>Views: {video.views_count}</span>
                    <span>Likes: {video.likes_count}</span>
                    <span className={`status-${video.status}`}>
                      {video.status}
                    </span>
                  </div>
                  <p className="video-date">
                    Uploaded: {new Date(video.created_at).toLocaleDateString()}
                  </p>

                  {video.status === 'ready' && video.video_url && (
                    <video width="100%" controls>
                      <source src={video.video_url} type="video/mp4" />
                      Your browser doesn't support video playback.
                    </video>
                  )}

                  {video.status === 'processing' && (
                    <p className="status-message">Processing video...</p>
                  )}

                  {video.status === 'failed' && (
                    <p className="status-message error">Upload failed</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="features-section">
          <h3>Coming Soon</h3>
          <div className="features-grid">
            <div className="feature-card">
              <h4>Manage Subscriptions</h4>
              <p>Follow other channels</p>
            </div>
            <div className="feature-card">
              <h4>View Comments</h4>
              <p>Engage with your audience</p>
            </div>
            <div className="feature-card">
              <h4>Search Videos</h4>
              <p>Discover new content</p>
            </div>
            <div className="feature-card">
              <h4>Analytics</h4>
              <p>Track your channel performance</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
