import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    } else {
      setUser(currentUser);
    }
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
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

        <div className="features-section">
          <h3>Coming Soon</h3>
          <div className="features-grid">
            <div className="feature-card">
              <h4>Upload Videos</h4>
              <p>Share your content with the world</p>
            </div>
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
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
