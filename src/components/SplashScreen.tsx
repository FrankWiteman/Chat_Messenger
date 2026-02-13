
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        // Wait 2.5 seconds before starting the fade out
        const exitTimer = setTimeout(() => {
            setExiting(true);
        }, 2500);

        // Unmount component at 3 seconds (allowing 500ms for fade out)
        const finishTimer = setTimeout(() => {
            onFinish();
        }, 3000);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 w-full h-full z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ease-in-out ${exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Glossy Background Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-100"></div>
            
            {/* Gloss Highlight Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-40 pointer-events-none"></div>

            {/* Subtle Texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            
            {/* Logo Container with Custom Dramatic Pulse */}
            <div className="mb-8 relative w-40 h-40 z-10 animate-dramatic-pulse">
                 {/* Custom BBM Logo */}
                 <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="logo_grad_splash" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#444444" /> {/* Lighter Gray Highlight for gloss */}
                            <stop offset="50%" stopColor="#0a0a0a" /> {/* Pure Black */}
                            <stop offset="100%" stopColor="#000000" />
                        </linearGradient>
                    </defs>

                    <path 
                        d="M20,25 H100 A12,12 0 0 1 112,37 V83 A12,12 0 0 1 100,95 H35 L15,110 V95 H20 A12,12 0 0 1 8,83 V37 A12,12 0 0 1 20,25 Z" 
                        fill="url(#logo_grad_splash)" 
                        stroke="#ffffff" 
                        strokeWidth="2.5"
                        filter="drop-shadow(0 10px 10px rgba(0,0,0,1))"
                    />
                    
                    <g transform="translate(60, 60) skewX(-15)">
                         <rect x="-28" y="-22" width="16" height="12" rx="3" fill="white" className="drop-shadow-sm" />
                         <rect x="-28" y="-6" width="16" height="12" rx="3" fill="white" className="drop-shadow-sm" />
                         <rect x="-8" y="-22" width="16" height="12" rx="3" fill="white" className="drop-shadow-sm" />
                         <rect x="-8" y="-6" width="16" height="12" rx="3" fill="white" className="drop-shadow-sm" />
                         <rect x="-8" y="10" width="16" height="12" rx="3" fill="white" className="drop-shadow-sm" />
                         <rect x="12" y="-6" width="16" height="12" rx="3" fill="white" className="drop-shadow-sm" />
                         <rect x="12" y="10" width="16" height="12" rx="3" fill="white" className="drop-shadow-sm" />
                    </g>
                </svg>
            </div>
            
            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight drop-shadow-md z-10 font-sans">BBM <span className="font-light text-gray-300">Reborn</span></h1>
            
            <p className="text-gray-500 text-xs font-bold tracking-[0.2em] z-10 uppercase mt-4">BlackBerry Messenger</p>

            <style>{`
                @keyframes dramaticPulse {
                    0% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255,255,255,0.1)); }
                    50% { transform: scale(1.05); filter: drop-shadow(0 0 40px rgba(0,168,232,0.4)); }
                    100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255,255,255,0.1)); }
                }
                .animate-dramatic-pulse {
                    animation: dramaticPulse 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
