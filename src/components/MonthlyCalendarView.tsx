import { useState } from 'react';
import { CheckCheck, CheckCircle2, Circle, Plus, RotateCcw } from 'lucide-react';
import {
  WEEKDAY_HEADERS,
  WEEKDAY_SHORT,
  formatVND,
  type CalendarDay,
  type CalendarWeek,
} from '../utils/calendar';

interface MonthlyCalendarViewProps {
  weeks: CalendarWeek[];
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  onQuickAddDate: (dateKey: string) => void;
  selectedWeekStart: string | null;
  onSelectWeek: (week: CalendarWeek) => void;
  onBatchToggleWeekPaid: (week: CalendarWeek, isPaid: boolean) => Promise<void>;
  searchQuery: string;
}

export function MonthlyCalendarView({
  weeks,
  selectedDateKey,
  onSelectDate,
  onQuickAddDate,
  selectedWeekStart,
  onSelectWeek,
  onBatchToggleWeekPaid,
  searchQuery,
}: MonthlyCalendarViewProps) {
  const [batchLoadingWeek, setBatchLoadingWeek] = useState<string | null>(null);

  const maxWeeklyTotal = Math.max(...weeks.map((w) => w.weeklyTotal), 1);
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const matchesSearch = (day: CalendarDay) => {
    if (!normalizedSearch) return day.bills;
    return day.bills.filter(
      (b) =>
        b.name.toLowerCase().includes(normalizedSearch) ||
        b.category.toLowerCase().includes(normalizedSearch)
    );
  };

  const handleWeekBatch = async (week: CalendarWeek, targetPaid: boolean) => {
    setBatchLoadingWeek(week.startDateKey);
    try {
      await onBatchToggleWeekPaid(week, targetPaid);
    } finally {
      setBatchLoadingWeek(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Desktop 8-column header: Mon -> Sun + Weekly Total */}
      <div className="hidden lg:grid lg:grid-cols-[repeat(7,minmax(0,1fr))_196px] bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800">
        {WEEKDAY_HEADERS.map((label, idx) => (
          <div
            key={label}
            className={`px-3 py-2.5 text-xs font-semibold tracking-tight ${
              idx >= 5
                ? 'text-slate-500 dark:text-slate-400'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {label}
          </div>
        ))}
        <div className="px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 text-right">
          Tổng tuần
        </div>
      </div>

      {/* Mobile 7-column compact weekday header */}
      <div className="grid grid-cols-7 lg:hidden bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800">
        {WEEKDAY_SHORT.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Rows (Each row = 1 full Mon-Sun week + its Weekly Total & Batch Payment Control) */}
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {weeks.map((week) => {
          const isWeekHighlighted = selectedWeekStart === week.startDateKey;
          const barWidthPct =
            week.weeklyTotal > 0
              ? Math.max(6, Math.round((week.weeklyTotal / maxWeeklyTotal) * 100))
              : 0;
          const isAllPaid = week.billCount > 0 && week.unpaidCount === 0;
          const isBatchBusy = batchLoadingWeek === week.startDateKey;

          return (
            <div key={week.startDateKey}>
              {/* Desktop Row */}
              <div className="hidden lg:grid lg:grid-cols-[repeat(7,minmax(0,1fr))_196px] divide-x divide-slate-200 dark:divide-slate-800">
                {week.days.map((day) => {
                  const isSelected = day.dateKey === selectedDateKey;
                  const visibleBills = matchesSearch(day);
                  const visibleTotal = normalizedSearch
                    ? visibleBills.reduce((s, b) => s + b.amount, 0)
                    : day.dailyTotal;

                  return (
                    <div
                      key={day.dateKey}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectDate(day.dateKey)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectDate(day.dateKey);
                        }
                      }}
                      aria-label={`Ngày ${day.dayOfMonth}, tổng chi ${formatVND(visibleTotal)}`}
                      className={`group relative min-h-[126px] p-2.5 flex flex-col justify-between text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-slate-900 dark:focus-visible:outline-emerald-400 ${
                        isSelected
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/25 ring-2 ring-inset ring-slate-900 dark:ring-emerald-500'
                          : day.isCurrentMonth
                          ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                          : 'bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100/70 dark:hover:bg-slate-900/80'
                      }`}
                    >
                      {/* Top: Date number + Daily Total / Quick-add */}
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span
                          className={`inline-flex items-center justify-center text-xs font-semibold tabular-nums ${
                            day.isToday
                              ? 'w-6 h-6 rounded-md bg-slate-900 dark:bg-emerald-600 text-white'
                              : day.isCurrentMonth
                              ? 'text-slate-900 dark:text-slate-100 px-0.5 py-0.5'
                              : 'text-slate-400 dark:text-slate-600 px-0.5 py-0.5'
                          }`}
                        >
                          {day.dayOfMonth}
                        </span>

                        <div className="flex items-center gap-1 min-w-0">
                          {visibleTotal > 0 && (
                            <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums truncate">
                              {formatVND(visibleTotal)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAddDate(day.dateKey);
                            }}
                            title="Thêm khoản chi cho ngày này"
                            aria-label={`Thêm khoản chi ngày ${day.dateKey}`}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-5 h-5 rounded flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-opacity cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Middle: Compact list of daily bills (Status + Name + Price) */}
                      <div className="space-y-1 flex-1 min-w-0">
                        {visibleBills.slice(0, 3).map((bill) => (
                          <div
                            key={bill.id}
                            title={`${bill.name} · ${bill.category} (${
                              bill.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'
                            })`}
                            className="flex items-center justify-between gap-1 text-[11px] leading-snug"
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              {bill.isPaid ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                              )}
                              <span
                                className={`truncate ${
                                  day.isCurrentMonth
                                    ? 'text-slate-700 dark:text-slate-300'
                                    : 'text-slate-400 dark:text-slate-500'
                                }`}
                              >
                                {bill.name}
                              </span>
                            </div>
                            <span
                              className={`font-mono tabular-nums shrink-0 ${
                                day.isCurrentMonth
                                  ? 'text-slate-900 dark:text-slate-100 font-medium'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {formatVND(bill.amount)}
                            </span>
                          </div>
                        ))}
                        {visibleBills.length > 3 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                            +{visibleBills.length - 3} khoản khác
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 8th Column: Auto-calculated Weekly Total + Batch Payment Control */}
                <div
                  className={`p-3 flex flex-col justify-between text-right transition-colors ${
                    isWeekHighlighted
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'bg-slate-50/70 dark:bg-slate-900/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectWeek(week)}
                    className="w-full text-right cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900 dark:focus-visible:outline-emerald-400 rounded"
                  >
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                      Tuần {week.weekIndex} · {week.labelRange}
                    </div>
                    <div
                      className={`mt-1 text-sm font-mono font-bold tabular-nums ${
                        week.weeklyTotal > 0
                          ? 'text-slate-900 dark:text-slate-50'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {formatVND(week.weeklyTotal)}
                    </div>
                  </button>

                  <div className="mt-2.5 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>{week.billCount} khoản</span>
                        {week.billCount > 0 && (
                          <span
                            className={
                              isAllPaid
                                ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                : 'text-amber-700 dark:text-amber-400 font-medium'
                            }
                          >
                            {week.paidCount}/{week.billCount} đã trả
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-200"
                          style={{ width: `${barWidthPct}%` }}
                        />
                      </div>
                    </div>

                    {week.billCount > 0 && (
                      <button
                        type="button"
                        disabled={isBatchBusy}
                        onClick={() => handleWeekBatch(week, !isAllPaid)}
                        className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                          isAllPaid
                            ? 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            : 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                        }`}
                      >
                        {isAllPaid ? (
                          <>
                            <RotateCcw className="w-3 h-3 shrink-0" />
                            <span>
                              {isBatchBusy ? 'Đang cập nhật...' : 'Đặt chưa trả'}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isBatchBusy
                                ? 'Đang cập nhật...'
                                : `Thanh toán tuần (${week.unpaidCount})`}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile / Tablet Row + Dedicated Weekly Total Strip with Batch Action */}
              <div className="lg:hidden">
                <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800">
                  {week.days.map((day) => {
                    const isSelected = day.dateKey === selectedDateKey;
                    const visibleBills = matchesSearch(day);
                    const visibleTotal = normalizedSearch
                      ? visibleBills.reduce((s, b) => s + b.amount, 0)
                      : day.dailyTotal;

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => onSelectDate(day.dateKey)}
                        className={`min-h-[72px] p-1.5 flex flex-col items-start justify-between text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-inset ring-slate-900 dark:ring-emerald-500'
                            : day.isCurrentMonth
                            ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            : 'bg-slate-50/70 dark:bg-slate-950/60 text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center text-xs font-semibold tabular-nums ${
                            day.isToday
                              ? 'w-5 h-5 rounded bg-slate-900 dark:bg-emerald-600 text-white'
                              : day.isCurrentMonth
                              ? 'text-slate-900 dark:text-slate-100'
                              : 'text-slate-400 dark:text-slate-600'
                          }`}
                        >
                          {day.dayOfMonth}
                        </span>

                        {visibleTotal > 0 && (
                          <div className="w-full mt-1">
                            <div className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums truncate">
                              {new Intl.NumberFormat('vi-VN').format(visibleTotal)}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                              {visibleBills.length} mục
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Mobile Weekly Total Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
                      Tuần {week.weekIndex} ({week.labelRange}) · {week.paidCount}/{week.billCount} đã trả
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {week.billCount > 0 && (
                      <button
                        type="button"
                        disabled={isBatchBusy}
                        onClick={() => handleWeekBatch(week, !isAllPaid)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                          isAllPaid
                            ? 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            : 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {isAllPaid ? 'Đặt chưa trả' : 'Thanh toán tuần'}
                      </button>
                    )}
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                      {formatVND(week.weeklyTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
