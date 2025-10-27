interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Chat message component for intelligence/AI interaction
 */
export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? 'bg-primary-600 text-white'
            : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100'
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};
