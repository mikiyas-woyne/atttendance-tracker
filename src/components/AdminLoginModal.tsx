import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, UserCheck, KeyRound, AlertCircle, Loader2, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithEmail, loginWithGoogle } = useAuth();

  const [username, setUsername] = useState<string>('superadmin');
  const [password, setPassword] = useState<string>('admin@123');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('እባክዎን የተጠቃሚ ስም (Username) እና የይለፍ ቃል ያስገቡ።');
      return;
    }

    setLoading(true);

    try {
      await loginWithEmail(username.trim(), password);
      setLoading(false);
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      console.warn('Admin Auth info:', err?.message || err);
      if (err.code === 'auth/wrong-password') {
        setErrorMsg('የተሳሳተ የይለፍ ቃል ያስገቡ። እባክዎን «admin@123» ወይም የተመዘገበ የይለፍ ቃልዎን ድጋሚ ይሞክሩ።');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setErrorMsg('የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል ያስገቡ።');
      } else {
        setErrorMsg(err.message || 'የመግቢያ ስህተት ተከሰተ። እባክዎን ድጋሚ ይሞክሩ።');
      }
    }
  };

  const handleQuickSuperadminLogin = async () => {
    setUsername('superadmin');
    setPassword('admin@123');
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginWithEmail('superadmin', 'admin@123');
      setLoading(false);
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      console.warn('Superadmin login info:', err);
      setErrorMsg('በSuperadmin መግባት አልተቻለም።');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      setLoading(false);
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      console.warn('Google login info:', err);
      setErrorMsg('በGoogle መግባት አልተቻለም። እባክዎን በSuperadmin መግቢያ ይሞክሩ።');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 max-w-md w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1 rounded-lg text-amber-200/80 hover:text-white hover:bg-red-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center pt-2">
            <div className="w-12 h-12 bg-amber-500/20 border-2 border-amber-400/50 rounded-full flex items-center justify-center text-amber-300 mx-auto mb-2 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-amber-200 font-serif">
              የአስተዳዳሪ መግቢያ
            </h3>
            <p className="text-xs text-amber-100/80 mt-1">
              ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Preset Credentials Banner */}
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1 text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                የአስተዳዳሪ መግቢያ መረጃ (Credentials)
              </span>
              <button
                type="button"
                onClick={handleQuickSuperadminLogin}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 font-extrabold text-[11px] rounded-lg text-amber-950 transition-colors"
              >
                አሁን ግባ
              </button>
            </div>
            <div className="font-mono text-slate-700 space-y-0.5 pt-1">
              <div><span className="font-semibold text-slate-500">የተጠቃሚ ስም (Username):</span> <span className="font-bold text-slate-900">superadmin</span></div>
              <div><span className="font-semibold text-slate-500">የይለፍ ቃል (Password):</span> <span className="font-bold text-slate-900">admin@123</span></div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                የተጠቃሚ ስም / ኢሜይል (Username / Email)
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="superadmin"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm text-slate-800 font-medium outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                የይለፍ ቃል (Password)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin@123"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm text-slate-800 font-mono outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-950 to-amber-950 hover:from-red-900 hover:to-amber-900 text-amber-200 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 border border-amber-400/40"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : (
                <Lock className="w-4 h-4 text-amber-300" />
              )}
              <span>ወደ ዳሽቦርድ ግባ (Login)</span>
            </button>
          </form>

          <div className="relative my-3 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-3 text-xs text-slate-400 font-medium">ወይም</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>በ Google አካውንት ግባ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
