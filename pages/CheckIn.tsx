import React, { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { SubscriptionStatus, PlanType, UserRole } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../src/lib/supabase';

const CheckIn: React.FC = () => {
  const { users, subscriptions, plans, recordAttendance, updateAttendance, attendance, currentUser, branches, showToast, bookings, updateBooking } = useAppContext();
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; subType?: string; isCheckOut?: boolean; isCrossBranch?: boolean } | null>(null);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [isHardwareOnline] = useState(true);
  const [manualQRInput, setManualQRInput] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isScannerActive, setIsScannerActive] = useState(true); // tracks if camera is on

  // Ref for scanner to avoid stale closures
  const handleQRScanRef = React.useRef<((text: string) => void) | null>(null);
  const lastScanTextRef = React.useRef<string>('');
  const clearScanTextTimeout = React.useRef<any>(null);

  // Supabase Realtime broadcast — works cross-device (mobile → kiosk PC)
  const broadcastToGate = React.useCallback((success: boolean, message: string, branchId?: string) => {
    try {
      const channel = supabase.channel(`gate-result-${branchId || 'global'}`);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'scan_result',
            payload: { success, message, ts: Date.now() }
          }).then(() => supabase.removeChannel(channel));
        }
      });
    } catch (e) {
      console.error('Gate broadcast failed', e);
    }
  }, []);

  // Helper: Play Sound Feedback
  const playStatusSound = (type: 'success' | 'error') => {
    // Disable sounds for regular users checking in via phone
    if (currentUser?.role !== UserRole.KIOSK) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'success') {
        // High pitched "Ding"
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Octave jump
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.15);
      } else {
        // Low pitched "Buzz"
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  // Helper: Calculate distance between two coordinates in meters (Haversine Formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Permission granted
      setHasCameraPermission(true);
      setPermissionError(null);

      // Stop the stream immediately, we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      console.error("Camera permission error:", err);
      setHasCameraPermission(false);
      setPermissionError("Camera access denied. Please allow camera usage in your browser settings to scan QR codes.");
    }
  };

  const requestLocation = (highAccuracy = true) => {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationError(null);
    setUserLocation(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError(null);
      },
      (error) => {
        console.error("Error getting location:", error);

        // Handle specific errors
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable GPS in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location unavailable. Please check your GPS signal.");
            break;
          case error.TIMEOUT:
            if (highAccuracy) {
              console.log("High accuracy timed out, retrying with low accuracy...");
              requestLocation(false); // Retry with low accuracy
            } else {
              setLocationError("Location request timed out. Please try again.");
            }
            break;
          default:
            setLocationError("An unknown error occurred while getting location.");
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 5000 : 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    // Only request location on mount. Camera is requested AFTER location is found.
    requestLocation();
  }, []);

  // Step 2: Request Camera ONLY after Location is Locked
  useEffect(() => {
    if (userLocation && !hasCameraPermission) {
      requestCamera();
    }
  }, [userLocation]);

  useEffect(() => {
    if (!hasCameraPermission || !userLocation) return;
    if (!isScannerActive) return; // Camera is intentionally off

    const html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (lastScanTextRef.current === decodedText) return; // Prevent double scans
        lastScanTextRef.current = decodedText;
        if (clearScanTextTimeout.current) clearTimeout(clearScanTextTimeout.current);
        clearScanTextTimeout.current = setTimeout(() => { lastScanTextRef.current = ''; }, 5000);

        if (handleQRScanRef.current) {
          handleQRScanRef.current(decodedText);
        }
      },
      (error) => { }
    ).catch((err) => {
      console.error("Camera start failed, falling back to any camera:", err);
      html5QrCode.start(
        { facingMode: "user" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (lastScanTextRef.current === decodedText) return; // Prevent double scans
          lastScanTextRef.current = decodedText;
          if (clearScanTextTimeout.current) clearTimeout(clearScanTextTimeout.current);
          clearScanTextTimeout.current = setTimeout(() => { lastScanTextRef.current = ''; }, 5000);

          if (handleQRScanRef.current) {
            handleQRScanRef.current(decodedText);
          }
        },
        () => { }
      ).catch(console.error);
    });

    return () => {
      try {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => { });
        } else {
          html5QrCode.clear();
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, [hasCameraPermission, userLocation, isScannerActive]);

  const triggerHardwareGate = async (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch?.gateWebhookUrl) return;
    try {
      console.log(`Sending OPEN signal to turnstile at ${branch.gateWebhookUrl}`);
    } catch (e) {
      console.error("Failed to trigger hardware gate:", e);
    }
  };

  const handleQRScan = async (decodedText: string) => {
    let parsedData: any = null;

    // Attempt to parse as JSON
    try {
      parsedData = JSON.parse(decodedText);
    } catch (e) {
      // Not JSON — treat as legacy string format below
    }

    if (parsedData) {
      // Handle Class Completion (PT or Group) — completely isolated path
      if (parsedData.type === 'CLASS_COMPLETION' && parsedData.bookingId) {
        try {
          await handleClassCompletion(parsedData);
        } catch (err) {
          console.error('[CheckIn] CLASS_COMPLETION handling failed:', err);
          playStatusSound('error');
          setScanResult({
            success: false,
            message: 'Failed to complete class session. Please try again.'
          });
          setTimeout(() => setScanResult(null), 3000);
        }
        return; // Always return after CLASS_COMPLETION — never fall through to branch logic
      }

      // Handle Branch Entry (Dynamic)
      if (parsedData.type === 'ENTRY') {
        if (parsedData.expiresAt) {
          const now = Date.now();
          // Allow 30 seconds tolerance (clock skew + scan time)
          if (now > parsedData.expiresAt + 30000) {
            playStatusSound('error'); // ERROR SOUND
            setScanResult({
              success: false,
              message: "QR Code Expired. Please refresh."
            });
            setTimeout(() => setScanResult(null), 3000);
            return;
          }
        }
        handleCheckIn(parsedData.branchId || parsedData.id);
        return;
      }

      // Handle Static Branch QR
      if (parsedData.type === 'STATIC') {
        handleCheckIn(parsedData.branchId || parsedData.id);
        return;
      }

      // Fallback for weird JSON
      if (parsedData.branchId || parsedData.id) {
        handleCheckIn(parsedData.branchId || parsedData.id);
        return;
      }

      // Unrecognised JSON QR type — show error instead of treating as branch
      playStatusSound('error');
      setScanResult({
        success: false,
        message: `Unrecognised QR code type: "${parsedData.type || 'unknown'}". Please scan a valid Branch or Class QR.`
      });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    // Legacy: Check for Pipe Separator (Old Dynamic Format)
    if (decodedText.includes('|')) {
      const parts = decodedText.split('|');
      // Format: branchId|timestamp|random
      handleCheckIn(parts[0]);
      return;
    }

    // Default: Plain String (Legacy Static)
    handleCheckIn(decodedText);
  };


  const handleClassCompletion = async (completionData: any) => {
    const { bookingId, trainerId, memberId, classType } = completionData;

    // Find the booking — first check local state, then do live Supabase lookup
    // (local state may be stale if the booking was just created)
    let booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
      // Live fallback: fetch directly from Supabase
      const { data: liveBooking, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error || !liveBooking) {
        playStatusSound('error');
        setScanResult({
          success: false,
          message: `PT session not found. It may have been cancelled or the QR is outdated.`
        });
        setTimeout(() => setScanResult(null), 4000);
        return;
      }
      booking = liveBooking;
    }

    if (booking.status === 'COMPLETED') {
      playStatusSound('error'); // ERROR SOUND
      setScanResult({
        success: false,
        message: "Class already marked as completed."
      });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    // Update booking status to COMPLETED
    await updateBooking(bookingId, { status: 'COMPLETED' });

    // Calculate and show commission info
    const trainer = users.find(u => u.id === trainerId);
    const commission = trainer?.commissionPercentage || 0;
    const classTypeLabel = classType === 'PT' ? 'PT Session' : 'Group Class';

    playStatusSound('success'); // SUCCESS SOUND
    setScanResult({
      success: true,
      message: `✅ ${classTypeLabel} Completed! Thank you, see you next session.`,
      subType: classType
    });

    showToast(`Class completed! Trainer commission: ${commission}%`, 'success');
    setIsScannerActive(false);

    // Trigger gate for exit
    setIsGateOpen(true);
    await triggerHardwareGate(booking.branchId);
    setTimeout(() => { setIsGateOpen(false); setScanResult(null); }, 5000);
  };

  const handleCheckIn = (branchIdScanned: string) => {
    console.log('[CheckIn] Scanned branch ID:', branchIdScanned);
    console.log('[CheckIn] Available branches:', branches.map(b => ({ id: b.id, name: b.name })));

    if (!currentUser) {
      playStatusSound('error');
      showToast("Please login to scan branch QR", "error");
      return;
    }

    const branch = branches.find(b => b.id === branchIdScanned);
    if (!branch) {
      console.error('[CheckIn] Branch not found for ID:', branchIdScanned);
      playStatusSound('error'); // ERROR SOUND
      setScanResult({ success: false, message: `Invalid Branch QR Code. Scanned ID: ${branchIdScanned}` });
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    // 🌟 GPS VERIFICATION LOGIC
    console.log('[CheckIn] 🌟 GPS Debug: Branch', branch.name, 'Lat:', branch.latitude, 'Lng:', branch.longitude);
    console.log('[CheckIn] 🌟 GPS Debug: User Location:', userLocation);

    if (branch.latitude && branch.longitude) {
      if (!userLocation) {
        console.warn('[CheckIn] ⚠️ GPS Debug: No user location available.');
        playStatusSound('error'); // ERROR SOUND
        setScanResult({
          success: false,
          message: "Location not found. Please enable GPS to check in."
        });
        setTimeout(() => setScanResult(null), 4000);
        return;
      }

      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        branch.latitude,
        branch.longitude
      );

      const allowedRadius = branch.geofenceRadius || 100; // Default 100 meters
      console.log(`[CheckIn] 📏 GPS Debug: Distance: ${distance}m, Allowed: ${allowedRadius}m`);

      if (distance > allowedRadius) {
        console.warn(`[CheckIn] ⛔ GPS Debug: Too far. Rejected.`);
        playStatusSound('error'); // ERROR SOUND
        setScanResult({
          success: false,
          message: `You are ${Math.round(distance)}m away. Move closer to ${branch.name} to check in.`
        });
        setTimeout(() => setScanResult(null), 5000);
        return;
      }
      console.log('[CheckIn] ✅ GPS Debug: Within range.');
      console.log('[CheckIn] ✅ GPS Debug: Within range.');
    } else {
      console.warn('[CheckIn] ⛔ GPS Debug: Branch has no coordinates. Security Block.');
      playStatusSound('error'); // ERROR SOUND
      setScanResult({
        success: false,
        message: "Security Error: This branch has no GPS location configured. detailed verification is impossible."
      });
      setTimeout(() => setScanResult(null), 5000);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // STAFF LOGIC (PUNCH IN / PUNCH OUT)
    if (currentUser.role !== UserRole.MEMBER) {
      // ✅ BRANCH VALIDATION: Staff can only check in at their assigned branch
      if (currentUser.branchId && currentUser.branchId !== branchIdScanned) {
        const assignedBranch = branches.find(b => b.id === currentUser.branchId);
        playStatusSound('error');
        setScanResult({
          success: false,
          message: `Access Denied: You are assigned to ${assignedBranch?.name || 'another branch'}. Please scan your assigned branch QR.`,
          isCrossBranch: true
        });
        broadcastToGate(false, `Access Denied: Wrong Branch!`, branchIdScanned);
        setTimeout(() => setScanResult(null), 4000);
        return;
      }

      // Check for TODAY'S open session
      const openAttendance = attendance.find(a =>
        a.userId === currentUser.id &&
        a.date === today &&
        !a.timeOut
      );

      if (openAttendance) {
        // Normal Checkout
        updateAttendance(openAttendance.id, { timeOut: new Date().toLocaleTimeString() });
        playStatusSound('success');
        setIsScannerActive(false);
        setScanResult({
          success: true,
          message: `Shift Finalized at ${branch.name}. Great work!`,
          subType: currentUser.role.replace('_', ' '),
          isCheckOut: true
        });
        broadcastToGate(true, `✅ Checked Out: ${currentUser.name}`, branch.id);
        showToast("Successfully checked out!", "success");
      } else {
        // Check for FORGOTTEN CHECKOUTS from PREVIOUS DAYS
        const forgottenShift = attendance.find(a =>
          a.userId === currentUser.id &&
          a.date < today && // Date is in the past
          !a.timeOut // And never checked out
        );

        if (forgottenShift) {
          // Auto-close the forgotten shift with penalty
          const penaltyNote = "⚠️ Auto-closed: Forgot Checkout. ₹100 Penalty Applied.";
          updateAttendance(forgottenShift.id, {
            timeOut: '23:59:59', // Close at end of day or shift end
            notes: penaltyNote
          });

          showToast("⚠️ Previous shift auto-closed. ₹100 penalty applied.", "error");
        }

        // Create NEW Check-in
        recordAttendance({
          id: `att-${Date.now()}`,
          userId: currentUser.id,
          date: today,
          timeIn: new Date().toLocaleTimeString(),
          branchId: branch.id,
          type: 'STAFF'
        });
        playStatusSound('success');
        setIsScannerActive(false);
        setScanResult({
          success: true,
          message: `Punch-In Recorded at ${branch.name}. Shift started.`,
          subType: currentUser.role.replace('_', ' '),
          isCheckOut: false
        });
        broadcastToGate(true, `✅ Checked In: ${currentUser.name}`, branch.id);
        showToast("Successfully checked in!", "success");
      }

      setIsGateOpen(true);
      if (currentUser.role === UserRole.KIOSK) {
        setTimeout(() => {
          setIsScannerActive(true);
          setScanResult(null);
          setIsGateOpen(false);
        }, 5000);
      } else {
        setTimeout(() => { setIsGateOpen(false); setScanResult(null); }, 5000);
      }
      return;
    }

    // MEMBER LOGIC
    if (currentUser.role === UserRole.MEMBER) {
      const activeSubs = subscriptions.filter(s => s.memberId === currentUser.id && s.status === SubscriptionStatus.ACTIVE);
      const gymSub = activeSubs.find(s => {
        const plan = plans.find(p => p.id === s.planId);
        return plan?.type === PlanType.GYM;
      });

      if (!gymSub) {
        // Check if it's paused for a better message
        const pausedSub = subscriptions.find(s => s.memberId === currentUser.id && s.status === SubscriptionStatus.PAUSED);
        if (pausedSub) {
          playStatusSound('error');
          setScanResult({ success: false, message: "Access Denied: Your membership is currently PAUSED." });
          broadcastToGate(false, `❌ Membership PAUSED`, branchIdScanned);
        } else {
          playStatusSound('error');
          setScanResult({ success: false, message: "Access Denied: No active gym membership found." });
          broadcastToGate(false, `❌ No Active Membership`, branchIdScanned);
        }
        setTimeout(() => setScanResult(null), 3000);
        return;
      }

      const plan = plans.find(p => p.id === gymSub.planId);
      const isHomeBranch = currentUser.branchId === branch.id;
      const allowsMultiBranch = plan?.isMultiBranch === true;

      if (!isHomeBranch && !allowsMultiBranch) {
        const homeBranch = branches.find(b => b.id === currentUser.branchId);
        playStatusSound('error');
        setScanResult({
          success: false,
          message: `Denied: Access restricted to ${homeBranch?.name || 'Home Branch'}.`,
          subType: plan?.name
        });
        broadcastToGate(false, `❌ Wrong Branch Access`, branchIdScanned);
        setTimeout(() => setScanResult(null), 4000);
        return;
      }

      // ⏳ 4-Hour Cooldown Logic for Members
      const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
      const todaysAttendances = attendance.filter(a => a.userId === currentUser.id && a.date === today && a.type === 'MEMBER');

      if (todaysAttendances.length > 0) {
        let latestScanTime = 0;
        todaysAttendances.forEach(a => {
          let scanTime = 0;
          if (a.id && a.id.startsWith('att-')) {
            scanTime = parseInt(a.id.replace('att-', ''));
          }
          if (scanTime > latestScanTime) {
            latestScanTime = scanTime;
          }
        });

        if (latestScanTime > 0 && (Date.now() - latestScanTime) < FOUR_HOURS_MS) {
          const remainingMinutes = Math.ceil((FOUR_HOURS_MS - (Date.now() - latestScanTime)) / (60 * 1000));
          const hours = Math.floor(remainingMinutes / 60);
          const minutes = remainingMinutes % 60;
          const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

          playStatusSound('error');
          setIsScannerActive(false);
          setScanResult({
            success: false,
            message: `Checkout or Re-entry not allowed yet. Please wait ${timeString}.`,
            subType: "4-Hour Cooldown Active"
          });
          broadcastToGate(false, `❌ Scanned Recently`, branchIdScanned);
          setTimeout(() => setScanResult(null), 5000);
          return;
        }
      }

      recordAttendance({
        id: `att-${Date.now()}`,
        userId: currentUser.id,
        date: today,
        timeIn: new Date().toLocaleTimeString(),
        branchId: branch.id,
        type: 'MEMBER'
      });

      playStatusSound('success');
      setIsScannerActive(false);
      setScanResult({
        success: true,
        message: isHomeBranch ? `Welcome back to ${branch.name}!` : `Guest Access at ${branch.name} Approved.`,
        subType: plan?.name,
        isCheckOut: false,
        isCrossBranch: !isHomeBranch
      });
      broadcastToGate(true, isHomeBranch ? `✅ Welcome: ${currentUser.name}` : `✅ Guest Access: ${currentUser.name}`, branch.id);
      showToast("Successfully checked in!", "success");

      setIsGateOpen(true);
      triggerHardwareGate(branch.id);

      // ✅ Kiosk Mode Auto-Reset: Restart camera automatically for the next user
      if (currentUser.role === UserRole.KIOSK) {
        setTimeout(() => {
          setIsScannerActive(true);
          setScanResult(null);
          setIsGateOpen(false);
        }, 5000);
      } else {
        setTimeout(() => { setIsGateOpen(false); setScanResult(null); }, 4000);
      }
    }
  };

  // 🕯️ Screen Wake Lock — prevents tablet sleep while on this page
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock failed:', err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock) {
        try { wakeLock.release(); } catch (e) { }
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Update the ref with the latest handleQRScan function
  useEffect(() => {
    handleQRScanRef.current = handleQRScan;
  }, [handleQRScan]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-t-[12px] border-slate-900 relative overflow-hidden">
        <div className="absolute top-6 right-8 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isHardwareOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SCANNER ACTIVE</span>
        </div>

        {/* GPS Status Indicator */}
        <div
          className={`absolute top-6 left-8 flex items-center gap-2 ${locationError ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={() => {
            if (locationError) {
              setLocationError(null);
              requestLocation();
            }
          }}
          title={locationError || "GPS Status"}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${locationError ? 'bg-red-500' : userLocation ? 'bg-blue-500' : 'bg-amber-500 animate-pulse'}`}></span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {locationError ? 'RETRY GPS' : userLocation ? 'LOCATION ACTIVE' : 'LOCATING...'}
          </span>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
            {currentUser?.role === UserRole.MEMBER ? 'Scan QR Code' : 'Scan Branch QR'}
          </h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">
            {currentUser?.role === UserRole.MEMBER
              ? 'Scan branch QR to enter or class QR to complete'
              : currentUser?.role === UserRole.TRAINER
                ? 'Scan branch QR for attendance'
                : 'Record your attendance instantly'}
          </p>
        </div>

        <div className="relative mb-10">
          {!userLocation ? (
            // STEP 1: LOCATION CAPTURE STATE
            <div className="bg-slate-50 border-2 border-slate-200 p-10 rounded-[2.5rem] text-center">
              {locationError ? (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-md">
                    <i className="fas fa-map-marker-slash text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-black text-red-800 uppercase tracking-tight mb-2">Location Required</h3>
                  <p className="text-sm text-red-600 mb-6 font-medium max-w-xs mx-auto">{locationError}</p>
                  <button
                    onClick={() => {
                      setLocationError(null);
                      requestLocation();
                    }}
                    className="bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg"
                  >
                    Retry GPS
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-md animate-pulse">
                    <i className="fas fa-location-crosshairs text-2xl animate-spin-slow"></i>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Acquiring Location</h3>
                  <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">Please wait while we verify your location...</p>
                </>
              )}
            </div>
          ) : (
            // STEP 2: CAMERA / SCANNER STATE
            <>
              {permissionError ? (
                <div className="bg-red-50 border-2 border-red-200 p-8 rounded-[2.5rem] text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-md">
                    <i className="fas fa-video-slash text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-black text-red-800 uppercase tracking-tight mb-2">Camera Access Denied</h3>
                  <p className="text-sm text-red-600 mb-6 font-medium max-w-xs mx-auto">{permissionError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg"
                  >
                    Retry Permission
                  </button>
                </div>
              ) : !isScannerActive ? (
                // 🔴 Camera Off - shown after a successful scan (or specific failure that stopped camera)
                <div className={`${scanResult?.success === false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border-2 p-10 rounded-[2.5rem] text-center`}>
                  <div className={`w-20 h-20 ${scanResult?.success === false ? 'bg-red-500' : 'bg-green-500'} rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl`}>
                    <i className={`fas ${scanResult?.success === false ? 'fa-times' : 'fa-check'} text-white text-3xl`}></i>
                  </div>
                  <h3 className={`text-xl font-black ${scanResult?.success === false ? 'text-red-800' : 'text-green-800'} uppercase tracking-tight mb-2`}>
                    {scanResult?.success === false ? 'Access Denied' : 'Success!'}
                  </h3>
                  <p className={`text-sm ${scanResult?.success === false ? 'text-red-600' : 'text-green-600'} font-bold mb-2 leading-tight max-w-[250px] mx-auto`}>
                    {scanResult?.message || "Attendance recorded successfully."}
                  </p>
                  <p className={`text-xs ${scanResult?.success === false ? 'text-red-600' : 'text-green-600'} font-medium mb-6 opacity-70`}>Camera has been turned off to save battery.</p>
                  <button
                    onClick={() => {
                      setScanResult(null);
                      setIsScannerActive(true);
                    }}
                    className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors shadow-lg flex items-center gap-3 mx-auto"
                  >
                    <i className="fas fa-camera"></i>
                    Scan Again
                  </button>
                </div>
              ) : (
                <>
                  <div id="reader" className="overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-inner"></div>

                  {isGateOpen && (
                    <div className="absolute inset-0 bg-green-500/90 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 rounded-[2.5rem]">
                      <div className="bg-white text-green-600 w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-2xl scale-110">
                        <i className="fas fa-check text-3xl"></i>
                      </div>
                      <p className="text-2xl font-black uppercase tracking-widest">SUCCESS</p>
                      <p className="text-sm font-bold opacity-80 uppercase tracking-tight mt-1">Attendance Recorded</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {scanResult && isScannerActive && !isGateOpen && (
          <div className={`p-6 rounded-[2rem] border-2 flex items-center gap-4 animate-[slideUp_0.3s_ease-out] ${!scanResult.success ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${!scanResult.success ? 'bg-red-600' : 'bg-blue-600'} text-white shadow-lg`}>
              <i className={`fas ${!scanResult.success ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
            </div>
            <div>
              <p className="font-black text-xs uppercase tracking-widest mb-1">{!scanResult.success ? 'ERROR' : 'STATUS'}</p>
              <p className="text-sm font-bold leading-tight">{scanResult.message}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <i className="fas fa-shield-halved text-blue-500"></i> Scanner Instructions
        </h3>
        <div className="space-y-6">
          {currentUser?.role === UserRole.MEMBER ? (
            <>
              <div className="flex gap-4">
                <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <i className="fas fa-door-open text-xs"></i>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-tight">Branch Entry</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Scan branch QR at entrance to check in and open the gate.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <i className="fas fa-check-circle text-xs"></i>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-tight">Class Completion</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">After class, scan the QR shown by your trainer to mark attendance and complete the session.</p>
                </div>
              </div>
            </>
          ) : currentUser?.role === UserRole.TRAINER ? (
            <>
              <div className="flex gap-4">
                <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <i className="fas fa-qrcode text-xs"></i>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-tight">Mark Attendance</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Scan branch QR to punch in/out for your shift.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <i className="fas fa-calendar-check text-xs"></i>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-tight">Complete Classes</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Use the Bookings page to generate QR codes for class completion.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-4">
                <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <i className="fas fa-qrcode text-xs"></i>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-tight">Point at Branch QR</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Find the QR code displayed at the branch entrance and point your camera at it.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <i className="fas fa-bolt-lightning text-xs"></i>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-tight">Automatic Recording</p>
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">Once scanned, your attendance will be recorded automatically in our cloud database.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>



      <style>{`
        #reader { border: none !important; }
        #reader__dashboard_section_csr button {
          background: #0f172a;
          color: white;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.1em;
          border: none;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default CheckIn;