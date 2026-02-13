import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import type { User } from '../types';
import { fbLogin, fbRegister } from '../services/authService';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, AlertTriangle, ScanFace, LogIn, CheckCircle2 } from 'lucide-react';

interface AuthProps {
    screen: Screen;
    onNavigate: (screen: Screen) => void;
    onLoginSuccess: (user: User) => void;
}

const getSavedProfile = () => {
    try {
        const saved = localStorage.getItem('bbm_saved_profile');
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        if (!parsed.pin || parsed.pin === 'UNKNOWN' || parsed.pin === 'PENDING') return null;
        return parsed;
    } catch { return null; }
};

const AuthLogo = () => (
    <div className="flex flex-col items-center mb-8 shrink-0">
        <div className="relative group cursor-pointer w-28 h-28 md:w-36 md:h-36 transition-transform duration-500 hover:scale-105">
             <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-2xl overflow-visible">
                <defs>
                    <linearGradient id="logo_grad_auth" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#38BDF8" /> 
                        <stop offset="100%" stopColor="#00A8E8" /> 
                    </linearGradient>
                </defs>
                <path d="M20,25 H100 A12,12 0 0 1 112,37 V83 A12,12 0 0 1 100,95 H35 L15,110 V95 H20 A12,12 0 0 1 8,83 V37 A12,12 0 0 1 20,25 Z" fill="url(#logo_grad_auth)" stroke="#fff" strokeWidth="2" />
                <g transform="translate(60, 60) skewX(-15)">
                     <rect x="-28" y="-22" width="16" height="12" rx="3" fill="white" />
                     <rect x="-28" y="-6" width="16" height="12" rx="3" fill="white" />
                     <rect x="-8" y="-22" width="16" height="12" rx="3" fill="white" />
                     <rect x="-8" y="-6" width="16" height="12" rx="3" fill="white" />
                     <rect x="-8" y="10" width="16" height="12" rx="3" fill="white" />
                     <rect x="12" y="-6" width="16" height="12" rx="3" fill="white" />
                     <rect x="12" y="10" width="16" height="12" rx="3" fill="white" />
                </g>
            </svg>
        </div>
        <h1 className="text-white font-extrabold text-2xl mt-4 tracking-tight">BBM <span className="font-light opacity-80">Reborn</span></h1>
    </div>
);

