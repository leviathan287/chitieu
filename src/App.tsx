import { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Search,
  Sun,
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  batchSetBillsPaid,
  createBill,
  deleteBill,
  subscribeUserBills,
  toggleBillPaid,
  updateBill,
} from './services/billsService';
import type { AppView, BillInput, BillRecord, ThemeMode } from './types/bill';
import {
  buildMonthWeeks,
  formatDateKey,
  formatMonthTitleVi,
  formatVND,
  type CalendarWeek,
} from './utils/calendar';
import { TopBar } from './components/TopBar';
import { MonthlyCalendarView } from './components/MonthlyCalendarView';
import { DayInspectorPanel } from './components/DayInspectorPanel';
import { LedgerTableView } from './components/LedgerTableView';
import { WeeklySummaryView } from './components/WeeklySummaryView';
import { QuickAddModal } from './components/QuickAddModal';

function getInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'light';
}

export default function App() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [activeView, setActiveView] = useState<AppView>('calendar');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoFocusTrigger, setAutoFocusTrigger] = useState(0);
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('sochitieu_theme', theme);
    } catch {
      // Ignore storage failures
    }
  }, [theme]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setBills([]);
        setLoadingBills(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    setLoadingBills(true);
    const unsub = subscribeUserBills(
      user.uid,
      (records) => {
        setBills(records);
        setLoadingBills(false);
      },
      (err) => {
        setLoadingBills(false);
        setFatalError(err);
      }
    );

    return () => unsub();
  }, [authReady, user]);

  if (fatalError) {
    throw fatalError;
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể đăng nhập bằng Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const billsByDate = useMemo(() => {
    const map = new Map<string, BillRecord[]>();
    for (const bill of bills) {
      const list = map.get(bill.date);
      if (list) {
        list.push(bill);
      } else {
        map.set(bill.date, [bill]);
      }
    }
    return map;
  }, [bills]);

  const weeks = useMemo(
    () => buildMonthWeeks(currentYear, currentMonth, billsByDate, todayKey),
    [currentYear, currentMonth, billsByDate, todayKey]
  );

  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-`;

  const monthBills = useMemo(
    () => bills.filter((b) => b.date.startsWith(monthPrefix)),
    [bills, monthPrefix]
  );

  const monthTotal = useMemo(
    () => monthBills.reduce((sum, b) => sum + b.amount, 0),
    [monthBills]
  );

  const monthPaidTotal = useMemo(
    () =>
      monthBills
        .filter((b) => b.isPaid)
        .reduce((sum, b) => sum + b.amount, 0),
    [monthBills]
  );

  const monthUnpaidTotal = useMemo(
    () =>
      monthBills
        .filter((b) => !b.isPaid)
        .reduce((sum, b) => sum + b.amount, 0),
    [monthBills]
  );

  const monthPaidCount = useMemo(
    () => monthBills.filter((b) => b.isPaid).length,
    [monthBills]
  );

  const peakWeekTotal = useMemo(
    () => Math.max(...weeks.map((w) => w.weeklyTotal), 0),
    [weeks]
  );

  const selectedDayBills = useMemo(
    () => billsByDate.get(selectedDateKey) ?? [],
    [billsByDate, selectedDateKey]
  );

  const selectedWeek = useMemo(
    () =>
      weeks.find(
        (w) =>
          selectedDateKey >= w.startDateKey && selectedDateKey <= w.endDateKey
      ),
    [weeks, selectedDateKey]
  );

  const goToPrevMonth = () => {
    setSelectedWeekStart(null);
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
      setSelectedDateKey(`${currentYear - 1}-12-01`);
    } else {
      const nextM = currentMonth - 1;
      setCurrentMonth(nextM);
      setSelectedDateKey(
        `${currentYear}-${String(nextM + 1).padStart(2, '0')}-01`
      );
    }
  };

  const goToNextMonth = () => {
    setSelectedWeekStart(null);
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
      setSelectedDateKey(`${currentYear + 1}-01-01`);
    } else {
      const nextM = currentMonth + 1;
      setCurrentMonth(nextM);
      setSelectedDateKey(
        `${currentYear}-${String(nextM + 1).padStart(2, '0')}-01`
      );
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateKey(todayKey);
    setSelectedWeekStart(null);
  };

  const handleSelectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setIsMobileInspectorOpen(true);
  };

  const handleQuickAddDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setAutoFocusTrigger((n) => n + 1);
    setIsMobileInspectorOpen(true);
  };

  const handleSelectWeek = (week: CalendarWeek) => {
    setSelectedWeekStart((prev) =>
      prev === week.startDateKey ? null : week.startDateKey
    );
    setSelectedDateKey(week.startDateKey);
  };

  const handleAddBill = async (input: BillInput) => {
    if (!user) return;
    await createBill(user.uid, input);
    const [y, m] = input.date.split('-').map(Number);
    if (y && m) {
      setCurrentYear(y);
      setCurrentMonth(m - 1);
      setSelectedDateKey(input.date);
    }
  };

  const handleUpdateBill = async (billId: string, input: BillInput) => {
    await updateBill(billId, input);
  };

  const handleToggleBillPaid = async (bill: BillRecord, isPaid: boolean) => {
    await toggleBillPaid(bill, isPaid);
  };

  const handleBatchToggleWeekPaid = async (
    week: CalendarWeek,
    isPaid: boolean
  ) => {
    await batchSetBillsPaid(week.bills, isPaid);
  };

  const handleDeleteBill = async (billId: string) => {
    await deleteBill(billId);
  };

  const monthTitle = formatMonthTitleVi(currentYear, currentMonth);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <TopBar
        activeView={activeView}
        onChangeView={setActiveView}
        isSignedIn={Boolean(user)}
        onPrimaryAction={() => {
          if (user) {
            setIsQuickAddOpen(true);
          } else {
            handleSignIn();
          }
        }}
      />

      {!authReady ? (
        <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8">
          <div className="h-12 bg-slate-200/70 dark:bg-slate-800 rounded-lg animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
          <div className="h-[520px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
        </main>
      ) : !user ? (
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-xs">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CalendarIcon className="w-4 h-4" />
                <span>Quản lý chi tiêu cá nhân theo lịch tuần Thứ 2 – Chủ nhật</span>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={
                  theme === 'dark'
                    ? 'Chuyển sang giao diện sáng'
                    : 'Chuyển sang giao diện tối'
                }
                className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              Ghi nhận chi tiêu mỗi ngày, tự động tổng kết từng tuần
            </h1>

            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Theo dõi hóa đơn hàng ngày trên lịch tháng từ Thứ 2 đến Chủ nhật, phân loại khoản chi rõ ràng và thanh toán nhanh theo từng tuần chỉ với một lần chạm.
            </p>

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Lịch Thứ 2 – Chủ nhật
                </div>
                <div className="mt-1 text-slate-500 dark:text-slate-400">
                  Cột tổng tuần hiển thị số tiền và nút thanh toán nhanh cho cả tuần.
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Phân loại & trạng thái
                </div>
                <div className="mt-1 text-slate-500 dark:text-slate-400">
                  Ăn uống, Mua sắm, Học phí, Du lịch, Thể thao với thống kê tỷ trọng.
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Đồng bộ tài khoản
                </div>
                <div className="mt-1 text-slate-500 dark:text-slate-400">
                  Dữ liệu được lưu trữ bảo mật theo tài khoản Google cá nhân của bạn.
                </div>
              </div>
            </div>

            {authError && (
              <p
                className="mt-4 text-xs font-medium text-red-700 dark:text-red-400"
                role="alert"
              >
                {authError}
              </p>
            )}

            <div className="mt-8">
              <button
                type="button"
                disabled={signingIn}
                onClick={handleSignIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <span>
                  {signingIn
                    ? 'Đang mở cửa sổ đăng nhập...'
                    : 'Đăng nhập bằng Google để bắt đầu'}
                </span>
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Workspace Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  aria-label="Tháng trước"
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-l-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h1 className="px-3 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 tabular-nums min-w-[132px] text-center">
                  {monthTitle}
                </h1>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  aria-label="Tháng sau"
                  className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-r-lg transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={goToToday}
                className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                Hôm nay
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Mobile View Switcher */}
              <div className="flex md:hidden items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveView('calendar')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    activeView === 'calendar'
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Lịch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('ledger')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    activeView === 'ledger'
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Sổ chi
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('weekly')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                    activeView === 'weekly'
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Tuần
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm khoản chi, phân loại..."
                  aria-label="Tìm khoản chi hoặc phân loại"
                  className="pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 w-44 sm:w-56 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 shadow-xs"
                />
              </div>

              {/* Dark / Light Mode Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
                aria-label={
                  theme === 'dark'
                    ? 'Chuyển sang giao diện sáng'
                    : 'Chuyển sang giao diện tối'
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Sáng</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Tối</span>
                  </>
                )}
              </button>

              {/* Account Status & Sign Out */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <span className="hidden sm:inline text-xs text-slate-600 dark:text-slate-400 max-w-[140px] truncate">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Đăng xuất"
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3-column Summary Strip (Average per week removed as requested) */}
          <section
            aria-label="Thống kê tháng"
            className="grid grid-cols-1 sm:grid-cols-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 shadow-xs"
          >
            <div className="p-4 sm:px-5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tổng chi {monthTitle}
              </div>
              <div className="mt-1 text-lg sm:text-xl font-mono font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                {formatVND(monthTotal)}
              </div>
              <div className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums truncate">
                <span className="text-emerald-700 dark:text-emerald-400">
                  Đã trả: {formatVND(monthPaidTotal)}
                </span>{' '}
                ·{' '}
                <span className="text-amber-700 dark:text-amber-400">
                  Chưa trả: {formatVND(monthUnpaidTotal)}
                </span>
              </div>
            </div>

            <div className="p-4 sm:px-5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tuần chi cao nhất
              </div>
              <div className="mt-1 text-lg sm:text-xl font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatVND(peakWeekTotal)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Tính theo chu kỳ Thứ 2 – Chủ nhật
              </div>
            </div>

            <div className="p-4 sm:px-5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Số khoản đã ghi trong tháng
              </div>
              <div className="mt-1 text-lg sm:text-xl font-mono font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                {monthBills.length} khoản
              </div>
              <div className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                {monthPaidCount} đã thanh toán · {monthBills.length - monthPaidCount} chưa thanh toán
              </div>
            </div>
          </section>

          {/* Main View Content */}
          {loadingBills ? (
            <div className="h-[520px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
          ) : activeView === 'calendar' ? (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
              <MonthlyCalendarView
                weeks={weeks}
                selectedDateKey={selectedDateKey}
                onSelectDate={handleSelectDate}
                onQuickAddDate={handleQuickAddDate}
                selectedWeekStart={selectedWeekStart}
                onSelectWeek={handleSelectWeek}
                onBatchToggleWeekPaid={handleBatchToggleWeekPaid}
                searchQuery={searchQuery}
              />

              {/* Desktop Persistent Day Inspector */}
              <div className="hidden xl:block sticky top-6">
                <DayInspectorPanel
                  selectedDateKey={selectedDateKey}
                  bills={selectedDayBills}
                  selectedWeek={selectedWeek}
                  onAddBill={handleAddBill}
                  onUpdateBill={handleUpdateBill}
                  onTogglePaid={handleToggleBillPaid}
                  onDeleteBill={handleDeleteBill}
                  autoFocusTrigger={autoFocusTrigger}
                />
              </div>

              {/* Mobile / Tablet Slide-over Drawer for Selected Day */}
              {isMobileInspectorOpen && (
                <div
                  className="fixed inset-0 z-40 xl:hidden bg-slate-950/50 flex justify-end"
                  onClick={() => setIsMobileInspectorOpen(false)}
                >
                  <div
                    className="w-full max-w-md h-full bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DayInspectorPanel
                      selectedDateKey={selectedDateKey}
                      bills={selectedDayBills}
                      selectedWeek={selectedWeek}
                      onAddBill={handleAddBill}
                      onUpdateBill={handleUpdateBill}
                      onTogglePaid={handleToggleBillPaid}
                      onDeleteBill={handleDeleteBill}
                      autoFocusTrigger={autoFocusTrigger}
                      onCloseMobile={() => setIsMobileInspectorOpen(false)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : activeView === 'ledger' ? (
            <LedgerTableView
              monthTitle={monthTitle}
              monthBills={monthBills}
              weeks={weeks}
              onUpdateBill={handleUpdateBill}
              onTogglePaid={handleToggleBillPaid}
              onDeleteBill={handleDeleteBill}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              searchQuery={searchQuery}
            />
          ) : (
            <WeeklySummaryView
              monthTitle={monthTitle}
              monthBills={monthBills}
              weeks={weeks}
              onSelectDateInCalendar={(dateKey) => {
                setSelectedDateKey(dateKey);
                setActiveView('calendar');
                setIsMobileInspectorOpen(true);
              }}
              onBatchToggleWeekPaid={handleBatchToggleWeekPaid}
            />
          )}
        </main>
      )}

      <QuickAddModal
        isOpen={isQuickAddOpen}
        defaultDateKey={selectedDateKey}
        onClose={() => setIsQuickAddOpen(false)}
        onAddBill={handleAddBill}
      />
    </div>
  );
}
