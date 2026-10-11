import React from 'react';
import { useAuth } from '../context/AuthContext';
import { EthiopianOrthodoxCross } from './EthiopianOrthodoxCross';
import { LogIn, LogOut, ShieldCheck, UserPlus, Search } from 'lucide-react';

interface HeaderProps {
  activeTab: 'register' | 'status' | 'admin';
  setActiveTab: (tab: 'register' | 'status' | 'admin') => void;
  onOpenAdminModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenAdminModal }) => {
  const { isAdmin, logout } = useAuth();

  return (
    <header className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 text-white shadow-xl border-b-2 border-amber-500/40 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo / Title */}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none"
            onClick={() => setActiveTab('register')}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center shadow-inner shrink-0">
              <EthiopianOrthodoxCross className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-amber-200 drop-shadow-sm font-serif truncate">
                ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-amber-100/80 font-medium truncate">
                የተማሪዎች ምዝገባ እና የመገኘት መዝገብ ሥርዓት
              </p>
            </div>
          </div>

          {/* Navigation Controls (Mobile-First Tap Friendly) */}
          <div className="grid grid-cols-3 md:flex md:items-center md:justify-end gap-1.5 sm:gap-2 pt-1.5 md:pt-0 border-t border-amber-800/50 md:border-t-0 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs min-h-[38px] active:scale-95 ${
                activeTab === 'register'
                  ? 'bg-amber-500 text-red-950 shadow-amber-500/20'
                  : 'bg-red-900/60 text-amber-100 hover:bg-red-800/80 border border-amber-500/30'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">ተመዝገብ</span>
            </button>

            <button
              onClick={() => setActiveTab('status')}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs min-h-[38px] active:scale-95 ${
                activeTab === 'status'
                  ? 'bg-amber-500 text-red-950 shadow-amber-500/20'
                  : 'bg-red-900/60 text-amber-100 hover:bg-red-800/80 border border-amber-500/30'
              }`}
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">የመገኘት </span>ሁኔታ
              </span>
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs min-h-[38px] active:scale-95 ${
                    activeTab === 'admin'
                      ? 'bg-amber-500 text-red-950 shadow-amber-500/20'
                      : 'bg-red-900/60 text-amber-100 hover:bg-red-800/80 border border-amber-500/30'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">ዳሽቦርድ</span>
                </button>
                
                <button
                  onClick={logout}
                  title="ከአካውንት ውጣ"
                  className="flex items-center justify-center p-2 rounded-xl text-xs font-medium bg-red-900/60 text-red-200 hover:bg-red-800/80 border border-red-700/50 transition-colors min-h-[38px] min-w-[36px] active:scale-95 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAdminModal}
                className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md border border-amber-400/40 min-h-[38px] active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">አስተዳዳሪ </span>መግቢያ
                </span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
