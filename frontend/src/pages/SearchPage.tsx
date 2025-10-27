import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@api';
import { Input } from '@components/Input';
import { CardItem } from '@features/cards/CardItem';
import { Loading } from '@components/Loading';
import { EmptyState } from '@components/EmptyState';

/**
 * Search page
 */
export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch search results
  const { data: results, isLoading } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => searchApi.search({ query: searchQuery }),
    enabled: searchQuery.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchQuery(query.trim());
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-8">Search</h1>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search your cards..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
            />
          </div>
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loading size="lg" text="Searching..." />
          </div>
        )}

        {/* Results */}
        {!isLoading && results && results.cards.length > 0 && (
          <div>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4">
              Found {results.total} result{results.total !== 1 ? 's' : ''}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {results.cards.map((card) => (
                <CardItem key={card.id} card={card} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && searchQuery && results && results.cards.length === 0 && (
          <EmptyState
            icon={<span className="text-6xl">🔍</span>}
            title="No results found"
            description={`No cards match "${searchQuery}". Try a different search term.`}
          />
        )}

        {/* Initial State */}
        {!searchQuery && (
          <EmptyState
            icon={<span className="text-6xl">🔍</span>}
            title="Search your knowledge"
            description="Enter a search term to find cards across all your learning directions."
          />
        )}
      </div>
    </div>
  );
};
