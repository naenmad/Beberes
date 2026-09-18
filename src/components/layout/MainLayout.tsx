import FloatingSidebar from './FloatingSidebar';
import TopBar from './TopBar';
import SpotlightModal from '../ui/SpotlightModal';
import AboutModal from '../ui/AboutModal';
import WelcomeModal from '../ui/WelcomeModal';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
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

      {/* Global Modals */}
      <SpotlightModal />
      <AboutModal />
      <WelcomeModal />
    </div>
  );
}


