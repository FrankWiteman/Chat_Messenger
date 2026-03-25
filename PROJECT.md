# BBM Reborn — Project Reference

> **Keep this file open alongside every Claude session.**
> It is the single source of truth for architecture, decisions, and context.
> Update it every time a meaningful change is made.

---

## Continuation Prompt

If this chat runs out of context, start a new session with this prompt:

```
I am building BBM Reborn — a faithful recreation of the BlackBerry Messenger (BBM) app
as a Progressive Web App (PWA) using React + TypeScript + Vite + Firebase.

The project lives in a zip called Chat_Messenger-fixed.zip (I will upload it).
Please read PROJECT.md and README.md first before making any changes — they contain
the full architecture, all decisions already made, and the current state of the project.

Here is what I need help with today: [describe your task]
```

---

## What I Am Building

A modern, faithful recreation of the classic **BlackBerry Messenger (BBM)** experience
as a cross-platform Progressive Web App. The goal is feature parity with the original
BBM — PIN-based contact discovery, read receipts (the iconic "D/R" ticks), pings,
status messages, music sharing, BBM Feeds, voice and video calls, and group chats —
wrapped in a native-feeling mobile UI that installs on both iOS and Android home screens.

It is not a generic chat app with a BBM skin. Every feature decision is guided by
"would the original BBM have this, and how did it work?"

---

## Tech Stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript | Component model, strong typing, ecosystem |
| Styling | Tailwind CSS (CDN in dev, build-time in prod) | Utility-first, fast iteration |
| Bundler | Vite 5 | Fast HMR, ESM-native |
| Icons | lucide-react | Clean, consistent SVG icon set |

### Backend — Firebase (all free tier compatible)
| Service | Purpose |
|---|---|
| Firebase Auth | Email/password authentication, account deletion |
| Firestore | User profiles, chats, messages, friend requests, roster |
| Firebase Realtime Database (RTDB) | WebRTC call signaling (low-latency, ephemeral) |
| Firebase Storage | Profile pictures, chat file attachments |
| Firebase Hosting | Production deployment target |
| Firebase Functions | Push notification dispatch (FCM) |
| FCM (Firebase Cloud Messaging) | Background push notifications |

### Mobile / PWA
| Layer | Choice |
|---|---|
| PWA | `manifest.json` + Service Worker + `viewport-fit=cover` |
| iOS safe areas | `env(safe-area-inset-*)` in CSS + `black-translucent` status bar |
| Android keyboard | `100dvh` + `--vh` CSS variable updated on resize |
| Native wrapper (optional) | Expo + React Native WebView (`NativeWrapper.tsx`) |

### AI
| Service | Purpose |
|---|---|
| Google Gemini API (`@google/genai`) | Powers the "BBM AI" contact — in-app AI assistant |

### Calling
| Layer | Choice | Reason |
|---|---|---|
| WebRTC | Native `RTCPeerConnection` | Works in iOS Safari PWA; `simple-peer` breaks (needs Node globals) |
| Signaling | Firebase RTDB | Already in stack, low latency, auto-cleanup |
| STUN | Google STUN (`stun.l.google.com`) | Free, reliable |
| TURN | Open Relay (`a.relay.metered.ca`) | Free TURN fallback for symmetric NAT |

---

## Project Structure

