import { useEffect, useMemo, useRef, useState } from 'react';
import Chat, { Bubble } from '@chatui/core';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/card';
import {
  DEFAULT_CONFIG,
  STORAGE_KEY,
  buildMessages,
  formatSearchResults,
  safeJsonParse,
  type AgentConfig,
  type SearchResultItem,
} from './lib/messages';

interface ToolCall {
  id: string;
  name?: string;
  arguments: string;
  status?: '调用中' | '完成' | '失败';
  result?: string;
}

interface UserMessage {
  id: string;
  role: 'user';
  content: string;
}

interface AssistantMessage {
  id: string;
  role: 'assistant';
  content?: string;
  toolCalls?: ToolCall[];
}

interface AssistantToolCallMessage {
  id: string;
  role: 'assistant';
  toolCall: ToolCall;
}

interface ToolResultMessage {
  id: string;
  role: 'tool';
  name?: string;
  content: string;
  tool_call_id?: string;
}

export type ChatMessage =
  | UserMessage
  | AssistantMessage
  | AssistantToolCallMessage
  | ToolResultMessage;

type ConfigState = AgentConfig & { apiKey: string; searchKey: string };

const TOOL_DEFINITION = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: '使用前端搜索 API 检索网页信息。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '需要搜索的查询语句',
          },
        },
        required: ['query'],
      },
    },
  },
];

const STATUS_READY = '就绪';

const createId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

