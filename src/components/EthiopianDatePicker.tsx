import React from 'react';
import { ETHIOPIC_MONTHS, formatEthiopianDateFull } from '../lib/ethiopianDate';
import { Calendar } from 'lucide-react';

interface EthiopianDatePickerProps {
  day: number;
  month: number; // 1-13
  year: number;
  onChangeDay: (day: number) => void;
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
  label?: string;
}

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022];

export const EthiopianDatePicker: React.FC<EthiopianDatePickerProps> = ({
  day,
  month,
  year,
  onChangeDay,
  onChangeMonth,
  onChangeYear,
  label = 'የአቴንዳንስ ቀን (የኢትዮጵያ ዘመን አቆጣጠር)',
}) => {
  const maxDays = month === 13 ? 6 : 30;
  const daysArray = Array.from({ length: maxDays }, (_, i) => i + 1);

  const fullFormattedDate = formatEthiopianDateFull(day, month, year);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-extrabold text-slate-700">
          {label}
        </label>
      )}

      {/* 3 Separate Dropdowns: Day, Month, Year */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* 1. Day Selector (ቀን) */}
        <div>
          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">ቀን</span>
          <select
            value={day}
            onChange={(e) => onChangeDay(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500"
          >
            {daysArray.map((d) => (
              <option key={d} value={d}>
                {d} ቀን
              </option>
            ))}
          </select>
        </div>

        {/* 2. Month Selector (ወር) */}
        <div>
          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">ወር</span>
          <select
            value={month}
            onChange={(e) => onChangeMonth(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl border border-slate-300 font-extrabold text-slate-900 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500"
          >
            {ETHIOPIC_MONTHS.map((mName, idx) => (
              <option key={mName} value={idx + 1}>
                {mName}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Year Selector (ዓመተ ምሕረት) */}
        <div>
          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">ዓመተ ምሕረት</span>
          <select
            value={year}
            onChange={(e) => onChangeYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y} ዓ.ም
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Full Amharic Formatted Date Display Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-100/90 text-amber-950 border border-amber-300 font-serif font-bold text-xs shadow-xs">
        <Calendar className="w-4 h-4 text-amber-800 shrink-0" />
        <span>የተመረጠው ቀን፡ {fullFormattedDate}</span>
      </div>
    </div>
  );
};
