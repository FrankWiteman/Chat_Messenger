# BBM Reborn

A faithful recreation of the classic **BlackBerry Messenger (BBM)** as a Progressive Web App — installable on iOS and Android, works in any modern browser, no app store required.

---

## What Is This?

BBM was the defining messaging app of the BlackBerry era. This project rebuilds it with the features that made it iconic:

- **PIN system** — every user gets a unique 8-character hex PIN. Share your PIN, not your phone number
- **Read receipts** — the legendary "D" (delivered) and "R" (read) ticks
- **Pings** — the classic PING!!! that vibrates the recipient's phone
- **Status messages** — set your availability and a personal message
- **Music sharing** — broadcast what you're listening to
- **BBM Feeds** — see your contacts' status and music updates in a timeline
- **Voice & video calls** — real-time calls via WebRTC
- **File sharing** — images, documents, and more in chat
- **Groups** — group messaging (in progress)
- **BBM AI** — a built-in AI contact powered by Google Gemini

The UI adapts natively to iOS (translucent headers, slide animations, safe areas) and Android (Material-style headers, fade-scale animations, gesture navigation support).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Firebase (Auth, Firestore, Realtime Database, Storage, Functions) |
| Calling | Native WebRTC (RTCPeerConnection), signaled via Firebase RTDB |
| Push notifications | Firebase Cloud Messaging (FCM) |
| AI | Google Gemini API |
| Mobile | PWA (primary), Expo + React Native WebView (optional wrapper) |

---

## Features

| Feature | Status |
|---|---|
| PIN-based contact discovery | ✅ Working |
| Friend requests | ✅ Working |
| Real-time messaging | ✅ Working |
| Read receipts (D/R ticks) | ✅ Working |
| Typing indicators | ✅ Working |
| Pings | ✅ Working |
| Status messages | ✅ Working |
| Music status | ✅ Working |
| BBM Feeds | ✅ Working (client-generated) |
| Image/file sharing | ✅ Working |
| Voice calls | ✅ Working (requires HTTPS) |
| Video calls | ✅ Working (requires HTTPS) |
| Push notifications | ✅ Working (Android + iOS 16.4+ PWA) |
| Dark mode | ✅ Working |
| Install to home screen (iOS) | ✅ Working |
| Install to home screen (Android) | ✅ Working |
| Groups | 🚧 UI exists, creation not yet implemented |
| BBM AI contact | ✅ Working (requires Gemini API key) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with the following services enabled:
  - Authentication (Email/Password)
  - Firestore Database
  - Realtime Database
  - Storage
  - Hosting (optional, for deployment)
  - Functions (optional, for push notifications)
- A Google Gemini API key (optional — only needed for the AI contact)

### 1. Clone and install

```bash
git clone https://github.com/your-username/bbm-reborn.git
cd bbm-reborn
npm install
```

### 2. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Google Gemini — powers BBM AI
API_KEY=your_gemini_api_key

# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

> **Important:** `VITE_FIREBASE_DATABASE_URL` is required for voice/video calls. Without it the Realtime Database will not initialise and calling will fail silently.

### 3. Set up Firebase security rules

**Firestore** — copy the contents of `firebase.rules` into your Firebase Console → Firestore → Rules tab.

**Realtime Database** — copy the contents of `database.rules.json` into your Firebase Console → Realtime Database → Rules tab.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Calls require HTTPS. To test calling locally, use `localhost` (which is treated as secure) or deploy to Firebase Hosting and test there.

---

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy to any static host that supports SPA routing (every request serves `index.html`).

### Deploy to Firebase Hosting

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login and select your project
firebase login
firebase use your-project-id

