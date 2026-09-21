import { useEffect, useState, lazy, Suspense } from 'react';
import { useAppStore } from './store/appStore';
import { applyThemeColors } from './lib/themeColors';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './views/Dashboard';
import { CardSkeleton } from './components/ui/SkeletonLoader';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import type { ScanProgressPayload } from './lib/commands';

// Code-split secondary views to keep initial bundle ultra-lean (<150KB)
const SystemClean = lazy(() => import('./views/SystemClean'));
const DevWorkspace = lazy(() => import('./views/DevWorkspace'));
const TidyUp = lazy(() => import('./views/TidyUp'));
const AppUninstaller = lazy(() => import('./views/AppUninstaller'));
const QuickReview = lazy(() => import('./views/QuickReview'));
const LargeAndDuplicates = lazy(() => import('./views/LargeAndDuplicates'));
const TrashManager = lazy(() => import('./views/TrashManager'));
const DiskVisualizer = lazy(() => import('./views/DiskVisualizer'));
const StartupManager = lazy(() => import('./views/StartupManager'));
const FileShredder = lazy(() => import('./views/FileShredder'));
const GitSweeper = lazy(() => import('./views/GitSweeper'));
const Settings = lazy(() => import('./views/Settings'));
const HardwareIntelligence = lazy(() => import('./views/HardwareIntelligence'));
const SimilarPhotos = lazy(() => import('./views/SimilarPhotos'));
const PluginManager = lazy(() => import('./views/PluginManager'));
const PopoverView = lazy(() => import('./views/PopoverView'));

