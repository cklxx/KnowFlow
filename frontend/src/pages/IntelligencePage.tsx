import { useState } from 'react';
import { Button } from '@components/Button';
import { Textarea } from '@components/Textarea';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';

/**
 * Intelligence/AI page - Chat and card generation
 */
export const IntelligencePage = () => {
  const [messages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement AI chat integration
    console.log('Submit:', input);
    setInput('');
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-8">
          Intelligence
        </h1>

        {/* Chat Area */}
        <Card variant="bordered" padding="none" className="mb-4 h-[500px] flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.length === 0 ? (
              <EmptyState
                icon={<span className="text-6xl">🤖</span>}
                title="AI Learning Assistant"
                description="Ask questions or describe what you want to learn, and I'll help you create memory cards."
              />
            ) : (
              <div>
                {/* TODO: Render messages */}
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="border-t border-secondary-200 dark:border-secondary-700 p-4">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything or paste content to create cards..."
                rows={3}
                fullWidth
              />
              <Button type="submit" disabled={!input.trim()}>
                Send
              </Button>
            </div>
          </form>
        </Card>

        <p className="text-xs text-center text-secondary-500 dark:text-secondary-500">
          Note: AI features require backend LLM configuration
        </p>
      </div>
    </div>
  );
};
