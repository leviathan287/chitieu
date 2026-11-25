import { useMemo, useState } from 'react';
import { CheckCheck, RotateCcw } from 'lucide-react';
import {
  BILL_CATEGORIES,
  type BillCategory,
  type BillRecord,
} from '../types/bill';
import {
  WEEKDAY_SHORT,
  formatShortDayMonth,
  formatVND,
  type CalendarWeek,
} from '../utils/calendar';
import { CATEGORY_VISUALS, CategoryLabel } from './CategoryLabel';

interface WeeklySummaryViewProps {
  monthTitle: string;
  monthBills: BillRecord[];
  weeks: CalendarWeek[];
  onSelectDateInCalendar: (dateKey: string) => void;
  onBatchToggleWeekPaid: (week: CalendarWeek, isPaid: boolean) => Promise<void>;
}

interface CategoryStatRow {
  category: BillCategory;
  count: number;
  paidAmount: number;
  unpaidAmount: number;
  totalAmount: number;
  sharePct: number;
}

export function WeeklySummaryView({
  monthTitle,
  monthBills,
  weeks,
  onSelectDateInCalendar,
  onBatchToggleWeekPaid,
}: WeeklySummaryViewProps) {
  const [categoryScope, setCategoryScope] = useState<'month' | string>('month');
  const [batchLoadingWeek, setBatchLoadingWeek] = useState<string | null>(null);

  const maxWeeklyTotal = Math.max(...weeks.map((w) => w.weeklyTotal), 1);

  const scopedBills = useMemo(() => {
    if (categoryScope === 'month') return monthBills;
    const found = weeks.find((w) => w.startDateKey === categoryScope);
    return found ? found.bills : monthBills;
  }, [categoryScope, monthBills, weeks]);

  const scopedTotal = useMemo(
    () => scopedBills.reduce((s, b) => s + b.amount, 0),
    [scopedBills]
  );

  const categoryRows: CategoryStatRow[] = useMemo(() => {
    const map = new Map<
      BillCategory,
      { count: number; paidAmount: number; unpaidAmount: number; totalAmount: number }
    >();

    for (const cat of BILL_CATEGORIES) {
      map.set(cat, { count: 0, paidAmount: 0, unpaidAmount: 0, totalAmount: 0 });
    }

    for (const bill of scopedBills) {
      const entry = map.get(bill.category) ?? {
        count: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        totalAmount: 0,
      };
      entry.count += 1;
      entry.totalAmount += bill.amount;
      if (bill.isPaid) {
        entry.paidAmount += bill.amount;
      } else {
        entry.unpaidAmount += bill.amount;
      }
      map.set(bill.category, entry);
    }

    const rows: CategoryStatRow[] = [];
    for (const [category, stats] of map.entries()) {
      rows.push({
        category,
        ...stats,
        sharePct:
          scopedTotal > 0 ? Math.round((stats.totalAmount / scopedTotal) * 100) : 0,
      });
    }

    rows.sort((a, b) => b.totalAmount - a.totalAmount);
    return rows;
  }, [scopedBills, scopedTotal]);

  const scopedPaidTotal = categoryRows.reduce((s, r) => s + r.paidAmount, 0);
  const scopedUnpaidTotal = categoryRows.reduce((s, r) => s + r.unpaidAmount, 0);

  const handleWeekBatch = async (week: CalendarWeek, targetPaid: boolean) => {
    setBatchLoadingWeek(week.startDateKey);
    try {
      await onBatchToggleWeekPaid(week, targetPaid);
    } finally {
      setBatchLoadingWeek(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Tổng kết chi tiêu theo tuần & phân loại — {monthTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Mỗi tuần tính từ Thứ 2 đến Chủ nhật, hỗ trợ thanh toán nhanh cả tuần và xem tỷ trọng theo từng phân loại.
          </p>
        </div>
      </div>

      {/* Category Summary Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Bảng tổng kết theo phân loại khoản chi
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {scopedBills.length} khoản chi · Tổng {formatVND(scopedTotal)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setCategoryScope('month')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryScope === 'month'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Cả tháng
            </button>
            {weeks.map((week) => (
              <button
                key={week.startDateKey}
                type="button"
                onClick={() => setCategoryScope(week.startDateKey)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryScope === week.startDateKey
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Tuần {week.weekIndex}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-2.5 px-4 whitespace-nowrap">Phân loại</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Số khoản</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Đã thanh toán</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Chưa thanh toán</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tổng chi</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap w-44">Tỷ trọng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {categoryRows.map((row) => {
                const visual = CATEGORY_VISUALS[row.category] ?? CATEGORY_VISUALS['Khác'];
                return (
                  <tr
                    key={row.category}
                    className="h-11 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                      <CategoryLabel category={row.category} />
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                      {row.count}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                      {formatVND(row.paidAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-amber-700 dark:text-amber-400 tabular-nums whitespace-nowrap">
                      {formatVND(row.unpaidAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                      {formatVND(row.totalAmount)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${visual.barClass}`}
                            style={{ width: `${row.sharePct}%` }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                          {row.sharePct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold">
                <td className="py-3 px-4 text-slate-900 dark:text-slate-100">
                  Tổng cộng
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                  {scopedBills.length}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatVND(scopedPaidTotal)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatVND(scopedUnpaidTotal)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  {formatVND(scopedTotal)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                  {scopedTotal > 0 ? '100%' : '0%'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Weekly Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weeks.map((week) => {
          const maxDailyInWeek = Math.max(
            ...week.days.map((d) => d.dailyTotal),
            1
          );
          const sharePct =
            week.weeklyTotal > 0
              ? Math.round((week.weeklyTotal / maxWeeklyTotal) * 100)
              : 0;
          const isAllPaid = week.billCount > 0 && week.unpaidCount === 0;
          const isBatchBusy = batchLoadingWeek === week.startDateKey;

          return (
            <div
              key={week.startDateKey}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                      Tuần {week.weekIndex} · {week.labelRange}
                    </div>
                    <div className="mt-1 text-xl font-mono font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                      {formatVND(week.weeklyTotal)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                      {week.paidCount}/{week.billCount} khoản đã trả
                    </div>
                    <div className="mt-1 text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                      Chưa trả: {formatVND(week.weeklyUnpaidTotal)}
                    </div>
                  </div>
                </div>

                {/* Proportion bar vs highest week */}
                <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-200"
                    style={{ width: `${sharePct}%` }}
                  />
                </div>

                {/* 7-day Mon -> Sun breakdown */}
                <div className="mt-5 grid grid-cols-7 gap-2 items-end">
                  {week.days.map((day, idx) => {
                    const barH =
                      day.dailyTotal > 0
                        ? Math.max(10, Math.round((day.dailyTotal / maxDailyInWeek) * 56))
                        : 4;

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => onSelectDateInCalendar(day.dateKey)}
                        className="group flex flex-col items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900 dark:focus-visible:outline-emerald-400 rounded p-1 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        title={`${WEEKDAY_SHORT[idx]} (${formatShortDayMonth(day.date)}): ${formatVND(day.dailyTotal)}`}
                      >
                        <div className="h-14 w-full flex items-end justify-center">
                          <div
                            className={`w-full max-w-[20px] rounded-t transition-colors ${
                              day.dailyTotal > 0
                                ? 'bg-slate-800 dark:bg-slate-300 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                            style={{ height: `${barH}px` }}
                          />
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {WEEKDAY_SHORT[idx]}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                          {day.date.getDate()}/{day.date.getMonth() + 1}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>Nhấn cột ngày để mở chi tiết trên lịch</span>
                {week.billCount > 0 && (
                  <button
                    type="button"
                    disabled={isBatchBusy}
                    onClick={() => handleWeekBatch(week, !isAllPaid)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      isAllPaid
                        ? 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        : 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    }`}
                  >
                    {isAllPaid ? (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        <span>Đặt chưa trả</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Thanh toán cả tuần</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