// Beberes macOS Modern Clean Architecture
export default function App() {
  const [isPopoverWindow] = useState(() => {
    try {
      const win = getCurrentWebviewWindow();
      return win.label === 'popover';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isPopoverWindow) {
      document.documentElement.classList.add('popover-window', 'dark');
      document.body.classList.add('popover-window', 'dark');
    }
  }, [isPopoverWindow]);

  const {
    currentPage,
    setCurrentPage,
    triggerGlobalRefresh,
    isDarkMode,
    primaryAccent,
    secondaryAccent,
    uiScale,
    autoCheckUpdate,
    checkForUpdates,
  } = useAppStore();
  const [visitedPages, setVisitedPages] = useState<Set<string>>(new Set([currentPage]));

  // Listen to native scanner progress streaming
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<ScanProgressPayload>('scan-progress', (event) => {
      const payload = event.payload;
      useAppStore.setState({
        scanningStage: payload.stage,
        scanningPath: payload.current_path,
      });
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Track visited pages to lazily mount them and keep them alive for instant tab switching
  useEffect(() => {
    if (isPopoverWindow) return;
    setVisitedPages((prev) => {
      if (prev.has(currentPage)) return prev;
      const next = new Set(prev);
      next.add(currentPage);
      return next;
    });
  }, [currentPage, isPopoverWindow]);

  // Preload secondary views in background during browser idle time for 0ms tab transitions
  useEffect(() => {
    if (isPopoverWindow) return;
    const idleCallback = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 400));
    const handle = idleCallback(() => {
      import('./views/SystemClean');
      import('./views/DevWorkspace');
      import('./views/TidyUp');
      import('./views/AppUninstaller');
      import('./views/QuickReview');
      import('./views/LargeAndDuplicates');
      import('./views/TrashManager');
      import('./views/DiskVisualizer');
      import('./views/StartupManager');
      import('./views/FileShredder');
      import('./views/GitSweeper');
      import('./views/Settings');
      import('./views/HardwareIntelligence');
      import('./views/SimilarPhotos');
      import('./views/PluginManager');
    });
    return () => {
      if ((window as any).cancelIdleCallback && typeof handle === 'number') {
        (window as any).cancelIdleCallback(handle);
      }
    };
  }, [isPopoverWindow]);

  // Listen for macOS menu bar tray navigation & actions
  useEffect(() => {
    let unlistenNavigate: (() => void) | undefined;
    let unlistenSmartClean: (() => void) | undefined;
    let unlistenMemoryPurged: (() => void) | undefined;
    let unlistenTrashEmptied: (() => void) | undefined;

    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<string>('navigate-to', (event) => {
        if (event.payload) {
          setCurrentPage(event.payload as any);
        }
      }).then((fn) => {
        unlistenNavigate = fn;
      });

      listen('quick-smart-clean', () => {
        setCurrentPage('system-clean');
        triggerGlobalRefresh();
      }).then((fn) => {
        unlistenSmartClean = fn;
      });

      listen('memory-purged', () => {
        triggerGlobalRefresh();
      }).then((fn) => {
        unlistenMemoryPurged = fn;
      });

      listen('trash-emptied', () => {
        triggerGlobalRefresh();
      }).then((fn) => {
        unlistenTrashEmptied = fn;
      });
    });

    return () => {
      unlistenNavigate?.();
      unlistenSmartClean?.();
      unlistenMemoryPurged?.();
      unlistenTrashEmptied?.();
    };
  }, [setCurrentPage, triggerGlobalRefresh]);

  // Global Keyboard Shortcuts (Cmd+1..9, Cmd+,, Cmd+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      switch (e.key) {
        case '1':
          e.preventDefault();
          setCurrentPage('dashboard');
          break;
        case '2':
          e.preventDefault();
          setCurrentPage('system-clean');
          break;
        case '3':
          e.preventDefault();
          setCurrentPage('dev-workspace');
          break;
        case '4':
          e.preventDefault();
          setCurrentPage('tidy-up');
          break;
        case '5':
          e.preventDefault();
          setCurrentPage('disk-visualizer');
          break;
        case '6':
          e.preventDefault();
          setCurrentPage('apps');
          break;
        case '7':
          e.preventDefault();
          setCurrentPage('quick-review');
          break;
        case '8':
          e.preventDefault();
          setCurrentPage('large-duplicates');
          break;
        case '9':
          e.preventDefault();
          setCurrentPage('trash-manager');
          break;
        case ',':
          e.preventDefault();
          setCurrentPage('settings');
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          triggerGlobalRefresh();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentPage, triggerGlobalRefresh]);

  // Check for updates on startup
  useEffect(() => {
    if (autoCheckUpdate) {
      checkForUpdates(false);
    }
  }, [autoCheckUpdate, checkForUpdates]);

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Apply UI / font scaling class to html element
  useEffect(() => {
    document.documentElement.classList.remove('scale-compact', 'scale-normal', 'scale-large');
    document.documentElement.classList.add(`scale-${uiScale}`);
  }, [uiScale]);

  // Apply primary and secondary accent colors to CSS variables
  useEffect(() => {
    applyThemeColors(primaryAccent, secondaryAccent);
  }, [primaryAccent, secondaryAccent]);

  if (isPopoverWindow) {
    return (
      <Suspense fallback={null}>
        <PopoverView />
      </Suspense>
    );
  }

  const suspenseFallback = (
    <div className="py-8 space-y-4 max-w-5xl mx-auto">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );

  return (
    <MainLayout>
      <Suspense fallback={suspenseFallback}>
        <div className={currentPage === 'dashboard' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('dashboard') && <Dashboard />}
        </div>
        <div className={currentPage === 'disk-visualizer' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('disk-visualizer') && <DiskVisualizer />}
        </div>
        <div className={currentPage === 'quick-review' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('quick-review') && <QuickReview />}
        </div>
        <div className={currentPage === 'large-duplicates' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('large-duplicates') && <LargeAndDuplicates />}
        </div>
        <div className={currentPage === 'trash-manager' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('trash-manager') && <TrashManager />}
        </div>
        <div className={currentPage === 'tidy-up' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('tidy-up') && <TidyUp />}
        </div>
        <div className={currentPage === 'apps' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('apps') && <AppUninstaller />}
        </div>
        <div className={currentPage === 'system-clean' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('system-clean') && <SystemClean />}
        </div>
        <div className={currentPage === 'dev-workspace' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('dev-workspace') && <DevWorkspace />}
        </div>
        <div className={currentPage === 'startup-manager' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('startup-manager') && <StartupManager />}
        </div>
        <div className={currentPage === 'file-shredder' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('file-shredder') && <FileShredder />}
        </div>
        <div className={currentPage === 'git-sweeper' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('git-sweeper') && <GitSweeper />}
        </div>
        <div className={currentPage === 'hardware' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('hardware') && <HardwareIntelligence />}
        </div>
        <div className={currentPage === 'similar-photos' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('similar-photos') && <SimilarPhotos />}
        </div>
        <div className={currentPage === 'plugins' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('plugins') && <PluginManager />}
        </div>
        <div className={currentPage === 'settings' ? 'block animate-fade-in' : 'hidden'}>
          {visitedPages.has('settings') && <Settings />}
        </div>
      </Suspense>
    </MainLayout>
  );
}
