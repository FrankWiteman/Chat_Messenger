import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Initialize App
const initApp = async () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }

  // Attempt to fetch Firebase config from hosting environment 
  // (automatically available on Firebase Hosting)
  try {
    const res = await fetch('/__/firebase/init.json');
    if (res.ok) {
      const config = await res.json();
      console.log("[BBM] Auto-detected Firebase Hosting Config");
      (window as any).FIREBASE_CONFIG_AUTO = config;
    }
  } catch (e) {
    // Fail silently, firebase.ts will use fallbacks
  }

  // Use dynamic import for App to ensure services/firebase.ts reads the config fetched above
  try {
    const { default: App } = await import('./App');
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.error("App Crash:", e);
    rootElement.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100vh;color:white;background:#00A8E8;font-family:sans-serif;padding:20px;text-align:center;"><div><h1 style="font-weight:900;font-size:2rem;margin-bottom:10px;">BBM System Error</h1><p style="opacity:0.8;">Failed to load system components. Please check your connection.</p><button onclick="window.location.reload()" style="margin-top:20px;background:white;color:#00A8E8;border:none;padding:12px 30px;border-radius:12px;font-weight:bold;cursor:pointer;">Retry</button></div></div>`;
  }
};

initApp();
