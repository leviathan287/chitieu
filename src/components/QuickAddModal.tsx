import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  BILL_CATEGORIES,
  BILL_MAX_AMOUNT,
  BILL_NAME_MAX_LENGTH,
  type BillCategory,
  type BillInput,
} from '../types/bill';
import { formatAmountInput, parseAmountInput } from '../utils/calendar';

interface QuickAddModalProps {
  isOpen: boolean;
  defaultDateKey: string;
  onClose: () => void;
  onAddBill: (input: BillInput) => Promise<void>;
}

export function QuickAddModal({
  isOpen,
  defaultDateKey,
  onClose,
  onAddBill,
}: QuickAddModalProps) {
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(defaultDateKey);
  const [category, setCategory] = useState<BillCategory>('Ăn uống');
  const [isPaid, setIsPaid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(defaultDateKey);
      setIsPaid(false);
      setError(null);
    }
  }, [isOpen, defaultDateKey]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    const numericAmount = parseAmountInput(amountText);
    if (!trimmed) {
      setError('Vui lòng nhập tên khoản chi tiêu.');
      return;
    }
    if (numericAmount <= 0 || numericAmount > BILL_MAX_AMOUNT) {
      setError('Vui lòng nhập giá tiền hợp lệ lớn hơn 0 ₫.');
      return;
    }

    setSubmitting(true);
    try {
      await onAddBill({
        name: trimmed,
        amount: numericAmount,
        date,
        category,
        isPaid,
      });
      setName('');
      setAmountText('');
      setIsPaid(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu khoản chi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-modal-title"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 id="quick-add-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Ghi nhận khoản chi mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="modal-bill-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Tên khoản chi
            </label>
            <input
              id="modal-bill-name"
              type="text"
              autoFocus
              value={name}
              maxLength={BILL_NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Đi chợ, Học phí tiếng Anh, Vé máy bay..."
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-bill-amount"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Giá tiền (₫)
              </label>
              <div className="relative">
                <input
                  id="modal-bill-amount"
                  type="text"
                  inputMode="numeric"
                  value={amountText}
                  onChange={(e) =>
                    setAmountText(formatAmountInput(e.target.value))
                  }
                  placeholder="120.000"
                  className="w-full pl-3.5 pr-8 py-2.5 text-sm font-mono tabular-nums bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 dark:text-slate-500 pointer-events-none">
                  ₫
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="modal-bill-category"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Phân loại
              </label>
              <select
                id="modal-bill-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as BillCategory)}
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              >
                {BILL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-bill-date"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Ngày chi tiêu
              </label>
              <input
                id="modal-bill-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Trạng thái thanh toán
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`py-2 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    !isPaid
                      ? 'bg-white dark:bg-slate-950 text-amber-800 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Chưa trả
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`py-2 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    isPaid
                      ? 'bg-white dark:bg-slate-950 text-emerald-800 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Đã trả
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-700 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Đang lưu...' : 'Lưu khoản chi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
