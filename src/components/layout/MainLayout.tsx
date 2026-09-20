import { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import FloatingSidebar from './FloatingSidebar';
import TopBar from './TopBar';
import SpotlightModal from '../ui/SpotlightModal';
import AboutModal from '../ui/AboutModal';
import WelcomeModal from '../ui/WelcomeModal';
import HoldCmdQModal from '../ui/HoldCmdQModal';
import MoveToApplicationsModal from '../ui/MoveToApplicationsModal';
import StagedItemsModal from '../ui/StagedItemsModal';
import ReportModal from '../ReportModal';
import ScrollToTopButton from '../ui/ScrollToTopButton';
import FloatingActionBar from '../ui/FloatingActionBar';
import { useAppStore } from '../../store/appStore';
import { FolderDown } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const {
    setCurrentPage,
    stagedItems,
    openStagedModal,
    clearStagingQueue,
    isReportModalOpen,
    closeReportModal,
  } = useAppStore(
    useShallow((s) => ({
      setCurrentPage: s.setCurrentPage,
      stagedItems: s.stagedItems,
      openStagedModal: s.openStagedModal,
      clearStagingQueue: s.clearStagingQueue,
      isReportModalOpen: s.isReportModalOpen,
      closeReportModal: s.closeReportModal,
    }))
  );
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const totalStagedCount = Object.keys(stagedItems).length;
  const totalStagedSize = Object.values(stagedItems).reduce(
    (sum, it) => sum + (it.size || 0),
    0
  );

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
      <div className="flex-1 flex flex-col h-[calc(100vh-1.5rem)] my-3 mr-3 ml-2.5 min-w-0 overflow-hidden relative">
        {/* Floating Capsule TopBar */}
        <div className="shrink-0 mb-3 px-1 sm:px-2">
          <div className="max-w-6xl mx-auto w-full">
            <TopBar />
          </div>
        </div>

        {/* Main Content Area */}
        <main ref={mainRef} className="flex-1 overflow-y-scroll [scrollbar-gutter:stable] px-1 sm:px-2 pb-24 sm:pb-28">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Global Floating Action Bar: Centered horizontally at bottom */}
        {totalStagedCount > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4">
            <FloatingActionBar
              selectedCount={totalStagedCount}
              selectedSize={totalStagedSize}
              onClean={openStagedModal}
              onReview={openStagedModal}
              onDeselect={clearStagingQueue}
              disablePortal
            />
          </div>
        )}

        {/* Scroll To Top Button: Bottom Right Corner */}
        <div className="pointer-events-none absolute bottom-4 right-4 sm:right-6 z-40">
          <ScrollToTopButton scrollContainerRef={mainRef} />
        </div>

        {/* Global Floating Action Bar Overlay Anchor for backwards compatibility */}
        <div
          id="floating-action-bar-root"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center pb-4 px-4"
        />
      </div>

      {/* Frosted Dropzone Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-accent-subtle/40 backdrop-blur-md border-3 border-dashed border-accent rounded-3xl m-4 animate-scale-in">
          <div className="p-6 rounded-3xl glass-panel text-center max-w-sm shadow-2xl flex flex-col items-center gap-3">
            <div className="p-4 rounded-2xl bg-accent text-white shadow-lg">
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
      <StagedItemsModal />
      <ReportModal isOpen={isReportModalOpen} onClose={closeReportModal} />
    </div>
  );
}



