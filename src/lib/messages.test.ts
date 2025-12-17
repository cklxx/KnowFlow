import { describe, expect, it } from 'vitest';
import {
  buildMessages,
  DEFAULT_CONFIG,
  formatSearchResults,
  safeJsonParse,
  type HistoryMessage,
} from './messages';

describe('buildMessages', () => {
  it('prepends system prompt when provided', () => {
    const history: HistoryMessage[] = [{ role: 'user', content: 'hi' }];
    const result = buildMessages(history, DEFAULT_CONFIG.systemPrompt);
    expect(result[0]).toEqual({ role: 'system', content: DEFAULT_CONFIG.systemPrompt });
    expect(result[1]).toEqual({ role: 'user', content: 'hi' });
  });

  it('keeps assistant tool calls', () => {
    const history: HistoryMessage[] = [
      {
        role: 'assistant',
        content: 'test',
        toolCalls: [
          {
            id: '1',
            function: {
              name: 'search_web',
              arguments: '{"query":"vite"}',
            },
          },
        ],
      },
    ];

    const result = buildMessages(history, '');
    expect(result[0]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'test' }],
      tool_calls: [
        {
          id: '1',
          type: 'function',
          function: { name: 'search_web', arguments: '{"query":"vite"}' },
        },
      ],
    });
  });
});

describe('formatSearchResults', () => {
  it('returns fallback when no results', () => {
    expect(formatSearchResults([])).toBe('未找到结果');
    expect(formatSearchResults(null as unknown as [])).toBe('未找到结果');
  });

  it('formats up to five results with numbering', () => {
    const results = Array.from({ length: 6 }).map((_, idx) => ({
      title: `Title ${idx + 1}`,
      url: `https://example.com/${idx + 1}`,
      description: `Desc ${idx + 1}`,
    }));
    const formatted = formatSearchResults(results).split('\n\n');
    expect(formatted).toHaveLength(5);
    expect(formatted[0]).toContain('1. Title 1');
    expect(formatted[0]).toContain('https://example.com/1');
  });
});

describe('safeJsonParse', () => {
  it('parses valid JSON or returns fallback', () => {
    expect(safeJsonParse('{"a":1}', {} as Record<string, unknown>)).toEqual({ a: 1 });
    expect(safeJsonParse('bad', {})).toEqual({});
    expect(safeJsonParse('', 'x')).toBe('x');
  });
});
