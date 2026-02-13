
/**
 * MUSIC DETECTION SERVICE (Beta Implementation)
 * 
 * In a Native (iOS/Android) environment, this interacts with:
 * 'react-native-track-player' or Native Modules to read system media.
 * 
 * For this WEB BETA, we simulate the "PlaybackTrackChanged" event
 * to demonstrate the auto-status-update functionality live.
 */

interface TrackInfo {
    title: string;
    artist: string;
}

type MusicCallback = (track: TrackInfo) => void;

// Simulated Playlist for Beta Testing
const BETA_PLAYLIST = [
    { title: "Holy Forever", artist: "CeCe Winans" },
    { title: "Alone", artist: "Burna Boy" },
    { title: "Last Last", artist: "Burna Boy" },
    { title: "Essence", artist: "Wizkid ft. Tems" },
    { title: "Unavailable", artist: "Davido" },
    { title: "Calm Down", artist: "Rema" },
    { title: "As It Was", artist: "Harry Styles" },
    { title: "Rich Flex", artist: "Drake & 21 Savage" }
];

let intervalId: any = null;

export function startMusicListener(callback: MusicCallback) {
    if (intervalId) clearInterval(intervalId);

    // Immediate initial update
    const randomStart = BETA_PLAYLIST[Math.floor(Math.random() * BETA_PLAYLIST.length)];
    callback(randomStart);

    // Simulate track changing every 15-30 seconds (or faster for demo purposes: 8s)
    intervalId = setInterval(() => {
        const nextTrack = BETA_PLAYLIST[Math.floor(Math.random() * BETA_PLAYLIST.length)];
        // console.log("[System Media] Track Changed:", nextTrack); // Debug
        callback(nextTrack);
    }, 8000); 

    return () => stopMusicListener();
}

export function stopMusicListener() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}
