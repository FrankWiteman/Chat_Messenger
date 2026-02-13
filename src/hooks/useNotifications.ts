
import { useState, useEffect } from 'react';
import {
  initializeNotifications,
  requestNotificationPermission,
  getNotificationPermission,
  areNotificationsSupported,
  setupLocalNotificationListener
} from '../services/notificationService';

export const useNotifications = (userId?: string) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const init = async () => {
      const supported = areNotificationsSupported();
      setIsSupported(supported);
      
      if (supported) {
        await initializeNotifications();
        setPermission(getNotificationPermission());
      }
    };

    init();
  }, []);

  // Setup the Firestore listener when we have a user and permission
  useEffect(() => {
    if (!userId || permission !== 'granted') return;

    const unsubscribe = setupLocalNotificationListener(userId);
    
    return () => {
        if(unsubscribe) unsubscribe();
    };
  }, [userId, permission]);

  const requestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermission(getNotificationPermission());
    return granted;
  };

  return {
    isSupported,
    permission,
    requestPermission,
    isEnabled: permission === 'granted'
  };
};
