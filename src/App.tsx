import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './views/Dashboard';
import SystemClean from './views/SystemClean';
import DevWorkspace from './views/DevWorkspace';
import Settings from './views/Settings';

export default function App() {
  const { currentPage, isDarkMode } = useAppStore();

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
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
