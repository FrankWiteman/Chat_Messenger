
export const playPingSound = () => {
  try {
    // Uses the file at public/ping.mp3
    const audio = new Audio('/ping.mp3'); 
    audio.volume = 1.0;
    
    // Attempt playback
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // Auto-play policy blocking is common.
        // User needs to interact with the page at least once before this works in background.
        console.warn("Audio playback blocked (Auto-play policy) or file missing:", error);
      });
    }

    // Classic BBM Vibration pattern (Vibrate, Pause, Vibrate)
    // Works on Android. iOS ignores this.
    if (navigator.vibrate) {
        navigator.vibrate([250, 100, 250]);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export const playMessageSound = () => {
    try {
        // Standard BBM Message "Click/Bloop"
        // If you have a specific file, replace this URL with '/message.mp3'
        const audio = new Audio('/ping.mp3'); 
        audio.volume = 0.6;
        audio.play().catch(() => {});
    } catch {
        // Ignore
    }
};