```
Chat_Messenger-fixed/
├── index.html                  # PWA entry — all meta tags, viewport, manifest link
├── public/
│   ├── manifest.json           # PWA manifest — icons (48→512px), display, orientation
│   ├── icon.png                # App icon (needs multiple sizes ideally)
│   ├── icon.svg                # SVG icon for maskable
│   ├── ping.mp3                # BBM ping sound
│   └── firebase-messaging-sw.js # FCM service worker for background push
├── src/
│   ├── index.tsx               # App bootstrap, Firebase auto-config fetch, --vh fix
│   ├── index.css               # Global layout — 100dvh, safe areas, scroll containers
│   ├── App.css                 # Intentionally empty (layout is in index.css + Tailwind)
│   ├── App.tsx                 # Root component — all state, routing, call/chat handlers
│   ├── types.ts                # All shared TypeScript interfaces and enums
│   ├── services/
│   │   ├── firebase.ts         # Firebase init — env vars → hosting auto-config → placeholder
│   │   ├── authService.ts      # Register, login, logout, update user, delete account
│   │   ├── chatService.ts      # Chat CRUD, message subscriptions, typing, read receipts
│   │   ├── userService.ts      # Roster, friend requests, online presence
│   │   ├── fileService.ts      # SINGLE file service — IndexedDB + Storage + Base64 fallback
│   │   ├── callService.ts      # Native WebRTC calling — STUN/TURN, trickle ICE, RTDB signaling
│   │   ├── notificationService.ts # FCM init, permission, local notifications, iOS/PWA helpers
│   │   └── geminiService.ts    # Gemini AI API wrapper for BBM AI contact
│   ├── hooks/
│   │   ├── useChat.ts          # Message subscription + typing + read receipt hook
│   │   ├── useNotifications.ts # FCM token registration hook
│   │   └── useOnlinePresence.ts # Writes online/offline status to Firestore
│   ├── utils/
│   │   ├── time.ts             # formatRelativeTime, isUserOnline
│   │   ├── sound.ts            # playPingSound, playMessageSound
│   │   ├── auth.ts             # PIN generation, auth helpers
│   │   └── musicDetection.ts   # Detects music status from text patterns
│   └── components/
│       ├── SplashScreen.tsx    # BBM-style animated splash
│       ├── Auth.tsx            # Login, Register, ForgotPassword, 2FA screens
│       ├── Header.tsx          # Top bar — iOS (translucent) and Android (blue) variants
│       ├── BottomNav.tsx       # Tab bar — Chats, Contacts, Groups, More (in-flow, not fixed)
│       ├── Drawer.tsx          # Side drawer — status update, settings nav
│       ├── ChatList.tsx        # Conversation list with unread counts, pins, labels
│       ├── ChatWindow.tsx      # Message thread — sends, receives, file upload, ping
│       ├── Contacts.tsx        # Contact list, PIN search, friend request handling
│       ├── ContactProfile.tsx  # View a contact's profile, call buttons
│       ├── Profile.tsx         # My own profile — edit name, status, avatar upload
│       ├── Groups.tsx          # Group chat list
│       ├── Feeds.tsx           # BBM Feeds — contact status/music updates
│       ├── CallInterface.tsx   # Active call UI — local/remote video, mute, end
│       ├── IncomingCallModal.tsx # Ringing modal with accept/decline
│       ├── FileComponents.tsx  # Renders file/image/video messages in chat
│       └── SubScreens.tsx      # Settings, Privacy, Notifications, Help screens
├── functions/
│   └── index.js                # Firebase Function — sends FCM push on new message
├── firebase.rules              # Firestore security rules
├── database.rules.json         # RTDB security rules (calls node)
├── firebase.json               # Firebase Hosting config + Functions config
└── vite.config.ts              # Vite config — env passthrough, build output
```

---

## Architecture Decisions

### 1. PWA-first, not native-first
**Decision:** Build as a PWA that installs on iOS and Android, with an optional Expo wrapper for app store distribution.
**Reason:** Faster iteration, single codebase, no app store gatekeeping for development. The Expo wrapper (`NativeWrapper.tsx`) is a thin shell that loads the web app in a WebView — it exists to enable app store listing if needed, not as the primary target.

### 2. Firebase for everything backend
**Decision:** Use Firebase (Auth + Firestore + RTDB + Storage + Functions) as the entire backend.
**Reason:** Zero server management, generous free tier, real-time subscriptions built in. The trade-off is vendor lock-in, but for a BBM-scale app the free tier covers it comfortably.

### 3. Two Firebase databases: Firestore for data, RTDB for signaling
**Decision:** Firestore handles all persistent data. RTDB handles WebRTC call signaling only.
**Reason:** RTDB has lower latency for ephemeral, frequently-updated data (ICE candidates, call status). Firestore is better for structured, queryable, persistent data (messages, profiles). Call records auto-delete after 5 seconds via `setTimeout + remove()`.

### 4. Native RTCPeerConnection instead of simple-peer
**Decision:** Replaced `simple-peer` with native `RTCPeerConnection`.
**Reason:** `simple-peer` requires `process`, `Buffer`, and `global` Node.js globals that are not available in iOS Safari's PWA context. Calls were completely broken on iOS. Native WebRTC works in all browsers including iOS Safari 11+.

