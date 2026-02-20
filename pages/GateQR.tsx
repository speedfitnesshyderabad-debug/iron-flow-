import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { QRCodeSVG } from 'qrcode.react'; // Using the SVG component directly like in BranchQR
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

const GateQR: React.FC = () => {
    const { currentUser, branches } = useAppContext();
    const navigate = useNavigate();
    const [qrToken, setQrToken] = useState<string>('');
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Identify the branch to show
    // KIOSK/MANAGER/RECEPTIONIST -> Their assigned branch
    // SUPER_ADMIN -> First branch or prompts (For now, default to first branch)
    const [selectedBranchId, setSelectedBranchId] = useState<string>(currentUser?.branchId || (branches.length > 0 ? branches[0].id : ''));

    // Update selected branch if branches load later or user changes
    useEffect(() => {
        if (!selectedBranchId && branches.length > 0) {
            setSelectedBranchId(branches[0].id);
        }
    }, [branches, selectedBranchId]);

    const activeBranchId = selectedBranchId;
    const activeBranch = branches.find(b => b.id === activeBranchId);

    useEffect(() => {
        if (!activeBranchId) return;

        // Generate token immediately and then every 5 seconds
        const generateToken = () => {
            const timestamp = Date.now();
            setQrToken(JSON.stringify({
                type: 'ENTRY',
                branchId: activeBranchId,
                // Valid for 10 seconds (5s refresh + 5s buffer)
                expiresAt: timestamp + 10000
            }));
        };

        generateToken();
        const interval = setInterval(generateToken, 5000); // 5 Seconds Refresh

        return () => clearInterval(interval);
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

    const handleLogout = () => {
        // Simple logout for KIOSK users who might need to restart/close
        navigate('/login');
        // In a real KIOSK, you might hide this or require a PIN
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
                    <button
                        onClick={toggleFullScreen}
                        className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 text-sm"
                    >
                        <i className={`fas ${isFullScreen ? 'fa-compress' : 'fa-expand'}`}></i>
                        {isFullScreen ? 'Exit Full Screen' : 'Full Screen Mode'}
                    </button>
                )}
            </div>

            {/* KIOSK Specific Footer */}
            {currentUser.role === UserRole.KIOSK && !isFullScreen && (
                <div className="fixed bottom-8 right-8 z-50">
                    <button
                        onClick={toggleFullScreen}
                        className="w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-transform hover:scale-110 active:scale-90"
                    >
                        <i className="fas fa-expand text-xl"></i>
                    </button>
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
