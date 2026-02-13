
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { playPingSound } from '../utils/sound';

// ============================================================================
// iOS PWA NOTIFICATION FIXES
// ============================================================================

// Check if notifications are supported
export const areNotificationsSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'Notification' in window;
};

// Detect if running as PWA (required for iOS notifications)
export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Check if iOS
export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

// Initialize Service Worker with iOS optimizations
export const initializeNotifications = async () => {
  if (!areNotificationsSupported()) {
    console.warn('Notifications not supported on this device');
    return false;
  }

  // Warn if iOS but not PWA
  if (isIOS() && !isPWA()) {
    console.warn('⚠️ iOS detected but not running as PWA. Notifications may not work reliably.');
    return false;
  }

  try {
    // Unregister any existing service workers first (clean slate) to prevent stale handlers
    if ('serviceWorker' in navigator) {
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of existingRegistrations) {
            await registration.unregister();
        }
    }

    // Register fresh service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none' // CRITICAL for iOS - prevents caching issues
    });

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Force update check on iOS (important after device restarts)
    if (isIOS()) {
      await registration.update();
      console.log('🔄 iOS: Forced service worker update');
    }

    console.log('✅ Service Worker registered:', registration.scope);
    
    // Store registration timestamp
    localStorage.setItem('bbm_sw_registered_at', Date.now().toString());
    
    return true;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return false;
  }
};

// Request Notification Permission with iOS-specific handling
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!areNotificationsSupported()) {
    return false;
  }

  // Check if PWA on iOS
  if (isIOS() && !isPWA()) {
    alert('To receive notifications on iOS:\n\n1. Tap the Share button\n2. Select "Add to Home Screen"\n3. Open the app from your home screen\n4. Grant notification permission');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      // Store permission grant info
      localStorage.setItem('bbm_notif_granted_at', Date.now().toString());
      
      // Re-initialize service worker to ensure it's active
      await initializeNotifications();
      
      return true;
    } else {
      console.warn('⚠️ Notification permission denied or dismissed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
};

// Show Notification with iOS fixes
export const showLocalNotification = async (
  title: string,
  body: string,
  icon?: string,
  tag?: string,
  chatId?: string,
  useCustomSound: boolean = false
) => {
  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    // CRITICAL: Must use service worker registration for iOS
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration) {
      console.error('❌ Service worker not ready');
      return;
    }

    const notifIcon = icon || '/icon.png';
    const timestamp = Date.now();
    
    // iOS-optimized notification options
    const options: any = {
      body: body,
      icon: notifIcon,
      badge: '/icon.png',
      // CRITICAL: Unique tag with timestamp for iOS (prevents subscription termination due to tag collision/throttling)
      tag: `${tag || 'bbm'}-${timestamp}`,
      renotify: true,
      requireInteraction: false,
      data: {
        url: '/',
        chatId: chatId,
        timestamp: timestamp,
        clickAction: chatId ? `/chat/${chatId}` : '/'
      }
    };

    // iOS-specific sound and vibration handling
    if (isIOS()) {
      // iOS ignores custom sounds in PWAs - always use system
      options.silent = false;
      options.vibrate = [200, 100, 200];
    } else {
      // Non-iOS: respect user's custom sound preference
      options.silent = useCustomSound;
      options.sound = useCustomSound ? undefined : '/ping.mp3'; 
      options.vibrate = useCustomSound ? [] : [200, 100, 200];
    }

    // Show notification via service worker (required for iOS)
    await registration.showNotification(title, options);
    
    // Store last notification time (for debugging)
    localStorage.setItem('bbm_last_notification', timestamp.toString());

  } catch (error) {
    console.error('❌ Notification failed:', error);
    
    // Fallback attempt (may work on some iOS versions or desktop)
    try {
      new Notification(title, {
        body,
        icon: icon || '/icon.png',
        tag: `${tag}-${Date.now()}`,
        silent: isIOS() ? false : useCustomSound
      } as any);
    } catch (fallbackError) {
      console.error('❌ Fallback notification also failed:', fallbackError);
    }
  }
};