### 5. Single unified fileService
**Decision:** Merged `fileService.ts` and `hybridFileService.ts` into one file.
**Reason:** Both files defined `compressImage` and `getFileType` with different parameters, causing silent inconsistencies (800px/0.6 vs 1200px/0.7 compression). The unified service uses IndexedDB as the primary store (instant display, works offline), Firebase Storage when online, and Base64 Firestore fallback for images when Storage is unavailable.

### 6. BottomNav is in-flow, not fixed
**Decision:** `BottomNav` uses `shrink-0` in a flex column rather than `position: fixed`.
**Reason:** Fixed positioning on Android PWAs caused the nav bar to overlap chat content when the virtual keyboard opened. In-flow layout respects the flex column and the keyboard correctly pushes content up via `100dvh`.

### 7. iOS safe areas via CSS env(), not JS detection
**Decision:** All safe-area handling uses `env(safe-area-inset-*)` in CSS.
**Reason:** JS detection of notch size is fragile and device-specific. `env()` is the official W3C mechanism supported by all modern iOS and Android browsers. The `isIOS` prop is used only for visual style differences (translucent header vs blue header), not layout.

### 8. `100dvh` + `--vh` CSS variable for viewport height
**Decision:** Use `100dvh` as primary height with a `--vh` fallback.
**Reason:** `100vh` on Android does not shrink when the keyboard appears. `100dvh` (dynamic viewport height) tracks the real visible area. Older Android WebViews that don't support `dvh` get `calc(var(--vh) * 100)` updated via a `resize` listener in `index.tsx`.

### 9. PIN-based contact system
**Decision:** Every user gets an 8-character hex PIN (e.g. `A3F92C1B`) as their discoverable identity.
**Reason:** This is the core BBM mechanic. Phone numbers and email addresses are kept private; you share your PIN to connect. Implemented in `authService.ts` via `generatePin()`.

### 10. Firebase config priority order
**Decision:** `firebase.ts` tries three sources in order: (1) `VITE_` env variables, (2) Firebase Hosting auto-config (`/__/firebase/init.json`), (3) placeholder that shows a "mock mode" warning.
**Reason:** Makes local development, CI, and production all work without changing code. Firebase Hosting auto-config means zero environment setup needed when deployed to Firebase Hosting.

---

## Data Model (Firestore)

```
users/{userId}
  name, pin, avatarUrl, status, statusMessage, musicStatus, mood,
  lastActive, lastStatusUpdate, isAi, email, showActivity,
  showLastSeen, enableReadReceipts, fcmTokens, notificationsEnabled

  users/{userId}/roster/{friendId}
    (mirrors the friend's user document for fast lookup)

friend_requests/{requestId}
  fromUser (User object), toUserId, status, timestamp, type

chats/{chatId}
  participants[], contact (User), isGroup, isMuted, isBlocked,
  isPinned, isArchived, isLocked, labels[], typing{},
  lastMessageText, lastMessageTime, lastMessageSenderId,
  lastMessageStatus, unreadCount

  chats/{chatId}/messages/{messageId}
    senderId, receiverId, text, type, isPing, status,
    timestamp, mediaUrl, fileName, fileId, file (MessageFile)
```

## Data Model (RTDB — ephemeral)

```
calls/{toUserId}/{callId}
  from, fromName, fromAvatar, to, type,
  offer (RTCSessionDescription JSON),
  answer (RTCSessionDescription JSON),
  status (ringing | accepted | rejected | ended),
  timestamp

  calls/{toUserId}/{callId}/candidates/{senderId}/{candidateId}
    (RTCIceCandidate JSON — trickle ICE)
```

---

## Environment Variables

Create a `.env` file in the project root (never commit this file):

```env
# Google Gemini API — powers BBM AI contact
API_KEY=your_gemini_api_key

# Firebase project config
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=     # REQUIRED for calls — format: https://your-project-default-rtdb.firebaseio.com
```

> `VITE_FIREBASE_DATABASE_URL` is the most commonly missed variable.
> Without it, the Realtime Database won't initialise and calls will silently fail.

---

## Known Issues & Next Steps

### Calling
- TURN servers are currently the free Open Relay (`a.relay.metered.ca`). For production, replace with your own Twilio or Xirsys TURN credentials — free TURN servers have no SLA and limited bandwidth.
- Camera switching (front/back) on mobile is cosmetic only — the `cameraFacing` state in `CallInterface.tsx` mirrors the video but doesn't actually invoke `getUserMedia` with the new `facingMode`. Needs a media track replacement.

