export const ETHIOPIC_MONTHS = [
  'መስከረም',
  'ጥቅምት',
  'ኅዳር',
  'ታኅሣሥ',
  'ጥር',
  'የካቲት',
  'መጋቢት',
  'ሚያዝያ',
  'ግንቦት',
  'ሰኔ',
  'ሐምሌ',
  'ነሐሴ',
  'ጳጉሜን',
];

export interface EthiopicDateObj {
  day: number;
  month: number; // 1-13
  monthName: string;
  year: number;
  formatted: string;
}

// Convert Gregorian date to Ethiopian date
export function toEthiopianDate(gregorianDate: Date): EthiopicDateObj {
  const year = gregorianDate.getFullYear();
  const month = gregorianDate.getMonth() + 1;
  const day = gregorianDate.getDate();

  // Approximate Ethiopian Year offset
  let ethYear = year - 8;
  if (month > 9 || (month === 9 && day >= 11)) {
    ethYear = year - 7;
  }

  // Calculate approximate Ethiopian month & day
  let ethMonth = 1;
  let ethDay = 1;

  // Ethiopian New Year starts Sept 11 (or Sept 12 in leap year)
  const isLeap = (year % 4 === 3);
  const newYearDay = isLeap ? 12 : 11;

  const dateMs = gregorianDate.getTime();
  const newYearMs = new Date(year, 8, newYearDay).getTime(); // Sept 11/12

  if (dateMs >= newYearMs) {
    const diffDays = Math.floor((dateMs - newYearMs) / (1000 * 60 * 60 * 24));
    ethMonth = Math.floor(diffDays / 30) + 1;
    ethDay = (diffDays % 30) + 1;
  } else {
    const prevNewYearMs = new Date(year - 1, 8, newYearDay).getTime();
    const diffDays = Math.floor((dateMs - prevNewYearMs) / (1000 * 60 * 60 * 24));
    ethMonth = Math.floor(diffDays / 30) + 1;
    ethDay = (diffDays % 30) + 1;
  }

  // Ensure bounds
  if (ethMonth > 13) ethMonth = 13;
  if (ethMonth === 13 && ethDay > 6) ethDay = 6;
  if (ethDay > 30 && ethMonth !== 13) ethDay = 30;

  const monthName = ETHIOPIC_MONTHS[ethMonth - 1] || 'መስከረም';
  const formatted = `${monthName} ${ethDay} ቀን ${ethYear} ዓ.ም`;

  return {
    day: ethDay,
    month: ethMonth,
    monthName,
    year: ethYear,
    formatted,
  };
}

export function formatEthiopianDateFull(day: number, monthIndex: number, year: number): string {
  const monthName = ETHIOPIC_MONTHS[monthIndex - 1] || 'መስከረም';
  return `${monthName} ${day} ቀን ${year} ዓ.ም`;
}
