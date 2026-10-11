import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, LogIn, LogOut, ShieldCheck, UserPlus, Search } from 'lucide-react';

interface HeaderProps {
  activeTab: 'register' | 'status' | 'admin';
  setActiveTab: (tab: 'register' | 'status' | 'admin') => void;
  onOpenAdminModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenAdminModal }) => {
  const { isAdmin, logout } = useAuth();

  return (
    <header className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 text-white shadow-xl border-b-2 border-amber-500/40 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo / Title */}
          <div className="flex items-center space-x-3 space-x-reverse cursor-pointer" onClick={() => setActiveTab('register')}>
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              {/* Ethiopian Orthodox Cross Inspired SVG */}
              <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M11 2h2v4h4v2h-4v4h4v2h-4v8h-2v-8H7v-2h4V8H7V6h4V2z" />
                <circle cx="12" cy="12" r="1.5" className="text-amber-200" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-amber-200 drop-shadow-sm font-serif">
                ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት
              </h1>
              <p className="text-xs sm:text-sm text-amber-100/80 font-medium">
                የተማሪዎች ምዝገባ እና የመገኘት መዝገብ ሥርዓት
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 pt-1 md:pt-0 border-t border-amber-800/50 md:border-t-0">
            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                activeTab === 'register'
                  ? 'bg-amber-500 text-red-950 shadow-amber-500/20 font-bold'
                  : 'bg-red-900/60 text-amber-100 hover:bg-red-800/80 border border-amber-500/30'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>ተመዝገብ</span>
            </button>

            <button
              onClick={() => setActiveTab('status')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                activeTab === 'status'
                  ? 'bg-amber-500 text-red-950 shadow-amber-500/20 font-bold'
                  : 'bg-red-900/60 text-amber-100 hover:bg-red-800/80 border border-amber-500/30'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>የመገኘት ሁኔታ</span>
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                    activeTab === 'admin'
                      ? 'bg-amber-500 text-red-950 shadow-amber-500/20 font-bold'
                      : 'bg-red-900/60 text-amber-100 hover:bg-red-800/80 border border-amber-500/30'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>ዳሽቦርድ</span>
                </button>
                
                <button
                  onClick={logout}
                  title="ከአካውንት ውጣ"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-900/40 text-red-200 hover:bg-red-800/60 border border-red-700/50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ውጣ</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAdminModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-amber-600/90 hover:bg-amber-500 text-white transition-all shadow-md border border-amber-400/40"
              >
                <LogIn className="w-4 h-4" />
                <span>የአስተዳዳሪ መግቢያ</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
