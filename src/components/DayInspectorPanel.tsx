import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  BILL_CATEGORIES,
  BILL_MAX_AMOUNT,
  BILL_NAME_MAX_LENGTH,
  type BillCategory,
  type BillInput,
  type BillRecord,
} from '../types/bill';
import {
  formatAmountInput,
  formatFullDateVi,
  formatVND,
  parseAmountInput,
  type CalendarWeek,
} from '../utils/calendar';
import { CategoryLabel } from './CategoryLabel';

interface DayInspectorPanelProps {
  selectedDateKey: string;
  bills: BillRecord[];
  selectedWeek: CalendarWeek | undefined;
  onAddBill: (input: BillInput) => Promise<void>;
  onUpdateBill: (billId: string, input: BillInput) => Promise<void>;
  onTogglePaid: (bill: BillRecord, isPaid: boolean) => Promise<void>;
  onDeleteBill: (billId: string) => Promise<void>;
  autoFocusTrigger: number;
  onCloseMobile?: () => void;
}

export function DayInspectorPanel({
  selectedDateKey,
  bills,
  selectedWeek,
  onAddBill,
  onUpdateBill,
  onTogglePaid,
  onDeleteBill,
  autoFocusTrigger,
  onCloseMobile,
}: DayInspectorPanelProps) {
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<BillCategory>('Ăn uống');
  const [isPaid, setIsPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmountText, setEditAmountText] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState<BillCategory>('Ăn uống');
  const [editIsPaid, setEditIsPaid] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setEditingId(null);
    setConfirmDeleteId(null);
    setFormError(null);
  }, [selectedDateKey]);

  useEffect(() => {
    if (autoFocusTrigger > 0) {
      const el = document.getElementById('inspector-bill-name');
      if (el) el.focus();
    }
  }, [autoFocusTrigger]);

  const dailyTotal = bills.reduce((sum, b) => sum + b.amount, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const numericAmount = parseAmountInput(amountText);

    if (!trimmedName) {
      setFormError('Vui lòng nhập tên khoản chi tiêu.');
      return;
    }
    if (numericAmount <= 0 || numericAmount > BILL_MAX_AMOUNT) {
      setFormError('Vui lòng nhập số tiền hợp lệ lớn hơn 0 ₫.');
      return;
    }

    setSubmitting(true);
    try {
      await onAddBill({
        name: trimmedName,
        amount: numericAmount,
        date: selectedDateKey,
        category,
        isPaid,
      });
      setName('');
      setAmountText('');
      setIsPaid(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể lưu khoản chi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (bill: BillRecord) => {
    setTogglingId(bill.id);
    setFormError(null);
    try {
      await onTogglePaid(bill, !bill.isPaid);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.'
      );
    } finally {
      setTogglingId(null);
    }
  };

  const startEdit = (bill: BillRecord) => {
    setEditingId(bill.id);
    setEditName(bill.name);
    setEditAmountText(formatAmountInput(String(bill.amount)));
    setEditDate(bill.date);
    setEditCategory(bill.category);
    setEditIsPaid(bill.isPaid);
    setConfirmDeleteId(null);
    setFormError(null);
  };

  const saveEdit = async (billId: string) => {
    const trimmed = editName.trim();
    const numericAmount = parseAmountInput(editAmountText);
    if (!trimmed || numericAmount <= 0 || numericAmount > BILL_MAX_AMOUNT) {
      setFormError('Tên khoản chi hoặc số tiền cập nhật chưa hợp lệ.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onUpdateBill(billId, {
        name: trimmed,
        amount: numericAmount,
        date: editDate,
        category: editCategory,
        isPaid: editIsPaid,
      });
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể cập nhật khoản chi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (billId: string) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await onDeleteBill(billId);
      setConfirmDeleteId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không thể xóa khoản chi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col h-full shadow-xs">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Chi tiết ngày đã chọn
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
            {formatFullDateVi(selectedDateKey)}
          </h2>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Tổng trong ngày:</span>
            <span className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {formatVND(dailyTotal)}
            </span>
          </div>
        </div>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Đóng bảng chi tiết"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer xl:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick-add Form */}
      <form
        onSubmit={handleSubmit}
        className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-3"
      >
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Ghi nhận khoản chi mới
        </div>

        <div>
          <label
            htmlFor="inspector-bill-name"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
          >
            Tên khoản chi
          </label>
          <input
            id="inspector-bill-name"
            type="text"
            value={name}
            maxLength={BILL_NAME_MAX_LENGTH}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Cà phê, Ăn trưa, Tiền điện..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label
              htmlFor="inspector-bill-amount"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Giá tiền (₫)
            </label>
            <div className="relative">
              <input
                id="inspector-bill-amount"
                type="text"
                inputMode="numeric"
                value={amountText}
                onChange={(e) => setAmountText(formatAmountInput(e.target.value))}
                placeholder="50.000"
                className="w-full pl-3 pr-7 py-2 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 dark:text-slate-500 pointer-events-none">
                ₫
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="inspector-bill-category"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Phân loại
            </label>
            <select
              id="inspector-bill-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as BillCategory)}
              className="w-full px-2.5 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
            >
              {BILL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Trạng thái thanh toán
          </span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setIsPaid(false)}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                !isPaid
                  ? 'bg-white dark:bg-slate-950 text-amber-800 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Chưa thanh toán
            </button>
            <button
              type="button"
              onClick={() => setIsPaid(true)}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                isPaid
                  ? 'bg-white dark:bg-slate-950 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Đã thanh toán
            </button>
          </div>
        </div>

        {formError && (
          <p className="text-xs text-red-700 dark:text-red-400 font-medium" role="alert">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{submitting ? 'Đang lưu...' : 'Thêm khoản chi'}</span>
        </button>
      </form>

      {/* Bills List for Selected Day */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {bills.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Chưa có khoản chi nào trong ngày này
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nhập tên, phân loại và giá tiền ở biểu mẫu phía trên để ghi nhận chi tiêu.
            </p>
          </div>
        ) : (
          bills.map((bill) => {
            const isEditing = editingId === bill.id;
            const isConfirmingDelete = confirmDeleteId === bill.id;
            const isToggling = togglingId === bill.id;

            if (isEditing) {
              return (
                <div key={bill.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
                  <input
                    type="text"
                    value={editName}
                    maxLength={BILL_NAME_MAX_LENGTH}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Sửa tên khoản chi"
                    className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editAmountText}
                      onChange={(e) =>
                        setEditAmountText(formatAmountInput(e.target.value))
                      }
                      aria-label="Sửa giá tiền"
                      className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
                    />
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as BillCategory)}
                      aria-label="Sửa phân loại"
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
                    >
                      {BILL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    aria-label="Sửa ngày chi"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
                  />
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-md">
                    <button
                      type="button"
                      onClick={() => setEditIsPaid(false)}
                      className={`py-1 text-xs font-medium rounded cursor-pointer ${
                        !editIsPaid
                          ? 'bg-white dark:bg-slate-950 text-amber-800 dark:text-amber-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Chưa thanh toán
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsPaid(true)}
                      className={`py-1 text-xs font-medium rounded cursor-pointer ${
                        editIsPaid
                          ? 'bg-white dark:bg-slate-950 text-emerald-800 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Đã thanh toán
                    </button>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => saveEdit(bill.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded-md hover:bg-slate-800 dark:hover:bg-emerald-500 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Lưu
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={bill.id}
                className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggle(bill)}
                    title={
                      bill.isPaid
                        ? 'Đánh dấu chưa thanh toán'
                        : 'Đánh dấu đã thanh toán'
                    }
                    aria-label={`Đổi trạng thái thanh toán của ${bill.name}`}
                    className="mt-0.5 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {bill.isPaid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {bill.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <CategoryLabel category={bill.category} className="text-[11px]" />
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          bill.isPaid
                            ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                            : 'text-amber-700 dark:text-amber-400 font-medium'
                        }
                      >
                        {bill.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatVND(bill.amount)}
                  </span>

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDelete(bill.id)}
                        className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 cursor-pointer"
                      >
                        Xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => startEdit(bill)}
                        aria-label={`Sửa ${bill.name}`}
                        className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(bill.id)}
                        aria-label={`Xóa ${bill.name}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Week Footer */}
      {selectedWeek && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Tổng Tuần {selectedWeek.weekIndex} ({selectedWeek.labelRange})
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Thứ 2 – Chủ nhật · {selectedWeek.paidCount}/{selectedWeek.billCount} đã trả
            </div>
          </div>
          <div className="text-base font-mono font-bold text-slate-900 dark:text-slate-50 tabular-nums">
            {formatVND(selectedWeek.weeklyTotal)}
          </div>
        </div>
      )}
    </aside>
  );
}
