import { Card } from '@components/Card';
import type { MemoryCard } from '../../types/api';
import { useNavigate } from 'react-router-dom';

interface CardItemProps {
  card: MemoryCard;
}

/**
 * Card list item component
 */
export const CardItem = ({ card }: CardItemProps) => {
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
          <span>Reviewed {card.review_count} times</span>
          {card.next_review_at && <span>Next: {formatDate(card.next_review_at)}</span>}
        </div>
      </div>
    </Card>
  );
};
