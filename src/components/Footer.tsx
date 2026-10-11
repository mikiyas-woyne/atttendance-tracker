import React from 'react';
import { EthiopianOrthodoxCross } from './EthiopianOrthodoxCross';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-red-950 text-amber-100 border-t-2 border-amber-500/40 mt-12 py-8 text-center text-xs">
      <div className="max-w-7xl mx-auto px-4 space-y-3">
        <div className="flex items-center justify-center gap-2 text-amber-200 font-bold text-sm font-serif">
          <EthiopianOrthodoxCross className="w-5 h-5 text-amber-400" />
          <span>ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት</span>
        </div>

        <p className="text-amber-100/70 text-xs italic font-serif">
          «በኦርቶዶክሳዊት ተዋሕዶ እምነት እና ስነ-ምግባር የታነፁ ትውልዶችን እናፈራለን»
        </p>

        <p className="text-slate-400 text-[11px] pt-2 border-t border-red-900/60 max-w-md mx-auto">
          © {new Date().getFullYear()} ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት የተማሪዎች ምዝገባ እና የመገኘት መዝገብ ሥርዓት።
        </p>
      </div>
    </footer>
  );
};
