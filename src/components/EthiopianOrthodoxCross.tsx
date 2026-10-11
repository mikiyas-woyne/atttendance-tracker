import React from 'react';

interface EthiopianOrthodoxCrossProps {
  className?: string;
  showText?: boolean;
}

export const EthiopianOrthodoxCross: React.FC<EthiopianOrthodoxCrossProps> = ({
  className = 'w-8 h-8 text-amber-300',
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${showText ? 'flex-col sm:flex-row' : ''}`}>
      <svg
        className={className}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sunburst Rays radiating behind the cross */}
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.95">
          <line x1="22" y1="28" x2="32" y2="28" />
          <line x1="28" y1="20" x2="36" y2="23" />
          <line x1="36" y1="13" x2="42" y2="19" />
          <line x1="46" y1="8" x2="49" y2="16" />
          <line x1="60" y1="5" x2="60" y2="14" />
          <line x1="74" y1="8" x2="71" y2="16" />
          <line x1="84" y1="13" x2="78" y2="19" />
          <line x1="92" y1="20" x2="84" y2="23" />
          <line x1="98" y1="28" x2="88" y2="28" />
          
          <line x1="32" y1="16" x2="37" y2="20" opacity="0.6" />
          <line x1="53" y1="7" x2="55" y2="13" opacity="0.6" />
          <line x1="67" y1="7" x2="65" y2="13" opacity="0.6" />
          <line x1="88" y1="16" x2="83" y2="20" opacity="0.6" />
        </g>

        {/* Ethiopian Orthodox Cross above the book */}
        <g fill="currentColor" stroke="currentColor" strokeWidth="0.5">
          <rect x="57" y="16" width="6" height="24" rx="1" />
          <rect x="47" y="23" width="26" height="6" rx="1" />
          
          {/* Trefoil Cross Tips */}
          <circle cx="60" cy="14" r="2.8" />
          <circle cx="56.2" cy="17" r="1.8" />
          <circle cx="63.8" cy="17" r="1.8" />
          
          <circle cx="45" cy="26" r="2.8" />
          <circle cx="48" cy="22.2" r="1.8" />
          <circle cx="48" cy="29.8" r="1.8" />

          <circle cx="75" cy="26" r="2.8" />
          <circle cx="72" cy="22.2" r="1.8" />
          <circle cx="72" cy="29.8" r="1.8" />

          <circle cx="60" cy="26" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </g>

        {/* Open Holy Bible */}
        <g stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" fill="none">
          {/* Book Base / Binding Fill */}
          <path d="M 16 78 C 36 82, 54 78, 60 74 C 66 78, 84 82, 104 78 L 104 74 C 84 78, 66 74, 60 70 C 54 74, 36 78, 16 74 Z" fill="currentColor" opacity="0.2" />
          <path d="M 16 74 C 36 78, 54 74, 60 70 L 60 40 C 54 44, 36 48, 16 44 Z" />
          <path d="M 104 74 C 84 78, 66 74, 60 70 L 60 40 C 66 44, 84 48, 104 44 Z" />

          {/* Top Page Edge Curves */}
          <path d="M 16 44 C 36 48, 54 44, 60 40" />
          <path d="M 104 44 C 84 48, 66 44, 60 40" />

          {/* Bottom Page Edge Curves */}
          <path d="M 16 74 C 36 78, 54 74, 60 70" />
          <path d="M 104 74 C 84 78, 66 74, 60 70" />

          {/* Book Spine Center Line */}
          <line x1="60" y1="40" x2="60" y2="70" strokeWidth="2.8" />

          {/* Left Page Ruling Lines */}
          <g stroke="currentColor" strokeWidth="1.3" opacity="0.85">
            <path d="M 24 50 C 35 52, 45 50, 52 47" />
            <path d="M 23 55 C 35 57, 45 55, 52 52" />
            <path d="M 22 60 C 35 62, 45 60, 52 57" />
            <path d="M 21 65 C 35 67, 45 65, 52 62" />
            <path d="M 20 70 C 35 72, 45 70, 52 67" />
          </g>

          {/* Right Page Ruling Lines */}
          <g stroke="currentColor" strokeWidth="1.3" opacity="0.85">
            <path d="M 96 50 C 85 52, 75 50, 68 47" />
            <path d="M 97 55 C 85 57, 75 55, 68 52" />
            <path d="M 98 60 C 85 62, 75 60, 68 57" />
            <path d="M 99 65 C 85 67, 75 65, 68 62" />
            <path d="M 100 70 C 85 72, 75 70, 68 67" />
          </g>
        </g>
      </svg>

      {showText && (
        <div className="text-center font-serif">
          <div className="text-amber-300 font-bold text-lg sm:text-xl tracking-wide leading-tight">
            ፍሬ ሃይማኖት
          </div>
          <div className="text-amber-200/90 text-xs sm:text-sm font-medium tracking-widest uppercase">
            ሰንበት ትምህርት ቤት
          </div>
        </div>
      )}
    </div>
  );
};

export const FreHaymanotLogo = EthiopianOrthodoxCross;

