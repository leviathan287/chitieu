import type { BillRecord } from '../types/bill';

export interface CalendarDay {
  dateKey: string; // YYYY-MM-DD
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeekIndex: number; // 0 = Mon ... 6 = Sun
  bills: BillRecord[];
  dailyTotal: number;
}

export interface CalendarWeek {
  weekIndex: number; // 1-based index within the month grid
  startDateKey: string;
  endDateKey: string;
  labelRange: string; // e.g. "02/11 – 08/11"
  days: CalendarDay[]; // Always length 7: Monday -> Sunday
  bills: BillRecord[];
  weeklyTotal: number;
  weeklyPaidTotal: number;
  weeklyUnpaidTotal: number;
  billCount: number;
  paidCount: number;
  unpaidCount: number;
}

export const WEEKDAY_HEADERS = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật',
] as const;

export const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export const WEEKDAY_FULL_VI = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
] as const;

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatShortDayMonth(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

export function formatFullDateVi(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const weekday = WEEKDAY_FULL_VI[date.getDay()];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${weekday}, ${d} tháng ${m}, ${y}`;
}

export function formatMonthTitleVi(year: number, monthIndex: number): string {
  return `Tháng ${monthIndex + 1}, ${year}`;
}

export function formatVND(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount))} ₫`;
}

export function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Number(digits));
}

export function parseAmountInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Number(digits);
}

/**
 * Builds the monthly calendar grid where every week starts on Monday (Thứ 2)
 * and ends on Sunday (Chủ nhật), automatically computing daily, weekly, and paid/unpaid totals.
 */
export function buildMonthWeeks(
  year: number,
  monthIndex: number,
  billsByDate: Map<string, BillRecord[]>,
  todayKey: string
): CalendarWeek[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);

  const firstOffsetFromMonday = (firstOfMonth.getDay() + 6) % 7;
  const lastOffsetToSunday = (7 - lastOfMonth.getDay()) % 7;

  const gridStart = new Date(year, monthIndex, 1 - firstOffsetFromMonday);
  const gridEnd = new Date(year, monthIndex + 1, 0 + lastOffsetToSunday);

  const weeks: CalendarWeek[] = [];
  let cursor = new Date(gridStart);
  let weekCounter = 1;

  while (cursor <= gridEnd) {
    const days: CalendarDay[] = [];
    const weekBills: BillRecord[] = [];
    let weeklyTotal = 0;
    let weeklyPaidTotal = 0;
    let weeklyUnpaidTotal = 0;
    let billCount = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    for (let i = 0; i < 7; i++) {
      const cellDate = new Date(cursor);
      const dateKey = formatDateKey(cellDate);
      const dayBills = billsByDate.get(dateKey) ?? [];
      const dailyTotal = dayBills.reduce((sum, item) => sum + item.amount, 0);

      for (const b of dayBills) {
        weekBills.push(b);
        if (b.isPaid) {
          weeklyPaidTotal += b.amount;
          paidCount += 1;
        } else {
          weeklyUnpaidTotal += b.amount;
          unpaidCount += 1;
        }
      }

      weeklyTotal += dailyTotal;
      billCount += dayBills.length;

      days.push({
        dateKey,
        date: cellDate,
        dayOfMonth: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === monthIndex && cellDate.getFullYear() === year,
        isToday: dateKey === todayKey,
        dayOfWeekIndex: i,
        bills: dayBills,
        dailyTotal,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const startDate = days[0].date;
    const endDate = days[6].date;

    weeks.push({
      weekIndex: weekCounter++,
      startDateKey: days[0].dateKey,
      endDateKey: days[6].dateKey,
      labelRange: `${formatShortDayMonth(startDate)} – ${formatShortDayMonth(endDate)}`,
      days,
      bills: weekBills,
      weeklyTotal,
      weeklyPaidTotal,
      weeklyUnpaidTotal,
      billCount,
      paidCount,
      unpaidCount,
    });
  }

  return weeks;
}
