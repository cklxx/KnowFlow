import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Empty state component for when there's no data
 */
export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-secondary-400 dark:text-secondary-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-secondary-600 dark:text-secondary-400 mb-6 max-w-md">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
