import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { auth, db, googleProvider } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import { UserProfile, UsageLog, OperationType } from '../types';
import { CheckCircle2, Camera, AlertCircle, Loader2, Mail, Keyboard, ChevronRight, ShieldAlert, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { logService, LogResult } from '../services/logService';

interface ScannerProps {
  profile: UserProfile;
  roomNumber: string;
  onAdminLoginSuccess?: () => void;
}

export default function Scanner({ profile, roomNumber, onAdminLoginSuccess }: ScannerProps) {
  const [scanResult, setScanResult] = useState<LogResult | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 15, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
          },
          /* verbose= */ false
        );

        scanner.render(onScanSuccess, (err) => {
          // Only log actual errors, not "no QR found" frames
          if (err && !err.includes("No MultiFormat Readers were able to decode the image")) {
            console.debug("Scanner frame error:", err);
          }
        });
        
        scannerRef.current = scanner;
        setIsCameraReady(true);
      } catch (err) {
        console.error("Scanner initialization failed:", err);
        setError("Could not start camera. Please ensure camera permissions are granted.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner", error);
        });
      }
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    // decodedText can be University ID, Email, or a URL containing them
    if (isLogging || scanResult?.success) return;
    
    setIsLogging(true);
    setError(null);

    try {
      let targetId = decodedText;

      // Handle URL-based QR codes
      if (decodedText.startsWith('http')) {
        try {
          const url = new URL(decodedText);
          targetId = url.searchParams.get('id') || 
                     url.searchParams.get('email') || 
                     url.searchParams.get('entry') || 
                     decodedText;
        } catch (e) {
          console.warn("Failed to parse scanned text as URL");
        }
      }

      // Try logging by University ID first, then by Email
      let result = await logService.logByUniversityId(targetId, roomNumber);
      
      if (!result.success && targetId.includes('@')) {
        result = await logService.logByEmail(targetId, roomNumber);
      }
      
      if (result.success) {
        setScanResult(result);
        setTimeout(() => {
          setScanResult(null);
          setIsLogging(false);
        }, 5000);
      } else {
        setError(result.message);
        setIsLogging(false);
      }
    } catch (err) {
      console.error("Scanning process error:", err);
      setError("A system error occurred. Please try manual entry.");
      setIsLogging(false);
    }
  }

  async function handleGoogleManual() {
    setIsLogging(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      if (!googleUser.email?.endsWith('@neu.edu.ph')) {
        setError("Institutional email required (@neu.edu.ph)");
        await signOut(auth);
        return;
      }

      const logResult = await logService.logByEmail(googleUser.email, roomNumber);
      
      if (logResult.success) {
        setScanResult(logResult);
        setShowManualEntry(false);
        setManualEmail('');
        
        // Auto-reset and sign out after success to return to login state
        // This is ideal for shared kiosk devices
        setTimeout(async () => {
          setScanResult(null);
          setIsLogging(false);
          await signOut(auth);
        }, 5000);
      } else {
        setError(logResult.message);
        setIsLogging(false);
      }
    } catch (err) {
      console.error("Manual Google Auth Error:", err);
      setError("Authentication failed or cancelled.");
      setIsLogging(false);
    }
  }

  async function handleAdminLogin() {
    if (isLogging) return;
    setIsLogging(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if this user is an admin in Firestore
      const { getDoc, doc } = await import('firebase/firestore');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess();
        }
      } else {
        setError("Access Denied: You do not have administrator privileges.");
        // If not admin, we should probably sign out to keep the scanner clean
        await signOut(auth);
      }
    } catch (err) {
      console.error("Admin Login Error:", err);
      setError("Admin authentication failed.");
    } finally {
      setIsLogging(false);
    }
  }

  function onScanFailure(error: any) {
    // Silent fail for continuous scanning
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualEmail.endsWith('@neu.edu.ph')) {
      setError("Please use your @neu.edu.ph institutional email.");
      return;
    }

    setIsLogging(true);
    setError(null);

    const result = await logService.logByEmail(manualEmail, roomNumber);

    if (result.success) {
      setScanResult(result);
      setManualEmail('');
      setShowManualEntry(false);
      setTimeout(() => {
        setScanResult(null);
        setIsLogging(false);
      }, 5000);
    } else {
      setError(result.message);
      setIsLogging(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="hardware-card glass-morphism">
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-emerald-950/40 backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <div className={`status-dot ${isCameraReady ? 'status-dot-active' : 'bg-stone-700'}`} />
            <h3 className="text-white font-bold tracking-tight">LAB-SCAN v2</h3>
          </div>
          <div className="micro-label !text-emerald-500/50">{isCameraReady ? 'System Active' : 'Initializing...'}</div>
        </div>

        <div className="relative aspect-square bg-emerald-950/40 overflow-hidden group">
          <div id="reader" className="w-full h-full contrast-110 opacity-100"></div>
          
          {/* Scanning Animation Overlay */}
          {!scanResult && !showManualEntry && isCameraReady && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              {/* Scanning Line */}
              <motion.div 
                className="scan-line"
                animate={{ 
                  top: ["10%", "90%", "10%"],
                  opacity: [0.4, 1, 0.4],
                  scaleX: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />

              {/* Scanner Frame Corners */}
              <div className="relative w-72 h-72">
                <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl animate-pulse" />
                {[
                  "top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl",
                  "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl",
                  "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl",
                  "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"
                ].map((pos, i) => (
                  <motion.div 
                    key={i}
                    className={`scanner-corner ${pos}`}
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.5, 1, 0.5],
                      borderColor: ["#10b981", "#34d399", "#10b981"]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      delay: i * 0.2 
                    }}
                  />
                ))}
                
                {/* Dashed Guide */}
                <div className="absolute inset-0 border-2 border-dashed border-white/10 rounded-3xl" />
                
                {/* Center Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative flex items-center justify-center"
                  >
                    <div className="w-12 h-[1px] bg-white" />
                    <div className="h-12 w-[1px] bg-white absolute" />
                  </motion.div>
                </div>

                {/* Scanning Text */}
                <div className="absolute -bottom-12 left-0 right-0 text-center">
                  <motion.p 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]"
                  >
                    Scanning...
                  </motion.p>
                </div>
              </div>
            </div>
          )}
          
          <AnimatePresence>
            {showManualEntry && !scanResult && (
              <motion.div 
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                className="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center p-10"
              >
                <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                  <UserIcon className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight text-center">Google Authentication</h3>
                <p className="text-stone-500 text-xs text-center mb-10 uppercase tracking-widest font-mono">Institutional Access Required</p>
                
                <div className="w-full space-y-5">
                  <button 
                    type="button"
                    onClick={handleGoogleManual}
                    disabled={isLogging}
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-4 shadow-xl hover:bg-emerald-50 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />}
                    <span className="text-xs uppercase tracking-widest">Sign in with Google</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setShowManualEntry(false)}
                    className="w-full micro-label hover:text-white transition-colors pt-4"
                  >
                    Cancel and Return to Scanner
                  </button>
                </div>
              </motion.div>
            )}

            {isLogging && !scanResult && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-10 text-center"
              >
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
                <h3 className="text-white font-bold tracking-widest uppercase text-xs">Recording Usage</h3>
                <p className="text-stone-500 text-[10px] mt-2 font-mono">Syncing with Central Database...</p>
              </motion.div>
            )}

            {scanResult?.success && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-500/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center z-40"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", damping: 15 }}
                >
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full animate-pulse" />
                    <CheckCircle2 className="w-24 h-24 text-white relative z-10" />
                  </div>
                </motion.div>
                <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Verified</h2>
                <p className="text-emerald-900/70 text-xs font-mono uppercase tracking-[0.3em] mb-10">Access Granted</p>
                
                <div className="glass-morphism bg-white/10 p-6 rounded-3xl w-full mb-10 border-white/20">
                  <p className="text-white/60 text-[10px] uppercase tracking-widest font-mono mb-2">Professor Identified</p>
                  <p className="text-white text-xl font-bold">{scanResult.userName}</p>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-white/40 text-[10px] font-mono">ROOM {roomNumber}</span>
                    <span className="text-white/40 text-[10px] font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="h-full bg-white"
                  />
                </div>
                <p className="mt-6 micro-label !text-emerald-900/60">Auto-Reset in 5s</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 bg-emerald-950/20">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="micro-label mb-1">Operator</p>
              <p className="text-white text-sm font-bold truncate">{profile.displayName}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="micro-label mb-1">Auth Status</p>
              <div className="flex items-center gap-2">
                <div className="status-dot status-dot-active !w-1.5 !h-1.5" />
                <p className="text-emerald-400 text-sm font-bold">Secure</p>
              </div>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}

          <div className="mt-8 flex flex-col items-center gap-6">
            <button 
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="group flex items-center gap-3 text-emerald-500 text-[10px] font-bold uppercase tracking-widest hover:text-emerald-400 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors overflow-hidden">
                {showManualEntry ? (
                  <Camera className="w-4 h-4" />
                ) : (
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                )}
              </div>
              {showManualEntry ? "Return to Scanner" : "Sign in with Google"}
            </button>

            <div className="flex items-center justify-center gap-3 micro-label !text-stone-600">
              <div className="w-4 h-[1px] bg-stone-800" />
              <span>Align QR Code</span>
              <div className="w-4 h-[1px] bg-stone-800" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center space-y-6">
        <p className="text-stone-600 text-[10px] uppercase tracking-[0.3em] font-mono max-w-[200px] mx-auto leading-loose">
          Precision Discovery Laboratory Environment
        </p>
        
        <div className="pt-8 border-t border-white/5">
          <button 
            onClick={handleAdminLogin}
            disabled={isLogging}
            className="glass-morphism bg-white/5 border border-white/10 text-white hover:bg-white/10 px-8 py-4 rounded-2xl micro-label !text-white flex items-center justify-center gap-4 mx-auto transition-all shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLogging ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />}
            Admin Portal
          </button>
        </div>
      </div>
    </div>
  );
}