### File sharing
- Video files do not upload to Firebase Storage — they fall back to a local `ObjectURL` only. This means video messages break if the page is reloaded or viewed on another device. Needs chunked upload or Firebase Storage video handling.
- File size limit is 10 MB. Firestore document size limit is 1 MB so Base64-encoded files above ~750KB will fail the Firestore fallback path — they are saved locally only.

### Notifications
- FCM background notifications work on Android Chrome and desktop. iOS Safari requires the app to be installed as a PWA (added to home screen) and only works on iOS 16.4+.
- The `firebase-messaging-sw.js` service worker handles background messages. Foreground messages use local notification via `notificationService.ts`.

### Groups
- Group chat UI exists (`Groups.tsx`) but group creation is not yet implemented. The `isGroup` flag and `participants[]` array are in the data model ready to be used.

### BBM Feeds
- Currently generated client-side from contact `statusMessage` and `musicStatus` fields. Not persisted — refreshes on every login. A proper Feeds collection in Firestore would allow historical feed posts.

---

## Change Log

### Session 1 — Initial audit and consolidation
- Identified duplicate `compressImage` and `getFileType` across `fileService.ts` and `hybridFileService.ts`
- Identified `markMessageAsDelivered` exported but never used outside its own file
- Identified `downloadFile`, `validateFile`, `saveFileLocally` as unused public exports
- Identified `subscribeToMessages` vs `subscribeToChatUpdates` as intentionally separate (not redundant)
- Identified `App.tsx` `import * as firebaseAuth … as any` as a TypeScript smell
- Identified `simple-peer` as root cause of calls not working on iOS Safari PWA

### Session 2 — Fixes applied
**File service consolidation**
- Deleted `hybridFileService.ts`
- Rewrote `fileService.ts` as unified service: single `compressImage` (1200px/0.7), IndexedDB-first, Firebase Storage when online, Base64 fallback offline
- Updated `Profile.tsx`: `handleProfileUpload` → `uploadProfilePicture` from unified service
- Updated `FileComponents.tsx`: import `getFile` from unified service
- Updated `ChatWindow.tsx`: added `uploadFile` import; `handleFileSelect` now uploads through service instead of using temporary `ObjectURL`; added upload spinner on send button

**Call system rewrite**
- Deleted `simple-peer` dependency from `package.json` and `@types/simple-peer` from devDependencies
- Rewrote `callService.ts` using native `RTCPeerConnection`:
  - Trickle ICE (candidates sent as they arrive, not after full ICE gathering)
  - ICE candidate buffering until remote description is set (prevents race condition)
  - STUN: Google (`stun.l.google.com:19302`, `stun1.l.google.com:19302`)
  - TURN: Open Relay (`a.relay.metered.ca` — ports 80, 443, 443/tcp)
  - Connection state monitoring with 5-second disconnect grace period
  - Event callback system replacing global `window` event hacks
- Updated `App.tsx` call handlers to pass event callbacks for error/ended/rejected states
- Updated `CallInterface.tsx` speaker toggle with proper iOS audio routing attempt
- Removed Buffer/process polyfills from `index.html` (no longer needed)
- Cleaned `declarations.d.ts` — removed `simple-peer` type declarations

**PWA screen mapping**
- Rewrote `index.html`: full Apple/Android meta tag set, all `apple-touch-icon` sizes (152, 167, 180px), `black-translucent` status bar, `interactive-widget=resizes-content`
- Rewrote `index.css`: `position: fixed; inset: 0` on `#root`, `100dvh`, `env(safe-area-inset-*)` on all edges, `.pt-safe`/`.pb-safe`/`.p-safe` utility classes, iOS/Android screen transition animations
- Added `--vh` CSS variable in `index.tsx` (updated on every `resize`) for Android WebView compatibility
- Updated `manifest.json`: 13 icon entries (48px → 512px), `portrait-primary` orientation, dark background
- Fixed `BottomNav.tsx`: removed `position: fixed` → `shrink-0` in flex column (fixes Android keyboard overlap)
- Fixed `App.tsx`: direct `import { onAuthStateChanged } from 'firebase/auth'` (removed `as any` cast)
- Cleared `App.css` (Vite default styles were overriding root layout)
- Removed `markMessageAsDelivered` export from `chatService.ts` (now internal-only)
