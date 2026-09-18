import { useState, useEffect } from 'react';
import FloatingSidebar from './FloatingSidebar';
import TopBar from './TopBar';
import SpotlightModal from '../ui/SpotlightModal';
import AboutModal from '../ui/AboutModal';
import WelcomeModal from '../ui/WelcomeModal';
import HoldCmdQModal from '../ui/HoldCmdQModal';
import MoveToApplicationsModal from '../ui/MoveToApplicationsModal';
import { useAppStore } from '../../store/appStore';
import { FolderDown } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { setCurrentPage } = useAppStore();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/webview').then(({ getCurrentWebview }) => {
      getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type === 'enter' || event.payload.type === 'over') {
          setIsDraggingOver(true);
        } else if (event.payload.type === 'leave') {
          setIsDraggingOver(false);
        } else if (event.payload.type === 'drop') {
          setIsDraggingOver(false);
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            const first = paths[0];
            if (first.endsWith('.app')) {
              setCurrentPage('apps');
            } else {
              setCurrentPage('tidy-up');
            }
          }
        }
      }).then((fn) => {
        unlisten = fn;
      });
    }).catch(() => {
      // Not in Tauri webview or drag drop unavailable
    });

    return () => {
      unlisten?.();
    };
  }, [setCurrentPage]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary dark:bg-bg-primary-dark transition-colors">
      <FloatingSidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-4 pb-24 sm:px-8 sm:pb-28 pt-4">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Global Floating Action Bar Overlay Anchor */}
        <div
          id="floating-action-bar-root"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center pb-6 px-4"
        />
      </div>

      {/* Frosted Dropzone Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 backdrop-blur-md border-3 border-dashed border-blue-500 rounded-3xl m-4 animate-scale-in">
          <div className="p-6 rounded-3xl glass-panel text-center max-w-sm shadow-2xl flex flex-col items-center gap-3">
            <div className="p-4 rounded-2xl bg-blue-500 text-white shadow-lg">
              <FolderDown size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Drop to Inspect in Beberes
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Drop any directory to tidy loose files or an application to inspect residual leftovers
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <SpotlightModal />
      <AboutModal />
      <WelcomeModal />
      <HoldCmdQModal />
      <MoveToApplicationsModal />
    </div>
  );
}


