
import React, { useState, useRef } from 'react';
import NotificationBell from './NotificationBell';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';
import { NAV_ITEMS } from '../constants';
import { UserRole } from '../types';
import { supabase } from '../src/lib/supabase';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, setCurrentUser, branches, updateUser, selectedBranchId, setSelectedBranchId, attendance, recordAttendance, updateAttendance, showToast } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);



  // Stop camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  // Start camera stream
  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please allow camera permissions.");
      setIsCameraOpen(false);
    }
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob and upload
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });

            // Re-use the existing file change logic but pass a mock event or call upload directly
            // Since handleFileChange expects an event, let's extract the upload logic or just create a synthetic event
            // Better: Create a dedicated upload function
            handleFileUpload(file);
          }
        }, 'image/jpeg');

        stopCamera();
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    setIsUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateUser(currentUser.id, { avatar: publicUrl });
      alert('Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert('Error uploading avatar: ' + (error.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const [accountData, setAccountData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    emergencyContact: currentUser?.emergencyContact || '',
    address: currentUser?.address || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  if (!currentUser) return null;

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));
  const userBranch = branches.find(b => b.id === currentUser.branchId);

  // Primary items for the bottom bar (limited to 5)
  const mobileBottomNavItems = filteredNav.slice(0, 5);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    navigate('/login', { replace: true });
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Handle Password Change
      if (passwordData.newPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          alert("New passwords do not match!");
          return;
        }

        if (passwordData.newPassword.length < 6) {
          alert("Password must be at least 6 characters!");
          return;
        }

        // Verify current password by attempting to sign in with it
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: passwordData.currentPassword
        });

        if (signInError) {
          alert("Incorrect current password!");
          return;
        }

        // Update to new password
        const { error: updateError } = await supabase.auth.updateUser({
          password: passwordData.newPassword
        });

        if (updateError) {
          alert("Failed to update password: " + updateError.message);
          return;
        }

        // Update local user data (name, address, emergency contact)
        await updateUser(currentUser.id, accountData);

        alert("Password updated successfully!");
      } else {
        // Just update profile data without password change
        await updateUser(currentUser.id, accountData);
        alert("Profile updated successfully!");
      }

      setIsAccountModalOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Account update error:', err);
      alert("Failed to update account: " + err.message);
    }
  };



  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (mainContentRef.current && mainContentRef.current.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current !== null && mainContentRef.current && mainContentRef.current.scrollTop === 0) {
      const currentTouch = e.touches[0].clientY;
      const distance = currentTouch - touchStartRef.current;

      if (distance > 0) {
        // Apply resistance
        const newDistance = Math.min(distance * 0.4, 150);
        setPullDistance(newDistance);
        if (newDistance > 80) {
          // Prevent default scrolling when pulling down enough to refresh
          if (e.cancelable) e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 100) {
      setIsRefreshing(true);
      setPullDistance(80); // Snap to threshold
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } else {
      setPullDistance(0);
    }
    touchStartRef.current = null;
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50 font-sans flex-col">
      {/* Status Bar Spacer — fills behind Android status bar / iOS notch */}
      <div className="safe-area-top bg-white shrink-0 md:hidden" />

      <div className="flex flex-1 overflow-hidden relative">
        {isMobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] transition-opacity animate-[fadeIn_0.2s_ease-out]"
            onClick={closeMobileMenu}
          />
        )}

      {/* Sidebar - Desktop (Permanent) & Mobile (Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] bg-slate-900 text-white transition-transform duration-300 transform 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 flex flex-col shadow-2xl shrink-0
        ${isSidebarOpen ? 'w-72' : 'w-20'}
      `}>
        {/* Sidebar Header — safe area for notch/status bar on mobile */}
        <div className="safe-area-top-h md:hidden bg-slate-900 shrink-0" />
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="IronFlow Logo" className="w-10 h-10 object-contain" />
            {(isSidebarOpen || isMobileMenuOpen) && (
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-widest uppercase leading-tight truncate">IronFlow</span>
                <span className="text-[8px] font-bold tracking-[0.2em] text-blue-400 opacity-80 uppercase leading-none">Gym Manager</span>
              </div>
            )}
          </div>
          <button onClick={closeMobileMenu} className="md:hidden text-slate-400 hover:text-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Full Navigation List */}
        <nav className="flex-1 mt-6 overflow-y-auto sidebar-scroll">
          <div className="pb-32">
            {filteredNav.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-800 transition-all ${isActive ? 'bg-slate-800 border-l-4 border-blue-500 text-blue-400 font-bold' : 'text-slate-400'}`}
                >
                  <span className="text-xl w-6 flex justify-center">{item.icon}</span>
                  {(isSidebarOpen || isMobileMenuOpen) && <span className="font-medium text-sm truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Bottom Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => {
              setAccountData({
                name: currentUser.name,
                email: currentUser.email,
                emergencyContact: currentUser.emergencyContact || '',
                address: currentUser.address || ''
              });
              setIsAccountModalOpen(true);
            }}
            className={`w-full flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all font-bold text-sm ${(!isSidebarOpen && !isMobileMenuOpen) && 'justify-center px-0'}`}
          >
            <i className="fas fa-cog text-lg"></i>
            {(isSidebarOpen || isMobileMenuOpen) && <span>SETTINGS</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-bold text-sm ${(!isSidebarOpen && !isMobileMenuOpen) && 'justify-center px-0'}`}
          >
            <i className="fas fa-sign-out-alt text-lg"></i>
            {(isSidebarOpen || isMobileMenuOpen) && <span>LOGOUT</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b h-auto min-h-[4rem] md:min-h-[5rem] flex items-center justify-between px-4 md:px-8 z-20 shadow-sm shrink-0 safe-top">
          {/* Header Left: Navigation & Title */}
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden min-w-0 flex-1">
            {/* Hamburger for Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-lg shrink-0"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
            {/* Sidebar Toggle for Desktop */}
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="hidden md:flex text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-lg shrink-0">
              <i className={`fas ${isSidebarOpen ? 'fa-indent' : 'fa-outdent'} text-xl`}></i>
            </button>
            {currentUser.role === UserRole.SUPER_ADMIN ? (
              <select
                className="bg-transparent border-none text-sm md:text-lg font-black text-gray-800 tracking-tight focus:ring-0 cursor-pointer outline-none max-w-[150px] md:max-w-none"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                <option value="all">IronFlow Global</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : (
              <h1 className="text-sm md:text-lg font-black text-gray-800 tracking-tight truncate pr-2">
                {userBranch ? userBranch.name : 'IronFlow Global'}
              </h1>
            )}
          </div>

          {/* Header Right: User Info */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-auto pl-2">
            <button className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-lg shrink-0">
              <i className="fas fa-search text-lg"></i>
            </button>
            <NotificationBell />
            <div
              className="relative group cursor-pointer shrink-0 ml-1"
              onClick={() => setIsAccountModalOpen(true)}
            >
              <img src={currentUser.avatar} alt="User" className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl border-2 border-white shadow-md object-cover transition-transform group-hover:scale-105" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
          </div>
        </header>

        <main
          ref={mainContentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50 pb-32 md:pb-8 relative"
        >
          {/* Pull to Refresh Indicator */}
          {pullDistance > 0 && (
            <div
              className={`absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none transition-opacity ${isRefreshing ? 'opacity-100' : 'opacity-80'}`}
              style={{ height: `${pullDistance}px`, transform: `translateY(0)` }}
            >
              <div className={`bg-white shadow-xl rounded-full p-2 border border-gray-100 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
                style={{ transform: `rotate(${pullDistance * 3}deg)` }}>
                <i className={`fas ${isRefreshing ? 'fa-sync-alt' : 'fa-arrow-down'} text-blue-600`}></i>
              </div>
            </div>
          )}

          <div style={{ paddingTop: isRefreshing ? '80px' : `${pullDistance * 0.5}px`, transition: pullDistance === 0 ? 'padding-top 0.3s ease-out' : 'none' }}>
            {children}
          </div>
        </main>

        {/* Bottom Quick-Nav for Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 flex items-center justify-around px-1 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] rounded-t-[3rem] safe-area-pb" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', paddingTop: '12px' }}>
          {mobileBottomNavItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 transition-all flex-1 min-w-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <span className={`text-[1.3rem] mb-0.5 ${isActive ? 'scale-110 font-bold' : ''}`}>{item.icon}</span>
                <span className={`text-[8px] font-black uppercase tracking-widest truncate w-full text-center px-1 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
                {isActive && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1 animate-pulse"></span>}
              </Link>
            );
          })}
          {/* "More" Trigger for the Sidebar Drawer */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 transition-all flex-1 min-w-0 text-slate-400"
          >
            <i className="fas fa-ellipsis-h text-[1.3rem] mb-0.5"></i>
            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">More</span>
          </button>
        </nav>
      </div>

      {/* Account Settings Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90dvh] flex flex-col">
            <div className="bg-slate-900 p-6 md:p-8 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Account Profile</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage your identity</p>
              </div>
              <button onClick={() => setIsAccountModalOpen(false)} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateAccount} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
              {/* Avatar Upload Section */}
              <div className="flex flex-col items-center mb-2">
                <div className={`relative group ${currentUser.role !== UserRole.MEMBER ? 'cursor-pointer' : ''}`} onClick={currentUser.role !== UserRole.MEMBER ? handleAvatarClick : undefined}>
                  <img
                    src={currentUser.avatar || "https://ui-avatars.com/api/?name=" + currentUser.name}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg group-hover:opacity-75 transition-opacity"
                  />
                  {currentUser.role !== UserRole.MEMBER && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="fas fa-camera text-white text-2xl"></i>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                      <i className="fas fa-spinner fa-spin text-white text-2xl"></i>
                    </div>
                  )}
                </div>
                {currentUser.role !== UserRole.MEMBER && (
                  <div className="flex gap-4 mt-3">
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      className="text-[10px] text-blue-500 font-bold uppercase tracking-widest hover:text-blue-600 flex items-center gap-1"
                    >
                      <i className="fas fa-upload"></i> Upload
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="text-[10px] text-blue-500 font-bold uppercase tracking-widest hover:text-blue-600 flex items-center gap-1"
                    >
                      <i className="fas fa-camera"></i> Take Photo
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />

                {/* Camera Modal Overlay */}
                {isCameraOpen && (
                  <div className="fixed inset-0 bg-black z-[110] flex flex-col items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                      <canvas ref={canvasRef} className="hidden" />

                      <div className="absolute top-4 right-4 z-10">
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-all"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-end pb-10">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all active:scale-95 shadow-lg shadow-black/50"
                        >
                          <div className="w-16 h-16 bg-white rounded-full"></div>
                        </button>
                      </div>
                    </div>
                    <p className="text-white/50 text-xs mt-6 font-medium uppercase tracking-widest">Make sure your face is clearly visible</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input
                    required
                    className="w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={accountData.name}
                    onChange={e => setAccountData({ ...accountData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</label>
                <div className="relative">
                  <i className="fas fa-map-marker-alt absolute left-4 top-4 text-slate-300"></i>
                  <textarea
                    className="w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={accountData.address}
                    onChange={e => setAccountData({ ...accountData, address: e.target.value })}
                    placeholder="Residential Address"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-life-ring"></i> Emergency Contact
                </label>
                <div className="relative">
                  <i className="fas fa-phone-medical absolute left-4 top-1/2 -translate-y-1/2 text-red-200"></i>
                  <input
                    required
                    type="tel"
                    className="w-full p-4 pl-12 bg-red-50 border border-red-100 text-red-700 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-black"
                    value={accountData.emergencyContact}
                    onChange={e => setAccountData({ ...accountData, emergencyContact: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input
                    required
                    type="email"
                    className="w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={accountData.email}
                    onChange={e => setAccountData({ ...accountData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-dashed border-gray-200">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 block">
                  <i className="fas fa-lock mr-2"></i> Security & Password
                </label>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Current Password"
                    className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="password"
                      placeholder="New Password"
                      className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                      value={passwordData.confirmPassword}
                      onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3 shrink-0">
                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                >
                  SAVE CHANGES
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all"
                >
                  LOGOUT SESSION
                </button>
              </div>
            </form>
          </div>
        </div>
      )
      }

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        /* Custom Sidebar Scrollbar */
        .sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #334155; /* slate-700 */
          border-radius: 10px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #475569; /* slate-600 */
        }
        
        /* Safe area for Android gesture nav bar AND iOS home indicator */
        .safe-area-pb {
          padding-bottom: calc(12px + env(safe-area-inset-bottom, 16px));
        }
      `}</style>
      </div>{/* END flex-1 inner container */}
    </div >
  );
};

export default Layout;
