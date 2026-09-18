import { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './views/Dashboard';
import SystemClean from './views/SystemClean';
import DevWorkspace from './views/DevWorkspace';
import TidyUp from './views/TidyUp';
import AppUninstaller from './views/AppUninstaller';
import QuickReview from './views/QuickReview';
import LargeAndDuplicates from './views/LargeAndDuplicates';
import TrashManager from './views/TrashManager';
import DiskVisualizer from './views/DiskVisualizer';
import StartupManager from './views/StartupManager';
import FileShredder from './views/FileShredder';
import GitSweeper from './views/GitSweeper';
import Settings from './views/Settings';

// Beberes macOS Modern Clean Architecture
export default function App() {
  const {
    currentPage,
    setCurrentPage,
    triggerGlobalRefresh,
    isDarkMode,
    uiScale,
    autoCheckUpdate,
    checkForUpdates,
  } = useAppStore();
  const [visitedPages, setVisitedPages] = useState<Set<string>>(new Set([currentPage]));

  // Track visited pages to lazily mount them and keep them alive for instant tab switching
  useEffect(() => {
    setVisitedPages((prev) => {
      if (prev.has(currentPage)) return prev;
      const next = new Set(prev);
      next.add(currentPage);
      return next;
    });
  }, [currentPage]);

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

  return (
    <MainLayout>
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
      <div className={currentPage === 'settings' ? 'block animate-fade-in' : 'hidden'}>
        {visitedPages.has('settings') && <Settings />}
      </div>
    </MainLayout>
  );
}
