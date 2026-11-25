import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    isPermissionError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const raw = error.message || 'Đã xảy ra lỗi không mong muốn.';
    let displayMessage = raw;
    let isPermissionError = false;

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        displayMessage = parsed.error;
        isPermissionError =
          parsed.error.toLowerCase().includes('permission') ||
          parsed.error.toLowerCase().includes('insufficient');
      }
    } catch {
      // Plain error string
    }

    return {
      hasError: true,
      errorMessage: displayMessage,
      isPermissionError,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      isPermissionError: false,
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Không thể tải dữ liệu chi tiêu
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              {this.state.isPermissionError
                ? 'Kết nối cơ sở dữ liệu Firestore bị từ chối quyền truy cập. Vui lòng kiểm tra lại tài khoản đăng nhập hoặc cấu hình Firestore Security Rules.'
                : 'Ứng dụng gặp sự cố khi đồng bộ dữ liệu.'}
            </p>
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-700 dark:text-slate-300 break-words mb-6">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 dark:bg-emerald-600 rounded-lg hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
