import { useState, useEffect } from 'react';
import { videoService } from '../services/video';

function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const data = await videoService.getVideos();
      setVideos(data);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading videos...</div>;

  return (
    <div className="video-list">
      <h2>Videos</h2>
      {videos.map((video) => (
        <div key={video.id} className="video-card">
          <h3>{video.title}</h3>
          <p>{video.description}</p>
          <p>By: {video.user.username}</p>
          <p>Views: {video.views_count} | Likes: {video.likes_count}</p>

          {video.status === 'ready' && video.video_url && (
            <video width="100%" controls>
              <source src={video.video_url} type="video/mp4" />
              Your browser doesn't support video.
            </video>
          )}

          {video.status === 'processing' && (
            <p>Processing...</p>
          )}

          {video.status === 'failed' && (
            <p>Upload failed</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default VideoList;
