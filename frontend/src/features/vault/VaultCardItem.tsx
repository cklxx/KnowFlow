import { Card } from '@components/Card';
import type { VaultCard } from '../../types/api';
import { useNavigate } from 'react-router-dom';

interface VaultCardItemProps {
  card: VaultCard;
}

/**
 * Vault card list item component
 */
export const VaultCardItem = ({ card }: VaultCardItemProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Card
      variant="bordered"
      padding="md"
      hoverable
      onClick={() => navigate(`/cards/${card.id}`)}
      className="cursor-pointer"
    >
      <div className="space-y-2">
        <p className="font-medium text-secondary-900 dark:text-secondary-100 line-clamp-2">
          {card.question}
        </p>
        <p className="text-sm text-secondary-600 dark:text-secondary-400 line-clamp-1">
          {card.answer}
        </p>
        <div className="flex items-center justify-between text-xs text-secondary-500 dark:text-secondary-500">
          <span className="text-xs text-secondary-500">{card.direction_name}</span>
          <div className="flex gap-2 items-center">
            <span>Reviewed {card.review_count} times</span>
            {card.next_review_at && <span>Next: {formatDate(card.next_review_at)}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
};
