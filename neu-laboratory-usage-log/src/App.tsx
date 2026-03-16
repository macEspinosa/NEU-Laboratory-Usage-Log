import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { UserProfile, UserRole } from './types';
import { handleFirestoreError, OperationType } from './utils/errorHelper';
import { LogIn, LogOut, LayoutDashboard, QrCode, ShieldAlert, Loader2, DoorOpen, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import Scanner from './components/Scanner';
import AdminDashboard from './components/AdminDashboard';
import { logService } from './services/logService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [view, setView] = useState<'scanner' | 'dashboard'>('scanner');
  const [currentRoom, setCurrentRoom] = useState<string>('M101'); // Room Context
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const rooms = Array.from({ length: 10 }, (_, i) => `M${101 + i}`);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.email?.endsWith('@neu.edu.ph')) {
          setAuthError('Access restricted to @neu.edu.ph institutional emails only.');
          await signOut(auth);
          setUser(null);
          setProfile(null);
        } else {
          setAuthError(null);
          setUser(firebaseUser);
          await fetchProfile(firebaseUser);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleEntryParam = async () => {
      const params = new URLSearchParams(window.location.search);
      const entryEmail = params.get('entry');
      if (entryEmail && entryEmail.endsWith('@neu.edu.ph')) {
        // We can't log them directly without auth if we want security,
        // but the user asked for a URL for her.
        // If she is logged in, we can log the entry.
        if (user && profile && user.email === entryEmail) {
          const result = await logService.logByAuthUser(profile, currentRoom);
          if (result.success) {
            alert(`Entry logged for ${currentRoom}`);
            // Clear param
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    };
    handleEntryParam();
  }, [user, profile, currentRoom]);

  const fetchProfile = async (firebaseUser: User, retryCount = 0) => {
    const path = `users/${firebaseUser.uid}`;
    try {
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Check if user is pre-authorized as an admin
        const preAuthRef = doc(db, 'preauthorized_admins', firebaseUser.email?.toLowerCase() || '');
        const preAuthSnap = await getDoc(preAuthRef);
        
        // Create new profile for first-time login
        const isDefaultAdmin = firebaseUser.email === 'mariaantonette.espinosa@neu.edu.ph';
        const isPreAuthAdmin = preAuthSnap.exists() && preAuthSnap.data().role === 'admin';
        
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: (firebaseUser.email || '').toLowerCase(),
          displayName: firebaseUser.displayName || 'Professor',
          role: (isDefaultAdmin || isPreAuthAdmin) ? 'admin' : 'professor',
          isBlocked: false,
          universityId: '', // To be filled by user or admin
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      }
    } catch (error) {
      if (retryCount < 2 && error instanceof Error && error.message.includes('offline')) {
        console.warn(`Firestore offline, retrying... (${retryCount + 1})`);
        setTimeout(() => fetchProfile(firebaseUser, retryCount + 1), 2000);
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
        <div className="absolute inset-0 atmosphere pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="micro-label">Initializing System...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-color)]">
        <div className="absolute inset-0 atmosphere pointer-events-none" />
        
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: 'url("https://media.licdn.com/dms/image/v2/C4E1BAQF0X2-Pil2iag/company-background_10000/company-background_10000/0/1645461279672/new_era_university_qc_main_cover?e=2147483647&v=beta&t=W6qIZJWlKZS6mWA4ozpu_7zSMtSnOtt9Myf64qdMYUA")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[var(--bg-color)]/80 to-[var(--bg-color)]" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass-morphism p-10 rounded-[3rem] shadow-2xl border border-white/10 text-center relative z-10"
        >
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
            <img 
              src="https://upload.wikimedia.org/wikipedia/en/c/c6/New_Era_University.svg" 
              alt="NEU Logo" 
              className="w-24 h-24 object-contain mx-auto relative z-10"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">NEU Lab Log</h1>
          <p className="micro-label mb-10">Laboratory Access Management</p>
          
          {authError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-left"
            >
              <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Access Denied</p>
                <p className="text-xs text-red-300/70 leading-relaxed">{authError}</p>
              </div>
            </motion.div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-4 bg-white text-black py-5 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
          >
            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-1" />}
            Authenticate
          </button>
          
          <p className="mt-10 text-[10px] text-stone-500 font-mono uppercase tracking-[0.3em]">Institutional Access Only</p>
        </motion.div>
      </div>
    );
  }

  if (profile.isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-red-100 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Account Blocked</h2>
          <p className="text-stone-500 mb-6">Your access has been restricted by the administrator. Please contact the lab department.</p>
          <button onClick={handleLogout} className="text-stone-600 underline">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-[var(--bg-color)] overflow-x-hidden">
      {/* Global Background */}
      <div className="fixed inset-0 z-0 atmosphere pointer-events-none" />
      
      {view === 'scanner' && (
        <div 
          className="fixed inset-0 z-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'url("https://media.licdn.com/dms/image/v2/C4E1BAQF0X2-Pil2iag/company-background_10000/company-background_10000/0/1645461279672/new_era_university_qc_main_cover?e=2147483647&v=beta&t=W6qIZJWlKZS6mWA4ozpu_7zSMtSnOtt9Myf64qdMYUA")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className={`backdrop-blur-xl border-b px-6 py-5 flex items-center justify-between sticky top-0 z-50 transition-all duration-500 ${view === 'dashboard' ? (theme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-white/80 border-black/10') : 'bg-black/40 border-white/5'}`}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
              <img 
                src="https://upload.wikimedia.org/wikipedia/en/c/c6/New_Era_University.svg" 
                alt="NEU Logo" 
                className="w-10 h-10 object-contain relative z-10"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className={`font-bold leading-tight tracking-tight transition-colors ${view === 'dashboard' ? (theme === 'dark' ? 'text-white' : 'text-stone-900') : 'text-white'}`}>NEU Lab</h2>
              <p className="micro-label !text-emerald-500/70">System v2.4.0</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className={`hidden md:flex items-center gap-2 p-1.5 rounded-2xl transition-colors ${view === 'dashboard' ? (theme === 'dark' ? 'bg-white/5 border border-white/5' : 'bg-stone-200/50') : 'bg-white/5 border border-white/5'}`}>
              <button
                onClick={() => setView('scanner')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'scanner' ? 'bg-white text-black shadow-lg' : (view === 'dashboard' ? (theme === 'dark' ? 'text-stone-500 hover:text-white' : 'text-stone-500 hover:text-stone-900') : 'text-stone-500 hover:text-stone-300')}`}
              >
                Scanner
              </button>
              {profile.role === 'admin' && (
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${view === 'dashboard' ? (theme === 'dark' ? 'bg-emerald-500 text-black shadow-lg' : 'bg-stone-900 text-white shadow-lg') : 'text-stone-500 hover:text-stone-300'}`}
                >
                  Dashboard
                </button>
              )}
            </nav>
            
            <div className={`h-8 w-[1px] hidden md:block transition-colors ${view === 'dashboard' ? (theme === 'dark' ? 'bg-white/10' : 'bg-stone-300') : 'bg-white/10'}`} />
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-bold transition-colors ${view === 'dashboard' ? (theme === 'dark' ? 'text-white' : 'text-stone-900') : 'text-white'}`}>{profile.displayName}</p>
                <p className="micro-label !text-emerald-500/60">{profile.role}</p>
              </div>
              <button 
                onClick={handleLogout}
                className={`p-2.5 rounded-xl transition-all ${view === 'dashboard' ? (theme === 'dark' ? 'text-stone-500 hover:text-red-400 hover:bg-red-500/10' : 'text-stone-500 hover:text-red-500 hover:bg-red-50') : 'text-stone-500 hover:text-red-400 hover:bg-red-500/10'}`}
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {view === 'scanner' ? (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Scanner 
                  profile={profile} 
                  roomNumber={currentRoom} 
                  onAdminLoginSuccess={() => setView('dashboard')}
                />
              </motion.div>
            ) : (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AdminDashboard 
                  currentRoom={currentRoom} 
                  setCurrentRoom={setCurrentRoom} 
                  rooms={rooms} 
                  theme={theme}
                  setTheme={setTheme}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile Nav */}
        <nav className="md:hidden bg-white/80 backdrop-blur-md border-t border-black/5 p-2 flex items-center justify-around sticky bottom-0 z-20">
          <button
            onClick={() => setView('scanner')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${view === 'scanner' ? 'text-emerald-600' : 'text-stone-400'}`}
          >
            <QrCode className="w-6 h-6" />
            <span className="text-[10px] font-medium">Scanner</span>
          </button>
          {profile.role === 'admin' && (
            <button
              onClick={() => setView('dashboard')}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${view === 'dashboard' ? 'text-emerald-600' : 'text-stone-400'}`}
            >
              <LayoutDashboard className="w-6 h-6" />
              <span className="text-[10px] font-medium">Dashboard</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
