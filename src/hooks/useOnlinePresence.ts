import { useEffect } from 'react';
import { updateUserPresence } from '../services/userService';

export const useOnlinePresence = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;
    
    // Initial check-in
    updateUserPresence(userId, true);

    const handleVisibilityChange = () => {
        const isVisible = document.visibilityState === 'visible';
        updateUserPresence(userId, isVisible);
    };

    // Heartbeat every 30 seconds to keep lastActive fresh
    const heartbeat = setInterval(() => {
        if (document.visibilityState === 'visible') {
            updateUserPresence(userId, true);
        }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => updateUserPresence(userId, true));
    window.addEventListener('blur', () => updateUserPresence(userId, false));
    window.addEventListener('beforeunload', () => updateUserPresence(userId, false));

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => updateUserPresence(userId, true));
      window.removeEventListener('blur', () => updateUserPresence(userId, false));
      window.removeEventListener('beforeunload', () => updateUserPresence(userId, false));
      clearInterval(heartbeat);
      updateUserPresence(userId, false);
    };
  }, [userId]);
};