import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './views/Dashboard';
import SystemClean from './views/SystemClean';
import DevWorkspace from './views/DevWorkspace';
import TidyUp from './views/TidyUp';
import AppUninstaller from './views/AppUninstaller';
import QuickReview from './views/QuickReview';
import Settings from './views/Settings';

// Beberes macOS Modern Clean Architecture
export default function App() {
  const { currentPage, isDarkMode, uiScale } = useAppStore();

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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'quick-review':
        return <QuickReview />;
      case 'tidy-up':
        return <TidyUp />;
      case 'apps':
        return <AppUninstaller />;
      case 'system-clean':
        return <SystemClean />;
      case 'dev-workspace':
        return <DevWorkspace />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout>
      {renderPage()}
    </MainLayout>
  );
}
