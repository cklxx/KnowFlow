export const STORAGE_KEY = 'knowflow-agent-settings';

export interface AgentConfig {
  apiEndpoint: string;
  model: string;
  systemPrompt: string;
  searchEndpoint: string;
}

export const DEFAULT_CONFIG: AgentConfig = {
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  systemPrompt: 'You are a helpful AI assistant.',
  searchEndpoint: 'https://ddg-webapp-aagd.vercel.app/search',
};

export interface ToolCallDelta {
  id: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

export type HistoryMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content?: string; toolCalls?: ToolCallDelta[] }
  | { role: 'tool'; name?: string; content: string; tool_call_id?: string };

export function buildMessages(history: HistoryMessage[], systemPrompt?: string) {
  const base = systemPrompt
    ? [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
      ]
    : [];

  const mapped = history.map((msg) => {
    if (msg.role === 'assistant') {
      const payload: Record<string, unknown> = { role: 'assistant' };
      if (msg.content) {
        payload.content = [{ type: 'text', text: msg.content }];
      }
      if (msg.toolCalls?.length) {
        payload.tool_calls = msg.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: {
            name: call.function?.name,
            arguments: call.function?.arguments,
          },
        }));
      }
      return payload;
    }

    if (msg.role === 'tool') {
      return {
        role: 'tool' as const,
        content: msg.content,
        tool_call_id: msg.tool_call_id,
        name: msg.name,
      };
    }

    return { role: msg.role, content: msg.content };
  });

  return [...base, ...mapped];
}

export interface SearchResultItem {
  title?: string;
  name?: string;
  link?: string;
  url?: string;
  body?: string;
  description?: string;
  snippet?: string;
}

export function formatSearchResults(results: SearchResultItem[]) {
  if (!Array.isArray(results) || results.length === 0) {
    return '未找到结果';
  }

  return results
    .slice(0, 5)
    .map((item, idx) => {
      const title = item.title || item.name || '未命名结果';
      const link = item.link || item.url || '';
      const snippet = item.body || item.description || item.snippet || '';
      return `${idx + 1}. ${title}\n${link}\n${snippet}`.trim();
    })
    .join('\n\n');
}

export function safeJsonParse<T>(value: string | null, fallback: T): T;
export function safeJsonParse<T>(value: string | null, fallback: T | null): T | null;
export function safeJsonParse<T>(value: string | null, fallback: T | null = null) {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch (err) {
    return fallback;
  }
}
