import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Home from './components/Home';
import Channel from './components/Channel';
import Watch from './components/Watch';
import VideoUpload from './components/VideoUpload';
import PlaylistDetail from './components/PlaylistDetail';
import History from './components/History';
import Subscriptions from './components/Subscriptions';
import Playlists from './components/Playlists';
import Navbar from './components/Navbar';
import authService from './services/auth';
import './App.css';

function ProtectedRoute({ children }) {
  return authService.isAuthenticated() ? children : <Navigate to="/login" />;
}

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const location = useLocation();

  useEffect(() => {
    // Update auth state when location changes
    setIsAuthenticated(authService.isAuthenticated());
  }, [location]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  return (
    <>
      {isAuthenticated && <Navbar onSearch={handleSearch} />}

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home searchQuery={searchQuery} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/channel/:userId"
          element={
            <ProtectedRoute>
              <Channel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/watch/:videoId"
          element={
            <ProtectedRoute>
              <Watch />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <VideoUpload />
            </ProtectedRoute>
          }
        />

        <Route
          path="/playlist/:playlistId"
          element={
            <ProtectedRoute>
              <PlaylistDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />

        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <Subscriptions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/playlists"
          element={
            <ProtectedRoute>
              <Playlists />
            </ProtectedRoute>
          }
        />

        {/* Redirect old dashboard route to home */}
        <Route path="/dashboard" element={<Navigate to="/home" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
