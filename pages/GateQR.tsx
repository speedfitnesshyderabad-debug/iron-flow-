import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';

const GateQR: React.FC = () => {
    const { currentUser, branches, setCurrentUser } = useAppContext();
    const navigate = useNavigate();
    const [qrToken, setQrToken] = useState<string>('');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<{ success: boolean; message: string } | null>(null);
    const [showSoundPicker, setShowSoundPicker] = useState(false);
    const [successSound, setSuccessSound] = useState<string>(() => localStorage.getItem('gate_success_sound') || 'chime');
    const [failureSound, setFailureSound] = useState<string>(() => localStorage.getItem('gate_failure_sound') || 'buzz');

    // Identify the branch to show
    const [selectedBranchId, setSelectedBranchId] = useState<string>(currentUser?.branchId || branches[0]?.id || '');

    // Update selected branch if branches load later or user changes
    useEffect(() => {
        if (!selectedBranchId && branches.length > 0) {
            if (branches[0]) setSelectedBranchId(branches[0].id);
        }
    }, [branches, selectedBranchId]);

    const activeBranchId = selectedBranchId;
    const activeBranch = branches.find(b => b.id === activeBranchId);

    // 🕯️ Screen Wake Lock — prevents tablet sleep while on this page
    useEffect(() => {
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    console.log('✅ Wake Lock Active: Screen will not sleep');
                }
            } catch (err) {
                console.warn('❌ Wake Lock failed:', err);
            }
        };

        requestWakeLock();

        // Re-request if page becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') requestWakeLock();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (wakeLock) wakeLock.release();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // QR Token generation (rotates every 5 seconds)
    useEffect(() => {
        if (!activeBranchId) return;

        const generateToken = () => {
            const timestamp = Date.now();
            setQrToken(JSON.stringify({
                type: 'ENTRY',
                branchId: activeBranchId,
                expiresAt: timestamp + 10000
            }));
        };

        generateToken();
        const interval = setInterval(generateToken, 5000);
        return () => clearInterval(interval);
    }, [activeBranchId]);

    // 🎵 Sound library — multiple styles for success and failure
    const playSoundById = (id: string) => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            const beep = (freq: number, type: OscillatorType, start: number, duration: number, gain = 0.3) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.connect(g); g.connect(ctx.destination);
                osc.type = type;
                osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
                g.gain.setValueAtTime(gain, ctx.currentTime + start);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
                osc.start(ctx.currentTime + start);
                osc.stop(ctx.currentTime + start + duration);
            };

            switch (id) {
                // ✅ SUCCESS SOUNDS
                case 'chime': // Ascending two-tone chime
                    beep(880, 'sine', 0, 0.2);
                    beep(1320, 'sine', 0.18, 0.3);
                    break;
                case 'fanfare': // Three ascending notes
                    beep(523, 'sine', 0, 0.15);
                    beep(659, 'sine', 0.15, 0.15);
                    beep(784, 'sine', 0.3, 0.3);
                    break;
                case 'bell': // Warm bell tone
                    beep(1046, 'sine', 0, 0.6, 0.4);
                    beep(1318, 'sine', 0, 0.3, 0.15);
                    break;
                case 'blip': // Quick double blip
                    beep(1200, 'square', 0, 0.08, 0.15);
                    beep(1500, 'square', 0.1, 0.08, 0.15);
                    break;
                case 'powerup': // Rising power-up
                    beep(440, 'sine', 0, 0.1);
                    beep(550, 'sine', 0.1, 0.1);
                    beep(660, 'sine', 0.2, 0.1);
                    beep(880, 'sine', 0.3, 0.25);
                    break;
                // ❌ FAILURE SOUNDS
                case 'buzz': // Low sawtooth buzz
                    beep(200, 'sawtooth', 0, 0.4, 0.35);
                    break;
                case 'double-buzz': // Two short buzzes
                    beep(180, 'sawtooth', 0, 0.2, 0.3);
                    beep(180, 'sawtooth', 0.25, 0.2, 0.3);
                    break;
                case 'descend': // Descending tone
                    {
                        const osc = ctx.createOscillator();
                        const g = ctx.createGain();
                        osc.connect(g); g.connect(ctx.destination);
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(600, ctx.currentTime);
                        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.5);
                        g.gain.setValueAtTime(0.3, ctx.currentTime);
                        g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                        osc.start(); osc.stop(ctx.currentTime + 0.5); break;
                    }
                case 'alarm': // Rapid high-low alarm
                    beep(800, 'square', 0, 0.1, 0.2);
                    beep(400, 'square', 0.12, 0.1, 0.2);
                    beep(800, 'square', 0.24, 0.1, 0.2);
                    beep(400, 'square', 0.36, 0.1, 0.2);
                    break;
                case 'error-tone': // Classic error beep
                    beep(330, 'triangle', 0, 0.15);
                    beep(220, 'triangle', 0.18, 0.3);
                    break;
            }
        } catch (e) {
            console.error('Kiosk audio failed', e);
        }
    };

    const playKioskSound = (type: 'success' | 'error') => {
        playSoundById(type === 'success' ? successSound : failureSound);
    };

    // 📡 Subscribe to Supabase Realtime — works cross-device (member mobile → kiosk PC)
    useEffect(() => {
        if (!activeBranchId) return;

        const channel = supabase.channel(`gate-result-${activeBranchId}`)
            .on('broadcast', { event: 'scan_result' }, ({ payload }) => {
                const { success, message } = payload;
                setScanFeedback({ success, message });
                playKioskSound(success ? 'success' : 'error');
                setTimeout(() => setScanFeedback(null), 4000);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeBranchId]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        navigate('/login', { replace: true });
    };

    if (!currentUser) return null;

    if (!activeBranch) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">No Branch Assigned</h1>
                    <p className="text-slate-400">Please contact administrator to assign a branch to this Kiosk.</p>
                </div>
            </div>
        );
    }

    // ✅ Full-screen Feedback Overlay
    if (scanFeedback) {
        return (
            <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-300 ${scanFeedback.success ? 'bg-green-600' : 'bg-red-600'}`}>
                {/* Radial glow */}
                <div className={`absolute inset-0 ${scanFeedback.success ? 'bg-green-400/20' : 'bg-red-400/20'} blur-[120px] rounded-full`}></div>

                <div className="relative z-10 text-center px-10 animate-[bounceIn_0.4s_ease-out]">
                    {/* Big icon */}
                    <div className="w-40 h-40 mx-auto rounded-full flex items-center justify-center mb-8 shadow-2xl bg-white/20">
                        <i className={`fas ${scanFeedback.success ? 'fa-check' : 'fa-times'} text-white text-7xl`}></i>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
                        {scanFeedback.success ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                    </h1>

                    <p className="text-xl md:text-2xl text-white/80 font-semibold max-w-lg mx-auto leading-relaxed">
                        {scanFeedback.message}
                    </p>

                    {/* Auto-reset progress bar */}
                    <div className="mt-10 w-64 mx-auto h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full"
                            style={{ animation: 'shrink 4s linear forwards' }}
                        ></div>
                    </div>
                    <p className="text-white/50 text-sm font-bold uppercase tracking-widest mt-3">Next scan ready in 4s</p>
                </div>

                <style>{`
                    @keyframes bounceIn {
                        0% { transform: scale(0.7); opacity: 0; }
                        60% { transform: scale(1.05); opacity: 1; }
                        100% { transform: scale(1); }
                    }
                    @keyframes shrink {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 relative overflow-hidden transition-all duration-500 selection:bg-blue-500 selection:text-white`}>

            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-full h-1/2 bg-purple-600/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>

            {/* Header / Info */}
            <div className={`text-center mb-12 relative z-10 transition-all ${isFullScreen ? 'scale-110 mb-16' : ''}`}>
                <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 mb-6 shadow-xl">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></span>
                    <span className="text-sm font-bold text-white tracking-widest uppercase">Live Gate Access</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter mb-4 drop-shadow-2xl">
                    {activeBranch.name}
                </h1>
                <p className="text-lg md:text-xl text-slate-400 font-medium tracking-wide">
                    Scan to <span className="text-blue-400 font-bold">Check-In</span> or <span className="text-blue-400 font-bold">Check-Out</span>
                </p>
            </div>

            {/* QR Card */}
            <div className={`relative group z-10 transition-all duration-500 ${isFullScreen ? 'scale-125' : 'scale-100 hover:scale-105'}`}>
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[3rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>

                <div className="relative bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center">
                    <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border-4 border-slate-100 mb-6 relative overflow-hidden">
                        {/* Scan Line Animation */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_15px_#3b82f6] z-10 animate-[scan_2s_linear_infinite]"></div>

                        <QRCodeSVG
                            value={qrToken}
                            size={320}
                            level="H"
                            includeMargin={true}
                            className="w-64 h-64 md:w-80 md:h-80"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-3 h-3 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Refreshes automatically
                        </p>
                    </div>

                    {/* Timer Circle (Visual Only) */}
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                        <i className="fas fa-bolt text-yellow-400 animate-pulse"></i>
                    </div>
                </div>
            </div>

            {/* Footer / Controls */}
            <div className="mt-12 flex gap-4 relative z-10 flex-wrap justify-center">
                {/* Branch Selector for Super Admin */}
                {currentUser.role === UserRole.SUPER_ADMIN && (
                    <div className="relative">
                        <select
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            className="appearance-none bg-white/10 hover:bg-white/20 text-white font-bold py-4 pl-6 pr-12 rounded-2xl border border-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all uppercase tracking-widest text-sm"
                        >
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id} className="text-slate-900 bg-white">
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                            <i className="fas fa-chevron-down"></i>
                        </div>
                    </div>
                )}

                {(currentUser.role !== UserRole.KIOSK || currentUser.role === UserRole.SUPER_ADMIN) && (
                    <>
                        <button
                            onClick={toggleFullScreen}
                            className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 text-sm"
                        >
                            <i className={`fas ${isFullScreen ? 'fa-compress' : 'fa-expand'}`}></i>
                            {isFullScreen ? 'Exit Full Screen' : 'Full Screen Mode'}
                        </button>
                        <button
                            onClick={() => setShowSoundPicker(true)}
                            className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 text-sm"
                        >
                            <i className="fas fa-volume-up"></i>
                            Sound Settings
                        </button>
                    </>
                )}
            </div>

            {/* KIOSK Specific Footer */}
            {currentUser.role === UserRole.KIOSK && !isFullScreen && (
                <div className="fixed bottom-8 right-8 z-50 flex gap-4">
                    <button
                        onClick={() => setShowSoundPicker(true)}
                        className="w-16 h-16 bg-slate-800 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-700 transition-transform hover:scale-110 active:scale-90"
                    >
                        <i className="fas fa-volume-up text-xl"></i>
                    </button>
                    <button
                        onClick={toggleFullScreen}
                        className="w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-transform hover:scale-110 active:scale-90"
                    >
                        <i className="fas fa-expand text-xl"></i>
                    </button>
                </div>
            )}

            {/* Sound Picker Modal */}
            {showSoundPicker && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-lg w-full shadow-2xl animate-[fadeIn_0.2s_ease-out] max-h-[90dvh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Sound Settings</h2>
                            <button onClick={() => setShowSoundPicker(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Success Sound Picker */}
                            <div>
                                <h3 className="text-xs font-black text-green-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i className="fas fa-check-circle"></i> Success Sound
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {['chime', 'fanfare', 'bell', 'powerup', 'blip'].map(sound => (
                                        <div key={sound} className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSuccessSound(sound);
                                                    localStorage.setItem('gate_success_sound', sound);
                                                    playSoundById(sound);
                                                }}
                                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-left ${successSound === sound ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {sound}
                                            </button>
                                            <button
                                                onClick={() => playSoundById(sound)}
                                                className="w-12 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"
                                                title={`Preview ${sound}`}
                                            >
                                                <i className="fas fa-play text-xs"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-slate-100 border-2" />

                            {/* Failure Sound Picker */}
                            <div>
                                <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i className="fas fa-times-circle"></i> Failure Sound
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {['buzz', 'double-buzz', 'descend', 'alarm', 'error-tone'].map(sound => (
                                        <div key={sound} className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setFailureSound(sound);
                                                    localStorage.setItem('gate_failure_sound', sound);
                                                    playSoundById(sound);
                                                }}
                                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-left ${failureSound === sound ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {sound}
                                            </button>
                                            <button
                                                onClick={() => playSoundById(sound)}
                                                className="w-12 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"
                                                title={`Preview ${sound}`}
                                            >
                                                <i className="fas fa-play text-xs"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <button onClick={() => setShowSoundPicker(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default GateQR;
