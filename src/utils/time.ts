export const formatRelativeTime = (timestamp: number | undefined): string => {
  if (!timestamp) return 'Never';
  
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const isUserOnline = (lastActive: number | undefined): boolean => {
  if (!lastActive) return false;
  // A user is considered online if their heartbeat was within the last 65 seconds
  return Date.now() - lastActive < 65000;
};