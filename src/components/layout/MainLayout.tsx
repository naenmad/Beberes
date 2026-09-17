import FloatingSidebar from './FloatingSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f6f8] dark:bg-[#121212] transition-colors">
      <FloatingSidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Subtle top draggable region for native macOS window movement */}
        <div
          data-tauri-drag-region
          className="h-3 shrink-0 select-none w-full cursor-default"
        />
        <main className="flex-1 overflow-y-auto px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
