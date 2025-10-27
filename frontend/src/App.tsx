import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '@pages/HomePage';
import { TodayPage } from '@pages/TodayPage';
import { VaultPage } from '@pages/VaultPage';
import { SearchPage } from '@pages/SearchPage';
import { IntelligencePage } from '@pages/IntelligencePage';
import { TreePage } from '@pages/TreePage';
import { SettingsPage } from '@pages/SettingsPage';
import { useThemeStore } from './store';
import { useEffect } from 'react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

/**
 * Navigation bar component
 */
const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/today', label: 'Today', icon: '📅' },
    { path: '/intelligence', label: 'AI', icon: '🤖' },
    { path: '/tree', label: 'Tree', icon: '🌳' },
    { path: '/vault', label: 'Vault', icon: '🗃️' },
    { path: '/search', label: 'Search', icon: '🔍' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              KnowFlow
            </span>
          </Link>

          <div className="hidden md:flex gap-1">
            {navItems.slice(1).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-700'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-secondary-200 dark:border-secondary-700">
        <div className="grid grid-cols-6 gap-1 p-2">
          {navItems.slice(1).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-secondary-600 dark:text-secondary-400'
              }`}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

/**
 * Layout wrapper with navigation
 */
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <Navigation />
      <main>{children}</main>
    </div>
  );
};

/**
 * Theme initializer
 */
const ThemeInitializer = () => {
  const updateActualTheme = useThemeStore((state) => state.updateActualTheme);

  useEffect(() => {
    updateActualTheme();
  }, [updateActualTheme]);

  return null;
};

/**
 * Main App component
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInitializer />
        <Routes>
          {/* Home page without navigation */}
          <Route path="/" element={<HomePage />} />

          {/* Pages with navigation */}
          <Route
            path="/today"
            element={
              <Layout>
                <TodayPage />
              </Layout>
            }
          />
          <Route
            path="/vault"
            element={
              <Layout>
                <VaultPage />
              </Layout>
            }
          />
          <Route
            path="/search"
            element={
              <Layout>
                <SearchPage />
              </Layout>
            }
          />
          <Route
            path="/intelligence"
            element={
              <Layout>
                <IntelligencePage />
              </Layout>
            }
          />
          <Route
            path="/tree"
            element={
              <Layout>
                <TreePage />
              </Layout>
            }
          />
          <Route
            path="/settings"
            element={
              <Layout>
                <SettingsPage />
              </Layout>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <Layout>
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-secondary-900 dark:text-white mb-4">
                      404
                    </h1>
                    <p className="text-xl text-secondary-600 dark:text-secondary-400 mb-8">
                      Page not found
                    </p>
                    <Link
                      to="/"
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Go back home
                    </Link>
                  </div>
                </div>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
