import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vaultApi, directionsApi } from '@api';
import { VaultCardItem } from '@features/vault/VaultCardItem';
import { Loading } from '@components/Loading';
import { EmptyState } from '@components/EmptyState';
import { Button } from '@components/Button';
import { Link } from 'react-router-dom';

/**
 * Vault page - Browse all cards
 */
export const VaultPage = () => {
  const [selectedDirection, setSelectedDirection] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  // Fetch directions for filter
  const { data: directions } = useQuery({
    queryKey: ['directions'],
    queryFn: directionsApi.getAll,
  });

  // Fetch vault cards
  const { data: vault, isLoading } = useQuery({
    queryKey: ['vault', selectedDirection, page],
    queryFn: () =>
      vaultApi.getCards({
        direction_id: selectedDirection,
        page,
        page_size: 20,
      }),
  });

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-4">Vault</h1>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedDirection === undefined ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedDirection(undefined)}
            >
              All Directions
            </Button>
            {directions?.map((direction) => (
              <Button
                key={direction.id}
                variant={selectedDirection === direction.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedDirection(direction.id)}
              >
                {direction.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loading size="lg" text="Loading cards..." />
          </div>
        )}

        {/* Cards Grid */}
        {!isLoading && vault && vault.cards.length > 0 && (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {vault.cards.map((card) => (
                <VaultCardItem key={card.id} card={card} />
              ))}
            </div>

            {/* Pagination */}
            {vault.total > vault.page_size && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-secondary-600 dark:text-secondary-400">
                  Page {page} of {Math.ceil(vault.total / vault.page_size)}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= Math.ceil(vault.total / vault.page_size)}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && vault && vault.cards.length === 0 && (
          <EmptyState
            icon={<span className="text-6xl">🗃️</span>}
            title="No cards yet"
            description="Start creating cards to build your knowledge vault."
            action={
              <Link to="/intelligence">
                <Button>Create Cards with AI</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
};