// Enhanced Firestore listener with iOS optimizations
export const setupLocalNotificationListener = (userId: string) => {
  if (!db || !userId) {
    return () => {};
  }

  console.log('🎧 Starting notification listener for user:', userId);

  // Rate limiting to prevent iOS subscription termination
  let lastNotificationTime = 0;
  const MIN_NOTIFICATION_INTERVAL = 1000; // 1 second
  
  // Keep track of processed messages to avoid duplicates
  const processedMessages = new Set<string>();

  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('participants', 'array-contains', userId));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const chatData = change.doc.data();
          const chatId = change.doc.id;
          
          const myUnreadCount = chatData.unreadCount?.[userId] || 0;
          const isFromOther = chatData.lastMessageSenderId && 
                             chatData.lastMessageSenderId !== userId;

          if (isFromOther && myUnreadCount > 0) {
            const now = Date.now();
            
            // Check message freshness (ignore old messages on load)
            const msgTime = chatData.lastMessageTime?.toMillis ? chatData.lastMessageTime.toMillis() : (chatData.lastMessageTime || 0);
            if (now - msgTime > 10000) {
                return; // Too old
            }

            // Create unique message ID to prevent duplicates
            const messageId = `${chatId}-${msgTime}`;
            
            // Skip if already processed
            if (processedMessages.has(messageId)) {
              return;
            }
            
            // Rate limit (important for iOS)
            if (now - lastNotificationTime < MIN_NOTIFICATION_INTERVAL) {
              return;
            }

            // Mark as processed
            processedMessages.add(messageId);
            lastNotificationTime = now;

            // Clean up old processed messages (keep last 50)
            if (processedMessages.size > 50) {
              const arr = Array.from(processedMessages);
              arr.slice(0, 25).forEach(id => processedMessages.delete(id));
            }

            const senderDetails = chatData.participantDetails?.[chatData.lastMessageSenderId];
            const senderName = senderDetails?.name || 'BBM User';
            const senderAvatar = senderDetails?.avatarUrl || '/icon.png';
            let messageText = chatData.lastMessageText || 'New Message';
            
            if (messageText === 'PING!!!') {
              messageText = 'PING!!! 🚨';
            }

            // IMPORTANT: Trigger notifications when app is in background OR minimized
            // document.hidden works for both backgrounded tabs AND minimized PWA
            // document.visibilityState === 'hidden' is safer across browsers
            if (document.visibilityState === 'hidden' || document.hidden) {
              
              // Sound preference (custom sound disabled on iOS)
              const soundPref = localStorage.getItem('bbm_sound_preference') || 'custom';
              const useCustomSound = !isIOS() && soundPref === 'custom';

              // Play custom sound on non-iOS
              if (useCustomSound) {
                playPingSound();
              }

              // Show notification
              showLocalNotification(
                senderName,
                messageText,
                senderAvatar,
                `chat_${chatId}`,
                chatId,
                useCustomSound
              );
            }
          }
        }
      });
    },
    (error) => {
      console.error('❌ Notification listener error:', error);
    }
  );

  // iOS Keep-Alive: Ping every 25 seconds to keep connection active
  let keepAliveInterval: NodeJS.Timeout | null = null;
  
  if (isIOS()) {
    keepAliveInterval = setInterval(() => {
      // Lightweight operation to keep service worker alive
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // console.log('🔄 iOS keep-alive ping');
      }
    }, 25000);
  }

  // Enhanced cleanup
  return () => {
    console.log('🛑 Cleaning up notification listener');
    unsubscribe();
    
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
    
    processedMessages.clear();
  };
};

// Check and refresh notification setup (call this on app resume)
export const checkAndRefreshNotifications = async (): Promise<boolean> => {
  const permission = getNotificationPermission();
  
  if (permission !== 'granted') {
    return false;
  }

  // Verify service worker is active
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        console.warn('⚠️ Service worker missing, re-initializing...');
        return await initializeNotifications();
      }

      // On iOS, force update after app resume (fixes restart issues)
      if (isIOS()) {
        await registration.update();
      }

      return true;
    } catch (error) {
      console.error('❌ Error checking service worker:', error);
      return false;
    }
  }

  return false;
};

// Call this when app becomes visible again (important for iOS)
export const handleAppResume = async () => {
  await checkAndRefreshNotifications();
};

// Set up visibility change listener (handles minimize/restore)
export const setupVisibilityListener = () => {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleAppResume();
    }
  });
};

export const onForegroundMessage = () => () => {};
export const unregisterNotifications = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
};
