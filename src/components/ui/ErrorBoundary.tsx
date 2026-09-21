import { Component, ReactNode, ErrorInfo } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
  Home,
  ExternalLink,
  Bug,
  Sparkles,
} from 'lucide-react';
import { openExternalUrl } from '../../lib/commands';
import { APP_VERSION, APP_CODENAME, useAppStore } from '../../store/appStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

function isCurrentLocaleId(): boolean {
  try {
    const lang = useAppStore.getState().language;
    return lang === 'id';
  } catch {
    return false;
  }
}

/**
 * Generate a friendly readable error code from error message and name.
 */
function getErrorCode(error: Error | null): string {
  if (!error) return 'ERR_UNKNOWN';

  const msg = error.message || '';
  if (msg.includes('SIMULATED_TEST_ERROR')) {
    return 'ERR_TEST_SIMULATION_SUCCESS';
  }
  if (msg.includes('Permission denied') || msg.includes('os error 1')) {
    return 'ERR_MACOS_PERMISSION_DENIED';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'ERR_NETWORK_CONNECTION_LOST';
  }
  if (msg.includes('Cannot read properties of') || msg.includes('undefined')) {
    return 'ERR_RUNTIME_NULL_REFERENCE';
  }

  // Create a short 6-char hex hash from message
  let hash = 0;
  for (let i = 0; i < msg.length; i++) {
    hash = (hash << 5) - hash + msg.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(0, 6);
  return `ERR_BEBERES_${hex}`;
}

/**
 * Generate a human-friendly description of what happened.
 */
function getFriendlyExplanation(error: Error | null, isId: boolean): string {
  const msg = error?.message || '';

  if (msg.includes('SIMULATED_TEST_ERROR')) {
    return isId
      ? 'Ini adalah simulasi pengujian error. Fitur penanganan kendala (Error Boundary) berfungsi sempurna dan siap melindungi aplikasi.'
      : 'This is an intentional error simulation. The Error Boundary is active, healthy, and protecting your application.';
  }
  if (msg.includes('Permission denied') || msg.includes('os error 1')) {
    return isId
      ? 'Aplikasi tidak memiliki izin yang cukup untuk mengakses folder ini. Anda dapat memberikan Full Disk Access di Pengaturan macOS.'
      : 'The application lacks sufficient permissions to access this folder. You can grant Full Disk Access in macOS System Settings.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return isId
      ? 'Koneksi jaringan terputus saat mencoba menghubungi server atau memeriksa pembaruan GitHub.'
      : 'Network connection was lost while attempting to contact the server or check for GitHub updates.';
  }

  return isId
    ? 'Aplikasi mengalami kendala teknis saat memproses antarmuka. Semua file dan data di Mac Anda tetap aman dan tidak terpengaruh.'
    : 'An unexpected technical issue occurred while processing the interface. Your Mac files and storage remain completely safe and unaffected.';
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Beberes ErrorBoundary] Caught exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleCopyInfo = async () => {
    const { error, errorInfo } = this.state;
    const errorCode = getErrorCode(error);
    const text = [
      `Beberes Error Report`,
      `Version: v${APP_VERSION} (${APP_CODENAME})`,
      `Error Code: ${errorCode}`,
      `Error Message: ${error?.message || 'Unknown'}`,
      `Stack Trace:`,
      error?.stack || 'No stack trace',
      `Component Stack:`,
      errorInfo?.componentStack || 'No component stack',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      // Fallback
    }
  };

  handleOpenGitHubIssue = async () => {
    const { error, errorInfo } = this.state;
    const errorCode = getErrorCode(error);
    const errorTitle = encodeURIComponent(`[Bug Report]: ${errorCode} - ${error?.message?.slice(0, 60) || 'Unexpected Error'}`);
    
    const bodyContent = [
      `### Problem Description`,
      `Please describe what you were doing right before this error occurred.`,
      ``,
      `### Environment Information`,
      `- **Beberes Version**: \`v${APP_VERSION} (${APP_CODENAME})\``,
      `- **Error Code**: \`${errorCode}\``,
      `- **Operating System**: macOS`,
      ``,
      `### Error Message`,
      `\`\`\``,
      error?.message || 'No error message provided',
      `\`\`\``,
      ``,
      `### Technical Stack Trace`,
      `<details>`,
      `<summary>Click to expand Stack Trace</summary>`,
      ``,
      `\`\`\`text`,
      error?.stack?.slice(0, 800) || 'N/A',
      errorInfo?.componentStack?.slice(0, 800) || '',
      `\`\`\``,
      `</details>`,
    ].join('\n');

    const issueUrl = `https://github.com/naenmad/Beberes/issues/new?title=${errorTitle}&body=${encodeURIComponent(bodyContent)}`;
    await openExternalUrl(issueUrl);
  };

  handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleNavigateHome = () => {
    this.handleReload();
    try {
      const event = new CustomEvent('beberes-navigate-dashboard');
      window.dispatchEvent(event);
    } catch {}
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo, showDetails, copied } = this.state;
    const errorCode = getErrorCode(error);
    const isId = isCurrentLocaleId();
    const friendlyDesc = getFriendlyExplanation(error, isId);
    const isSimulated = errorCode === 'ERR_TEST_SIMULATION_SUCCESS';

    return (
      <div className="min-h-[380px] w-full p-6 sm:p-10 flex items-center justify-center animate-fade-in">
        <div className="w-full max-w-xl rounded-3xl glass-panel border border-black/8 dark:border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 text-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status Icon */}
          <div className="flex flex-col items-center space-y-3">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${
                isSimulated
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
              }`}
            >
              {isSimulated ? <Sparkles size={28} /> : <AlertTriangle size={28} />}
            </div>

            {/* Error Code Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/4 dark:bg-white/6 border border-black/6 dark:border-white/8 text-[11px] font-mono font-semibold text-slate-600 dark:text-neutral-300">
              <Bug size={12} className="text-slate-400" />
              <span>{errorCode}</span>
              {isSimulated && (
                <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] uppercase font-bold">
                  Test Mode
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isSimulated
                ? (isId ? 'Simulasi Error Boundary Berhasil' : 'Error Boundary Simulation Successful')
                : (isId ? 'Terjadi Kendala pada Halaman Ini' : 'An Unexpected Error Occurred')}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-300 max-w-md leading-relaxed">
              {friendlyDesc}
            </p>
          </div>

          {/* Collapsible Technical Details (Clean & Non-Intrusive) */}
          <div className="rounded-2xl bg-black/2 dark:bg-white/3 border border-black/4 dark:border-white/6 overflow-hidden text-left">
            <button
              type="button"
              onClick={() => this.setState({ showDetails: !showDetails })}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-neutral-300 hover:bg-black/4 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Bug size={13} className="text-slate-400" />
                {isId ? 'Detail Teknis (Untuk Pengembang)' : 'Technical Details (For Developers)'}
              </span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDetails && (
              <div className="p-4 pt-2 border-t border-black/4 dark:border-white/6 space-y-3">
                <div className="p-3 rounded-xl bg-black/90 dark:bg-black/80 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-44 scrollbar-thin">
                  <p className="font-bold text-rose-400 mb-1">
                    {error?.name}: {error?.message}
                  </p>
                  <pre className="text-neutral-400 whitespace-pre-wrap leading-tight text-[10px]">
                    {error?.stack || 'No stack trace available'}
                  </pre>
                  {errorInfo?.componentStack && (
                    <pre className="text-neutral-500 whitespace-pre-wrap leading-tight text-[9px] mt-2 border-t border-neutral-800 pt-1">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={this.handleCopyInfo}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-slate-700 dark:text-neutral-200 transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copied
                      ? (isId ? 'Tersalin ke Clipboard!' : 'Copied to Clipboard!')
                      : (isId ? 'Salin Laporan Error' : 'Copy Error Report')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-accent text-white font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-md shadow-accent/20 transition-all cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>{isId ? 'Coba Muat Ulang' : 'Try Reloading'}</span>
            </button>

            <button
              type="button"
              onClick={this.handleNavigateHome}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-slate-700 dark:text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Home size={13} />
              <span>{isId ? 'Ke Dashboard' : 'Go to Dashboard'}</span>
            </button>

            <button
              type="button"
              onClick={this.handleOpenGitHubIssue}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/15 hover:border-accent text-slate-700 dark:text-neutral-200 hover:text-accent font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>{isId ? 'Laporkan ke GitHub' : 'Report to GitHub'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
