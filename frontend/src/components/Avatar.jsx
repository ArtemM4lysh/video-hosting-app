import React from 'react';
import './Avatar.css';

const Avatar = ({ user, size = 'medium', onClick }) => {
  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getColorFromString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0',
      '#a8edea', '#fed6e3', '#c471f5', '#fa71cd'
    ];

    return colors[Math.abs(hash) % colors.length];
  };

  const backgroundColor = getColorFromString(user.username || user.email);

  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ backgroundColor }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {user.profile_picture ? (
        <img src={user.profile_picture} alt={user.username} />
      ) : (
        <span className="avatar-initials">{getInitials()}</span>
      )}
    </div>
  );
};

export default Avatar;
