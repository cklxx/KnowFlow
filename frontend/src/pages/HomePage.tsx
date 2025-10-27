import { Link } from 'react-router-dom';
import { Button } from '@components/Button';
import { Card } from '@components/Card';

/**
 * Home/Landing page
 */
export const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-secondary-900 dark:to-secondary-800">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-secondary-900 dark:text-white mb-4">
            Welcome to KnowFlow
          </h1>
          <p className="text-xl text-secondary-600 dark:text-secondary-300 mb-8">
            Your intelligent spaced repetition learning system
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/today">
              <Button size="lg">Start Today&apos;s Review</Button>
            </Link>
            <Link to="/vault">
              <Button variant="outline" size="lg">
                Browse Cards
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link to="/today">
            <Card hoverable padding="lg" className="h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">📅</div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  Today
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Review your daily cards with spaced repetition
                </p>
              </div>
            </Card>
          </Link>

          <Link to="/intelligence">
            <Card hoverable padding="lg" className="h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">🤖</div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  Intelligence
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  AI-powered card creation and learning assistance
                </p>
              </div>
            </Card>
          </Link>

          <Link to="/tree">
            <Card hoverable padding="lg" className="h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">🌳</div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  Tree
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Organize your knowledge in learning directions
                </p>
              </div>
            </Card>
          </Link>

          <Link to="/vault">
            <Card hoverable padding="lg" className="h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">🗃️</div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  Vault
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Access and manage all your memory cards
                </p>
              </div>
            </Card>
          </Link>

          <Link to="/search">
            <Card hoverable padding="lg" className="h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  Search
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Find cards across all your learning directions
                </p>
              </div>
            </Card>
          </Link>

          <Link to="/settings">
            <Card hoverable padding="lg" className="h-full">
              <div className="text-center">
                <div className="text-4xl mb-3">⚙️</div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                  Settings
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Configure preferences and export data
                </p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};
