import { Plus } from 'lucide-react';
import type { AppView } from '../types/bill';

interface TopBarProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  isSignedIn: boolean;
  onPrimaryAction: () => void;
}

const NAV_ITEMS: { id: AppView; label: string }[] = [
  { id: 'calendar', label: 'Lịch tháng' },
  { id: 'ledger', label: 'Sổ chi tiêu' },
  { id: 'weekly', label: 'Tổng kết tuần' },
];

export function TopBar({
  activeView,
  onChangeView,
  isSignedIn,
  onPrimaryAction,
}: TopBarProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onChangeView('calendar')}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900 dark:focus-visible:outline-slate-100 rounded"
        >
          Sổ Chi Tiêu
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-6"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900 dark:focus-visible:outline-slate-100 ${
                  isActive
                    ? 'text-slate-900 dark:text-white border-slate-900 dark:border-emerald-500'
                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 active:bg-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-emerald-400"
          >
            {isSignedIn ? (
              <>
                <Plus className="w-4 h-4 shrink-0" />
                <span>Ghi chi tiêu</span>
              </>
            ) : (
              <span>Đăng nhập Google</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
