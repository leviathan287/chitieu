import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Circle,
  Download,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  BILL_CATEGORIES,
  BILL_MAX_AMOUNT,
  BILL_NAME_MAX_LENGTH,
  type BillCategory,
  type BillInput,
  type BillRecord,
  type PaymentFilter,
} from '../types/bill';
import {
  WEEKDAY_FULL_VI,
  formatAmountInput,
  formatShortDayMonth,
  formatVND,
  parseAmountInput,
  parseDateKey,
  type CalendarWeek,
} from '../utils/calendar';
import { CategoryLabel } from './CategoryLabel';

interface LedgerTableViewProps {
  monthTitle: string;
  monthBills: BillRecord[];
  weeks: CalendarWeek[];
  onUpdateBill: (billId: string, input: BillInput) => Promise<void>;
  onTogglePaid: (bill: BillRecord, isPaid: boolean) => Promise<void>;
  onDeleteBill: (billId: string) => Promise<void>;
  onOpenQuickAdd: () => void;
  searchQuery: string;
}

export function LedgerTableView({
  monthTitle,
  monthBills,
  weeks,
  onUpdateBill,
  onTogglePaid,
  onDeleteBill,
  onOpenQuickAdd,
  searchQuery,
}: LedgerTableViewProps) {
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc'>('date-desc');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<BillCategory | 'all'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmountText, setEditAmountText] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState<BillCategory>('Ăn uống');
  const [editIsPaid, setEditIsPaid] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const findWeekForDate = (dateKey: string): CalendarWeek | undefined =>
    weeks.find((w) => dateKey >= w.startDateKey && dateKey <= w.endDateKey);

  const searchFilteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthBills.filter((b) => {
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === 'all' || b.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [monthBills, searchQuery, categoryFilter]);

  const paidTotal = useMemo(
    () =>
      searchFilteredBills
        .filter((b) => b.isPaid)
        .reduce((sum, b) => sum + b.amount, 0),
    [searchFilteredBills]
  );

  const unpaidTotal = useMemo(
    () =>
      searchFilteredBills
        .filter((b) => !b.isPaid)
        .reduce((sum, b) => sum + b.amount, 0),
    [searchFilteredBills]
  );

  const filteredBills = useMemo(() => {
    const list = searchFilteredBills.filter((b) => {
      if (paymentFilter === 'paid') return b.isPaid;
      if (paymentFilter === 'unpaid') return !b.isPaid;
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date);
    });
    return sorted;
  }, [searchFilteredBills, paymentFilter, sortBy]);

  const totalFiltered = filteredBills.reduce((s, b) => s + b.amount, 0);

  const handleToggleStatus = async (bill: BillRecord) => {
    setTogglingId(bill.id);
    try {
      await onTogglePaid(bill, !bill.isPaid);
    } finally {
      setTogglingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Ngày',
      'Thứ',
      'Tuần',
      'Phân loại',
      'Tên khoản chi',
      'Số tiền (VND)',
      'Trạng thái',
    ];
    const rows = filteredBills.map((b) => {
      const d = parseDateKey(b.date);
      const weekday = WEEKDAY_FULL_VI[d.getDay()];
      const week = findWeekForDate(b.date);
      const weekLabel = week ? `Tuần ${week.weekIndex} (${week.labelRange})` : '';
      const statusLabel = b.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán';
      return [
        b.date,
        weekday,
        weekLabel,
        b.category,
        `"${b.name.replace(/"/g, '""')}"`,
        String(b.amount),
        statusLabel,
      ].join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `so-chi-tieu-${monthTitle.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startEdit = (bill: BillRecord) => {
    setEditingId(bill.id);
    setEditName(bill.name);
    setEditAmountText(formatAmountInput(String(bill.amount)));
    setEditDate(bill.date);
    setEditCategory(bill.category);
    setEditIsPaid(bill.isPaid);
    setConfirmDeleteId(null);
  };

  const saveEdit = async (billId: string) => {
    const trimmed = editName.trim();
    const amount = parseAmountInput(editAmountText);
    if (!trimmed || amount <= 0 || amount > BILL_MAX_AMOUNT) return;
    await onUpdateBill(billId, {
      name: trimmed,
      amount,
      date: editDate,
      category: editCategory,
      isPaid: editIsPaid,
    });
    setEditingId(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Sổ chi tiêu {monthTitle}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {filteredBills.length} khoản chi · Tổng {formatVND(totalFiltered)} ·{' '}
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              Đã thanh toán: {formatVND(paidTotal)}
            </span>{' '}
            ·{' '}
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              Chưa thanh toán: {formatVND(unpaidTotal)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as BillCategory | 'all')
            }
            aria-label="Lọc theo phân loại"
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
          >
            <option value="all">Tất cả phân loại</option>
            {BILL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Payment Status Filter Tabs */}
          <div
            role="group"
            aria-label="Lọc trạng thái thanh toán"
            className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                paymentFilter === 'all'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setPaymentFilter('unpaid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                paymentFilter === 'unpaid'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Chưa thanh toán
            </button>
            <button
              type="button"
              onClick={() => setPaymentFilter('paid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                paymentFilter === 'paid'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Đã thanh toán
            </button>
          </div>

          {/* Sort Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setSortBy('date-desc')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sortBy === 'date-desc'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Mới nhất
            </button>
            <button
              type="button"
              onClick={() => setSortBy('date-asc')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sortBy === 'date-asc'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Cũ nhất
            </button>
            <button
              type="button"
              onClick={() => setSortBy('amount-desc')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sortBy === 'amount-desc'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Cao nhất
            </button>
          </div>

          <button
            type="button"
            disabled={filteredBills.length === 0}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {searchQuery.trim() || paymentFilter !== 'all' || categoryFilter !== 'all'
              ? 'Không tìm thấy khoản chi nào phù hợp với bộ lọc'
              : `Chưa có khoản chi tiêu nào trong ${monthTitle}`}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {searchQuery.trim() || paymentFilter !== 'all' || categoryFilter !== 'all'
              ? 'Thử thay đổi bộ lọc phân loại, trạng thái thanh toán hoặc từ khóa tìm kiếm.'
              : 'Hãy ghi nhận khoản chi đầu tiên để bắt đầu theo dõi ngân sách theo tuần.'}
          </p>
          {!searchQuery.trim() && paymentFilter === 'all' && categoryFilter === 'all' && (
            <button
              type="button"
              onClick={onOpenQuickAdd}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi khoản chi đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-2.5 px-4 whitespace-nowrap">Ngày</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Thứ</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Tuần (T2–CN)</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Phân loại</th>
                <th className="py-2.5 px-4">Tên khoản chi</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Giá tiền</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredBills.map((bill) => {
                const d = parseDateKey(bill.date);
                const week = findWeekForDate(bill.date);
                const isEditing = editingId === bill.id;
                const isConfirming = confirmDeleteId === bill.id;
                const isToggling = togglingId === bill.id;

                return (
                  <tr
                    key={bill.id}
                    className="h-11 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2 px-4 font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="px-2 py-1 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                      ) : (
                        formatShortDayMonth(d)
                      )}
                    </td>
                    <td className="py-2 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {WEEKDAY_FULL_VI[d.getDay()]}
                    </td>
                    <td className="py-2 px-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                      {week ? `Tuần ${week.weekIndex} (${week.labelRange})` : '—'}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editCategory}
                          onChange={(e) =>
                            setEditCategory(e.target.value as BillCategory)
                          }
                          className="px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        >
                          {BILL_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <CategoryLabel
                          category={bill.category}
                          className="text-slate-700 dark:text-slate-300 font-medium"
                        />
                      )}
                    </td>
                    <td className="py-2 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          maxLength={BILL_NAME_MAX_LENGTH}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                      ) : (
                        bill.name
                      )}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => setEditIsPaid((prev) => !prev)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            editIsPaid
                              ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                              : 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {editIsPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Đã thanh toán</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Chưa thanh toán</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleStatus(bill)}
                          aria-label={`Đổi trạng thái thanh toán của ${bill.name}`}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 ${
                            bill.isPaid
                              ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                              : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                          }`}
                        >
                          {bill.isPaid ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Đã thanh toán</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                              <span>Chưa thanh toán</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editAmountText}
                          onChange={(e) =>
                            setEditAmountText(formatAmountInput(e.target.value))
                          }
                          className="w-32 px-2 py-1 text-sm text-right font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                        />
                      ) : (
                        formatVND(bill.amount)
                      )}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => saveEdit(bill.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded hover:bg-slate-800 dark:hover:bg-emerald-500 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : isConfirming ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onDeleteBill(bill.id)}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 cursor-pointer"
                          >
                            Xóa
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(bill)}
                            aria-label={`Sửa ${bill.name}`}
                            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(bill.id)}
                            aria-label={`Xóa ${bill.name}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
