import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { useThemeStore } from '../store';

/**
 * Settings page
 */
export const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Theme Settings */}
          <Card variant="bordered" padding="lg">
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
              Appearance
            </h2>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Theme
              </label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                >
                  System
                </Button>
              </div>
            </div>
          </Card>

          {/* Data Export */}
          <Card variant="bordered" padding="lg">
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
              Data Management
            </h2>
            <div className="space-y-3">
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Export all your learning data including directions, cards, and progress.
              </p>
              <Button variant="outline">Export Data (JSON)</Button>
            </div>
          </Card>

          {/* About */}
          <Card variant="bordered" padding="lg">
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
              About
            </h2>
            <div className="space-y-2 text-sm text-secondary-600 dark:text-secondary-400">
              <p>
                <strong>KnowFlow</strong> - Intelligent Spaced Repetition Learning
              </p>
              <p>Version: 0.1.0</p>
              <p>
                Built with React, TypeScript, Vite, and Tailwind CSS
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