function ToolCallCard({ title = '工具调用', call }: { title?: string; call: ToolCall }) {
  return (
    <Card className="tool-card">
      <CardHeader>
        <div className="tool-card__title-row">
          <CardTitle>{title}</CardTitle>
          <span
            className={`tool-card__status tool-card__status--${
              call.status === '完成' ? 'success' : call.status === '失败' ? 'danger' : 'info'
            }`}
          >
            {call.status || '调用中'}
          </span>
        </div>
        <CardDescription>{call.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="tool-card__row">
          <span className="tool-card__label">参数</span>
          <pre className="tool-card__code">{call.arguments}</pre>
        </div>
        {call.result ? (
          <div className="tool-card__row">
            <span className="tool-card__label">结果</span>
            <pre className="tool-card__code">{call.result}</pre>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ToolResultCard({ payload }: { payload: ToolResultMessage }) {
  return (
    <Card className="tool-card tool-card--muted">
      <CardHeader>
        <div className="tool-card__title-row">
          <CardTitle>{payload.name}</CardTitle>
          <span className="tool-card__status tool-card__status--muted">工具输出</span>
        </div>
        <CardDescription>tool_call_id: {payload.tool_call_id}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="tool-card__code">{payload.content}</pre>
      </CardContent>
    </Card>
  );
}

export default function App() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [config, setConfig] = useState<ConfigState>({
    ...DEFAULT_CONFIG,
    apiKey: '',
    searchKey: '',
  });
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState(STATUS_READY);
  const [streaming, setStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const historyRef = useRef<ChatMessage[]>(history);
  const configRef = useRef<ConfigState>(config);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    const cached = safeJsonParse<Partial<ConfigState>>(localStorage.getItem(STORAGE_KEY), {});
    setConfig((prev) => ({ ...prev, ...cached }));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateMessage = (id: string, updater: (msg: ChatMessage) => Partial<ChatMessage>) => {
    setHistory((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...updater(msg) } : msg)));
  };

  const renderMessageContent = (msg: ChatMessage) => {
    if ('toolCall' in msg) {
      return <ToolCallCard call={msg.toolCall} />;
    }
    if (msg.role === 'tool') {
      return <ToolResultCard payload={msg} />;
    }
    return <Bubble content={(msg as { content?: string }).content || ''} />;
  };

  const chatMessages = useMemo<unknown[]>(
    () =>
      history.map((msg) => {
        if ('toolCall' in msg) {
          return {
            _id: msg.id,
            type: 'tool-call',
            content: msg.toolCall,
            position: 'left' as const,
          };
        }
        if (msg.role === 'tool') {
          return {
            _id: msg.id,
            type: 'tool-result',
            content: msg,
            position: 'left' as const,
          };
        }
        return {
          _id: msg.id,
          type: 'text',
          content: { text: msg.content || '' },
          position: msg.role === 'user' ? 'right' : ('left' as const),
        };
      }),
    [history]
  );

  const handleSend = async (_: unknown, val?: { text?: string } | string) => {
    if (streaming) return;
    const text = (typeof val === 'string' ? val : val?.text || '').trim();
    if (!text) return;
    const userMessage: UserMessage = { id: createId(), role: 'user', content: text };
    const nextHistory = [...historyRef.current, userMessage];
    setHistory(nextHistory);
    setInputValue('');
    await streamAssistant(nextHistory);
  };

  const performSearch = async (call: ToolCall) => {
    const args = safeJsonParse<{ query?: string } | null>(call.arguments, {});
    const query = args?.query || '';
    const currentConfig = configRef.current;
    const endpoint = currentConfig.searchEndpoint || DEFAULT_CONFIG.searchEndpoint;

    if (!query) {
      return { ok: false, summary: '搜索失败：缺少查询参数', raw: '' };
    }

    const baseUrl = new URL(endpoint);
    baseUrl.searchParams.set('q', query);
    if (!baseUrl.searchParams.has('max_results')) {
      baseUrl.searchParams.set('max_results', '5');
    }

    const headers: Record<string, string> = {};
    if (currentConfig.searchKey) {
      headers['X-Search-Api-Key'] = currentConfig.searchKey;
    }

    const proxiedUrl =
      baseUrl.host === 'api.allorigins.win' ? baseUrl : new URL('https://api.allorigins.win/raw');
    if (proxiedUrl.host === 'api.allorigins.win') {
      proxiedUrl.searchParams.set('url', baseUrl.toString());
    }

    try {
      const res = await fetch(proxiedUrl.toString(), { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = (await res.json()) as { results?: unknown; data?: unknown };
      const results = (data?.results || data?.data || []) as SearchResultItem[];
      return {
        ok: true,
        summary: formatSearchResults(results),
        raw: JSON.stringify(results, null, 2),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      return { ok: false, summary: `搜索失败：${message}`, raw: message };
    }
  };

  const handleToolCalls = async (toolCalls: ToolCall[]) => {
    for (const call of toolCalls) {
      const toolMessageId = createId();
      const callMessage: AssistantToolCallMessage = {
        id: toolMessageId,
        role: 'assistant',
        toolCall: {
          id: call.id,
          name: call.name,
          arguments: call.arguments || '{}',
          status: '调用中',
          result: '',
        },
      };
      setHistory((prev) => [...prev, callMessage]);
      setStreaming(true);
      setStatus('正在执行工具调用…');

      const result = await performSearch(callMessage.toolCall);
      updateMessage(toolMessageId, (msg) => ({
        toolCall: {
          ...(msg as AssistantToolCallMessage).toolCall,
          status: result.ok ? '完成' : '失败',
          result: result.summary,
        },
      }));

      const toolResult: ToolResultMessage = {
        id: createId(),
        role: 'tool',
        name: call.name,
        content: result.raw,
        tool_call_id: call.id,
      };
      setHistory((prev) => [...prev, toolResult]);
      setStreaming(false);
      setStatus(STATUS_READY);
      await streamAssistant(historyRef.current);
    }
  };

  const streamAssistant = async (historySnapshot: ChatMessage[]) => {
    if (streaming) return;
    const currentConfig = configRef.current;
    if (!currentConfig.apiKey) {
      setStatus('需要 API Key');
      return;
    }

    const toolCallsBuffer: ToolCall[] = [];
    const payload = {
      model: currentConfig.model,
      messages: buildMessages(historySnapshot, currentConfig.systemPrompt),
      stream: true,
      tools: TOOL_DEFINITION,
      tool_choice: 'auto' as const,
    };

    const assistantId = createId();
    const assistantMessage: AssistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolCalls: [],
    };
    setHistory((prev) => [...prev, assistantMessage]);

    controllerRef.current = new AbortController();
    setStreaming(true);
    setStatus('生成中');

    try {
      const response = await fetch(currentConfig.apiEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const payloadLine = line.replace('data:', '').trim();
          if (payloadLine === '[DONE]') continue;

          const parsed = safeJsonParse<{
            choices?: Array<{
              delta?: {
                content?: Array<{ text?: string }>;
                tool_calls?: Array<{
                  id?: string;
                  index?: number;
                  function?: { name?: string; arguments?: string };
                }>;
              };
            }>;
          }>(payloadLine, {});
          const delta = parsed?.choices?.[0]?.delta || {};

          if (delta.content) {
            const text = delta.content.map((c) => c.text || '').join('');
            updateMessage(assistantId, (msg) => ({ content: `${(msg as AssistantMessage).content || ''}${text}` }));
          }

          if (delta.tool_calls) {
            updateMessage(assistantId, (msg) => {
              const existing = [...((msg as AssistantMessage).toolCalls || [])];
              delta.tool_calls?.forEach((callDelta) => {
                const index = callDelta.index ?? existing.length;
                const current = existing[index] || {
                  id: callDelta.id || createId(),
                  name: callDelta.function?.name,
                  arguments: '',
                };
                current.id = current.id || callDelta.id || createId();
                current.name = callDelta.function?.name || current.name;
                current.arguments += callDelta.function?.arguments || '';
                existing[index] = current;
                toolCallsBuffer[index] = { ...current };
              });
              return { toolCalls: [...existing] };
            });
          }
        }
      }

      setStreaming(false);
      setStatus(STATUS_READY);

      const finalToolCalls = toolCallsBuffer.filter(Boolean);
      if (finalToolCalls.length) {
        await handleToolCalls(finalToolCalls);
      }
    } catch (err) {
      setStreaming(false);
      const message = err instanceof Error ? err.message : '请求失败';
      setStatus(err instanceof DOMException && err.name === 'AbortError' ? '已取消当前请求。' : `请求失败：${message}`);
      updateMessage(assistantId, () => ({
        content:
          err instanceof DOMException && err.name === 'AbortError'
            ? '已取消当前请求。'
            : `请求失败：${message}`,
      }));
    } finally {
      controllerRef.current = null;
    }
  };

  const resetConfig = () => {
    setConfig({ ...DEFAULT_CONFIG, apiKey: '', searchKey: '' });
    setStatus('已重置');
  };

  const clearConversation = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    setHistory([]);
    setStreaming(false);
    setStatus('空');
  };

  const stopStreaming = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>KnowFlow</h1>
          <p className="subtitle">前端 Agent</p>
        </div>
        <div className="status-chip">{status}</div>
      </header>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">配置</p>
            <h2>模型与工具</h2>
          </div>
          <div className="panel__actions">
            <button type="button" onClick={resetConfig} className="btn btn--ghost">
              重置配置
            </button>
            <button type="button" onClick={clearConversation} className="btn btn--ghost">
              清空对话
            </button>
          </div>
        </div>

        <div className="grid">
          <label className="field">
            <span>API Key</span>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder="必填"
            />
          </label>
          <label className="field">
            <span>API Endpoint</span>
            <input
              value={config.apiEndpoint}
              onChange={(e) => setConfig((prev) => ({ ...prev, apiEndpoint: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>模型名称</span>
            <input
              value={config.model}
              onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>系统提示词</span>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))}
              rows={2}
            />
          </label>
          <label className="field">
            <span>搜索端点</span>
            <input
              value={config.searchEndpoint}
              onChange={(e) => setConfig((prev) => ({ ...prev, searchEndpoint: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>搜索 API Key（可选）</span>
            <input
              value={config.searchKey}
              onChange={(e) => setConfig((prev) => ({ ...prev, searchKey: e.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">对话</p>
            <h2>Agent 工作台</h2>
          </div>
          <div className="panel__actions">
            {streaming ? (
              <button type="button" className="btn" onClick={stopStreaming}>
                停止生成
              </button>
            ) : null}
          </div>
        </div>

        <div className="chat-container">
          <Chat
            navbar={false}
            messages={chatMessages as any}
            renderMessageContent={renderMessageContent}
            placeholder="输入即可"
            onSend={handleSend}
            disableSend={streaming}
            quickReplies={[{ name: '🛰️ 搜索资讯', isHighlight: true }, { name: '🧠 生成想法' }]}
            onQuickReplyClick={(item) => handleSend('text', item.name)}
            text={inputValue}
            onInputChange={setInputValue}
          />
        </div>
      </section>
    </div>
  );
}