# Deploy
firebase deploy --only hosting
```

Firebase Hosting auto-injects your Firebase config, so no environment variables are needed in the deployed build — it reads config from `/__/firebase/init.json` automatically.

### Deploy to Vercel or Netlify

Both work out of the box. Set your environment variables in the platform dashboard. Make sure to configure the rewrite rule so all routes serve `index.html`:

- **Netlify:** create a `_redirects` file in `public/` containing `/* /index.html 200`
- **Vercel:** the default Vite framework preset handles this automatically

---

## Installing as a PWA

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button (box with arrow pointing up)
3. Tap **"Add to Home Screen"**
4. The app will prompt you to do this on first visit

The app launches full-screen with the status bar integrated (no browser chrome). Notifications require iOS 16.4+ and the app must be installed to the home screen.

### Android (Chrome)
Chrome shows an **"Add to Home Screen"** banner automatically, or tap the three-dot menu and choose **"Install app"**.

---

## Calling

Calls require:
1. **HTTPS** — WebRTC is blocked on non-secure origins (`localhost` is the only exception)
2. **Firebase Realtime Database** configured with a valid `VITE_FIREBASE_DATABASE_URL`
3. **Microphone permission** for voice calls, **camera + microphone** for video calls

Calls use Google STUN servers for direct peer-to-peer connections and Open Relay TURN servers as fallback when direct connections are blocked by NAT. For production, replace the Open Relay credentials in `src/services/callService.ts` with your own Twilio or Xirsys TURN credentials.

---

## Project Structure

```
├── index.html                        # PWA entry — meta tags, viewport, manifest link
├── public/
│   ├── manifest.json                 # PWA manifest — icons, display, orientation
│   ├── icon.png / icon.svg           # App icons
│   ├── ping.mp3                      # BBM ping sound effect
│   └── firebase-messaging-sw.js     # FCM service worker for background push
├── src/
│   ├── App.tsx                       # Root component — all state, navigation, handlers
│   ├── types.ts                      # All shared TypeScript interfaces and enums
│   ├── index.tsx                     # Bootstrap — Firebase config fetch, --vh fix
│   ├── index.css                     # Global layout — 100dvh, safe areas, animations
│   ├── services/
│   │   ├── firebase.ts               # Firebase initialisation
│   │   ├── authService.ts            # Auth — register, login, logout, delete account
│   │   ├── chatService.ts            # Chats — CRUD, subscriptions, typing, receipts
│   │   ├── userService.ts            # Contacts — roster, friend requests, presence
│   │   ├── fileService.ts            # Files — IndexedDB + Storage + Base64 fallback
│   │   ├── callService.ts            # Calls — native WebRTC, STUN/TURN, RTDB signaling
│   │   ├── notificationService.ts    # Push — FCM, permission, local notifications
│   │   └── geminiService.ts          # AI — Gemini API wrapper
│   ├── hooks/
│   │   ├── useChat.ts                # Message subscription + typing + read receipts
│   │   ├── useNotifications.ts       # FCM token registration
│   │   └── useOnlinePresence.ts      # Online/offline status writer
│   ├── utils/
│   │   ├── time.ts                   # formatRelativeTime, isUserOnline
│   │   ├── sound.ts                  # playPingSound, playMessageSound
│   │   ├── auth.ts                   # PIN generation, auth helpers
│   │   └── musicDetection.ts         # Detects music status from text
│   └── components/                   # All UI components (see PROJECT.md for details)
├── functions/
│   └── index.js                      # Firebase Function — FCM push on new message
├── firebase.rules                    # Firestore security rules
├── database.rules.json               # Realtime Database security rules
├── firebase.json                     # Firebase Hosting + Functions config
├── PROJECT.md                        # Architecture reference and decisions
└── README.md                         # This file
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run android` | Run Expo Android native wrapper |
| `npm run ios` | Run Expo iOS native wrapper |
| `npm run native` | Start Expo dev server |

---

## Update History

### v1.1.0 — Calling Fix, File Service Consolidation, PWA Screen Mapping
**March 2026**

The three main things that were broken and how they were fixed:

**Calls not working on iOS/Android**
The project used `simple-peer` which requires Node.js globals (`process`, `Buffer`, `global`) that do not exist in iOS Safari's PWA sandbox. Replaced with native `RTCPeerConnection` — works in all browsers including iOS Safari 11+. Added TURN relay servers so calls work through mobile NAT. Added trickle ICE for faster connection establishment.

**Inconsistent file handling**
Two separate file service files defined the same functions with different parameters. Merged into a single `fileService.ts`: one `compressImage` at 1200px/70%, IndexedDB as primary store for instant offline access, Firebase Storage sync when online, Base64 fallback for images when Storage is unavailable.

**Screen not filling correctly on iOS/Android**
`100vh` does not shrink on Android when the keyboard opens. `position: fixed` on the bottom nav caused it to overlap chat content. Missing safe area insets caused content to render under notches and home indicators. Fixed with `100dvh`, `position: fixed; inset: 0` on `#root`, `env(safe-area-inset-*)` on all edges, and in-flow bottom nav layout.

Full list of changed files:
`callService.ts` (rewritten), `fileService.ts` (consolidated), `hybridFileService.ts` (deleted), `Profile.tsx`, `FileComponents.tsx`, `ChatWindow.tsx`, `App.tsx`, `BottomNav.tsx`, `CallInterface.tsx`, `index.html`, `index.css`, `index.tsx`, `manifest.json`, `App.css`, `chatService.ts`, `declarations.d.ts`, `package.json`

### v1.0.0 — Initial Build
PIN-based messaging, read receipts, typing indicators, pings, status messages, music sharing, BBM Feeds, voice/video calls, file sharing, push notifications, dark mode, PWA install, BBM AI.

---

## Known Limitations

- **Video messages** do not persist across page reloads when Firebase Storage is unavailable — they use a local `ObjectURL` as fallback which only lives for the current session
- **Groups** — the data model and UI exist but group creation is not yet implemented
- **iOS notifications** require iOS 16.4+ and the app must be installed to the home screen
- **Camera switching** during video calls is visual only — the actual camera feed does not switch between front and back
- **TURN servers** use the free Open Relay service which has no SLA — replace with Twilio/Xirsys for production

---

## License

MIT
