import { EmptyState } from '@components/EmptyState';
import { Button } from '@components/Button';
import { Link } from 'react-router-dom';

/**
 * Tree page - Knowledge organization
 */
export const TreePage = () => {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-8">
          Knowledge Tree
        </h1>

        <EmptyState
          icon={<span className="text-6xl">🌳</span>}
          title="Knowledge Tree"
          description="Visualize and organize your learning directions and skill points. This feature is coming soon!"
          action={
            <Link to="/vault">
              <Button>Browse Cards</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
};