const InputField: React.FC<any> = ({ icon: Icon, isPassword, ...props }) => {
    const [showPass, setShowPass] = useState(false);
    return (
        <div className="relative mb-3 group shrink-0">
            <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-bbm-blue transition-colors"><Icon size={20} /></div>
            <input type={isPassword ? (showPass ? "text" : "password") : props.type || "text"} className="w-full bg-white border-none rounded-xl py-3.5 pl-12 pr-12 text-slate-800 placeholder-gray-400 text-sm shadow-lg focus:ring-2 focus:ring-blue-400/50 transition-all outline-none" {...props} />
            {isPassword && ( <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none" tabIndex={-1}>{showPass ? <EyeOff size={20} /> : <Eye size={20} />}</button> )}
        </div>
    );
};

export const LoginScreen: React.FC<AuthProps> = ({ onNavigate, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [savedProfile, setSavedProfile] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [viewMode, setViewMode] = useState<'quick' | 'standard'>('standard');
    const [rememberMe, setRememberMe] = useState(true);

    useEffect(() => {
        const profile = getSavedProfile();
        if (profile) {
            setSavedProfile(profile);
            setViewMode('quick');
        } else {
            setViewMode('standard');
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await fbLogin(email, password);
        setLoading(false);
        if (res.success && res.user) {
            if (rememberMe) {
                localStorage.setItem('bbm_saved_profile', JSON.stringify({
                    name: res.user.name,
                    avatarUrl: res.user.avatarUrl,
                    email: res.user.email,
                    id: res.user.id,
                    pin: res.user.pin
                }));
            }
            onLoginSuccess(res.user);
        }
        else setError(res.message || 'Login failed');
    };

    const handleQuickLogin = async () => {
        setIsScanning(true);
        setTimeout(async () => {
            setIsScanning(false);
            if (savedProfile) {
                const restoredUser: User = {
                    ...savedProfile,
                    status: 'Available',
                    statusMessage: 'Welcome back!',
                    showActivity: true,
                    showLastSeen: true,
                    lastActive: Date.now()
                };
                onLoginSuccess(restoredUser);
            }
        }, 1200);
    };

    if (viewMode === 'quick' && savedProfile) {
        return (
            <div className="fixed inset-0 z-[100] h-[100dvh] w-full bg-bbm-blue flex flex-col items-center justify-center animate-fade-in overscroll-none touch-none">
                <div className="w-full max-w-sm px-8 flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="w-32 h-32 rounded-full p-1.5 bg-white/20 backdrop-blur-sm border border-white/30 shadow-2xl relative overflow-hidden">
                            <img src={savedProfile.avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover bg-white" />
                            {isScanning && (
                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                    <div className="w-full h-1 bg-white/60 absolute animate-[scan_1.5s_infinite_linear]"></div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-1">Welcome back,</h2>
                    <h1 className="text-3xl font-black text-white mb-8">{savedProfile.name}</h1>

                    <button 
                        onClick={handleQuickLogin}
                        disabled={isScanning}
                        className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 mb-6 group"
                    >
                        {isScanning ? (
                            <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Verifying...</span>
                        ) : (
                            <><ScanFace size={24} /><span>Unlock BBM</span></>
                        )}
                    </button>

                    <button 
                        onClick={() => setViewMode('standard')}
                        className="flex items-center gap-2 text-white/70 text-sm font-medium hover:text-white transition-colors py-2"
                    >
                        <LogIn size={16} /> Switch Account or Use Password
                    </button>
                </div>
                <style>{`
                    @keyframes scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
                `}</style>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] h-[100dvh] w-full bg-bbm-blue flex flex-col justify-center px-8 animate-fade-in overflow-y-auto overscroll-none pb-8">
            <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col pt-12">
                <AuthLogo />
                <form onSubmit={handleLogin}>
                    {error && <div className="bg-red-500/90 text-white p-3 rounded-xl text-sm mb-4 font-medium flex items-center gap-2 shadow-sm"><AlertTriangle size={16}/>{error}</div>}
                    <InputField icon={Mail} placeholder="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                    <InputField icon={Lock} isPassword placeholder="Password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
                    
                    <div className="flex items-center justify-between mb-6 px-1">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-white border-white text-bbm-blue' : 'border-white/50 bg-transparent'}`}>
                                {rememberMe && <CheckCircle2 size={14} strokeWidth={4} />}
                            </div>
                            <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} className="hidden" />
                            <span className="text-white/80 text-xs font-medium group-hover:text-white">Remember Me</span>
                        </label>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-[#084166] text-white font-bold py-4 rounded-xl shadow-xl mb-4 hover:bg-[#063350] transition-colors active:scale-[0.98] mt-2">
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                    
                    <div className="flex items-center justify-center gap-2 text-white/90 text-sm mt-4">
                        <span>New to BBM?</span>
                        <button type="button" onClick={() => onNavigate(Screen.REGISTER)} className="font-bold underline hover:text-white">Create Account</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const RegisterScreen: React.FC<AuthProps> = ({ onNavigate, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await fbRegister(username, email, password);
        setLoading(false);
        if (res.success && res.user) onLoginSuccess(res.user);
        else setError(res.message || 'Registration failed');
    };

    return (
        <div className="fixed inset-0 z-[100] h-[100dvh] w-full bg-bbm-blue flex flex-col justify-center px-8 animate-fade-in overflow-y-auto overscroll-none pb-8">
            <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col pt-12">
                <AuthLogo />
                <form onSubmit={handleRegister}>
                    {error && <div className="bg-red-500/90 text-white p-3 rounded-xl text-sm mb-4 font-medium flex items-center gap-2 shadow-sm"><AlertTriangle size={16}/>{error}</div>}
                    <InputField icon={UserIcon} placeholder="Display Name" value={username} onChange={(e: any) => setUsername(e.target.value)} />
                    <InputField icon={Mail} placeholder="Email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                    <InputField icon={Lock} isPassword placeholder="Password" value={password} onChange={(e: any) => setPassword(e.target.value)} />
                    <button type="submit" disabled={loading} className="w-full bg-[#084166] text-white font-bold py-4 rounded-xl shadow-xl mb-6 hover:bg-[#063350] transition-colors active:scale-[0.98] mt-2">
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                    <button type="button" onClick={() => onNavigate(Screen.LOGIN)} className="w-full text-white/80 font-bold flex items-center justify-center gap-2 hover:text-white transition-colors">Back to Login</button>
                </form>
            </div>
        </div>
    );
};

export const TwoFAScreen: React.FC<AuthProps> = () => <div/>; 
export const ForgotPasswordScreen: React.FC<AuthProps> = () => <div/>;
