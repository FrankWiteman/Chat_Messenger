# BBM Reborn

A modern recreation of the classic BlackBerry Messenger experience using web technologies. 

## Features

- **Pinging:** Classic "PING!!!" functionality with vibration and sound.
- **PIN System:** Add friends via unique 8-character hex PINs.
- **Statuses:** Set status (Busy, Available) and share what music you are listening to.
- **AI Integration:** Chat with BBM AI powered by Gemini.
- **Video/Voice Calls:** WebRTC implementation for calls.
- **Cross-Platform:** Runs on Web and Mobile (via Expo wrapper).

## Tech Stack

- **Frontend:** React, TailwindCSS, Vite
- **Mobile:** Expo, React Native WebView
- **Backend:** Firebase (Firestore, Auth, Storage, Realtime Database)
- **AI:** Google Gemini API

## Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/bbm-reborn.git
   cd bbm-reborn
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory based on `.env.example`.
   ```
   API_KEY=your_gemini_api_key
   ```

4. **Run Web Version:**
   ```bash
   npm run dev
   ```

5. **Run Mobile Version (Expo):**
   ```bash
   npm run native
   ```

## Deployment

This project can be hosted on Netlify, Vercel, or Firebase Hosting.

### Build for production
```bash
npm run build
```
The output will be in the `dist` folder.

## License

MIT
