const messagesEl = document.getElementById('messages');
const composerEl = document.getElementById('composer');
const inputEl = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const resetConfigBtn = document.getElementById('reset-config');
const clearChatBtn = document.getElementById('clear-chat');
const statusEl = document.getElementById('status');
const messageTemplate = document.getElementById('message-template');
const toolTemplate = document.getElementById('tool-template');

const state = {
  messages: [],
  streaming: false,
  controller: null,
};

const STORAGE_KEY = 'aihubmix-agent-settings';
const DEFAULT_CONFIG = {
  model: 'gpt-4o-mini',
  systemPrompt: 'You are a helpful AI assistant.',
  searchEndpoint: 'https://ddg-webapp-aagd.vercel.app/search',
};

function createMessageElement(role, content, isTool = false) {
  const node = messageTemplate.content.cloneNode(true);
  node.querySelector('.role').textContent = role;
  const contentEl = node.querySelector('.content');
  contentEl.textContent = content;
  if (isTool) {
    node.querySelector('.message').classList.add('tool');
  }
  return node;
}

function createToolElement(name, args, status, result = '') {
  const node = toolTemplate.content.cloneNode(true);
  node.querySelector('.tool-name').textContent = name;
  node.querySelector('.tool-args').textContent = `参数：${args}`;
  node.querySelector('.tool-status').textContent = status;
  node.querySelector('.tool-result').textContent = result;
  return node;
}

function renderMessages() {
  messagesEl.innerHTML = '';
  state.messages.forEach((msg) => {
    const isTool = msg.role === 'tool';
    const element = createMessageElement(msg.role, formatContent(msg), isTool);
    const contentEl = element.querySelector('.content');

    if (msg.tool_call) {
      const toolNode = createToolElement(
        msg.tool_call.name,
        msg.tool_call.arguments,
        msg.tool_call.status || '完成',
        msg.tool_call.result || ''
      );
      contentEl.appendChild(toolNode);
    }

    messagesEl.appendChild(element);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setStreaming(isStreaming) {
  state.streaming = isStreaming;
  if (isStreaming) {
    setStatus('正在生成响应，工具调用会自动执行…');
  } else {
    setStatus('准备就绪，可直接提问。');
  }
  inputEl.disabled = isStreaming;
  sendBtn.disabled = isStreaming;
  clearChatBtn.disabled = isStreaming;
  sendBtn.textContent = isStreaming ? '生成中…' : '发送';
}

function formatContent(msg) {
  if (msg.role === 'tool') {
    return msg.content || '工具返回空结果';
  }
  if (Array.isArray(msg.content)) {
    return msg.content.map((c) => c.text || '').join('\n');
  }
  return msg.content || '';
}

function readConfig() {
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('model').value.trim();
  const systemPrompt = document.getElementById('system-prompt').value.trim();
  const searchEndpoint = document.getElementById('search-endpoint').value.trim();
  const searchKey = document.getElementById('search-key').value.trim();
  return { apiKey, model, systemPrompt, searchEndpoint, searchKey };
}

function saveConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readConfig()));
  } catch (err) {
    console.warn('无法持久化配置：', err);
  }
}

function restoreConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.apiKey) document.getElementById('api-key').value = parsed.apiKey;
    if (parsed.model) document.getElementById('model').value = parsed.model;
    if (parsed.systemPrompt) document.getElementById('system-prompt').value = parsed.systemPrompt;
    if (parsed.searchEndpoint) document.getElementById('search-endpoint').value = parsed.searchEndpoint;
    if (parsed.searchKey) document.getElementById('search-key').value = parsed.searchKey;
  } catch (err) {
    console.warn('无法读取本地配置：', err);
  }
}

function buildToolDefinition() {
  return [
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
}

async function handleToolCalls(toolCalls) {
  for (const call of toolCalls) {
    const args = safeJsonParse(call.function?.arguments) || {};
    const query = args.query || '';
    const toolMessage = {
      role: 'assistant',
      content: '',
      tool_call: {
        id: call.id,
        name: call.function?.name,
        arguments: JSON.stringify(args, null, 2),
        status: '调用中',
      },
    };
    state.messages.push(toolMessage);
    renderMessages();

    setStreaming(true);
    const result = await performSearch(query);
    toolMessage.tool_call.status = result.ok ? '完成' : '失败';
    toolMessage.tool_call.result = result.summary;
    renderMessages();

    state.messages.push({
      role: 'tool',
      tool_call_id: call.id,
      name: call.function?.name,
      content: result.raw,
    });
    renderMessages();
    setStreaming(false);

    await sendToModel();
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return null;
  }
}

async function performSearch(query) {
  const { searchEndpoint: endpoint, searchKey: key } = readConfig();
  const url = new URL(endpoint);
  url.searchParams.set('q', query);
  if (!url.searchParams.has('max_results')) {
    url.searchParams.set('max_results', '5');
  }

  const headers = {};
  if (key) headers['X-Search-Api-Key'] = key;

  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    const results = data?.results || data?.data || [];
    const formatted = results.slice(0, 5).map((item, idx) => {
      const title = item.title || item.name || '未命名结果';
      const link = item.link || item.url || '';
      const snippet = item.body || item.description || item.snippet || '';
      return `${idx + 1}. ${title}\n${link}\n${snippet}`;
    });
    return {
      ok: true,
      summary: formatted.join('\n\n') || '未找到结果',
      raw: JSON.stringify(results, null, 2),
    };
  } catch (err) {
    return {
      ok: false,
      summary: `搜索失败：${err.message}`,
      raw: err.message,
    };
  }
}

async function sendToModel() {
  if (state.streaming) return;
  const { apiKey, model, systemPrompt } = readConfig();
  if (!apiKey) {
    alert('请先填写 AIHubMix API Key');
    return;
  }

  saveConfig();

  const payload = {
    model,
    messages: buildMessages(systemPrompt),
    stream: true,
    tools: buildToolDefinition(),
    tool_choice: 'auto',
  };

  setStreaming(true);
  state.controller = new AbortController();
  const assistantMessage = { role: 'assistant', content: '' };
  state.messages.push(assistantMessage);
  renderMessages();

  try {
    const response = await fetch('https://api.aihubmix.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: state.controller.signal,
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
      buffer = parts.pop();

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.replace('data:', '').trim();
        if (payload === '[DONE]') continue;

        const parsed = safeJsonParse(payload);
        if (!parsed?.choices?.length) continue;
        const delta = parsed.choices[0].delta || {};

        if (delta.content) {
          const text = delta.content.map((c) => c.text || '').join('');
          assistantMessage.content += text;
          renderMessages();
        }

        if (delta.tool_calls) {
          assistantMessage.tool_calls = assistantMessage.tool_calls || [];
          delta.tool_calls.forEach((callDelta) => {
            const index = callDelta.index ?? assistantMessage.tool_calls.length;
            const existing = assistantMessage.tool_calls[index] || {
              id: callDelta.id,
              function: { name: callDelta.function?.name, arguments: '' },
            };
            existing.id = existing.id || callDelta.id;
            existing.function.name = callDelta.function?.name || existing.function.name;
            existing.function.arguments += callDelta.function?.arguments || '';
            assistantMessage.tool_calls[index] = existing;
          });
          renderMessages();
        }
      }
    }

    setStreaming(false);
    renderMessages();

    if (assistantMessage.tool_calls?.length) {
      await handleToolCalls(assistantMessage.tool_calls);
    }
  } catch (err) {
    setStreaming(false);
    if (err.name === 'AbortError') {
      assistantMessage.content = '已取消当前请求。';
    } else {
      assistantMessage.content = `请求失败：${err.message}`;
    }
    renderMessages();
  } finally {
    state.controller = null;
  }
}

function buildMessages(systemPrompt) {
  const base = systemPrompt
    ? [
        {
          role: 'system',
          content: systemPrompt,
        },
      ]
    : [];
  return [
    ...base,
    ...state.messages.map((m) => {
      if (m.role === 'assistant') {
        const payload = { role: 'assistant' };
        if (m.content) payload.content = [{ type: 'text', text: m.content }];
        if (m.tool_calls) payload.tool_calls = m.tool_calls;
        return payload;
      }
      if (m.role === 'tool') {
        return {
          role: 'tool',
          content: m.content,
          tool_call_id: m.tool_call_id,
          name: m.name,
        };
      }
      return m;
    }),
  ];
}

function resetConfig() {
  document.getElementById('api-key').value = '';
  document.getElementById('model').value = DEFAULT_CONFIG.model;
  document.getElementById('system-prompt').value = DEFAULT_CONFIG.systemPrompt;
  document.getElementById('search-endpoint').value = DEFAULT_CONFIG.searchEndpoint;
  document.getElementById('search-key').value = '';
  saveConfig();
  setStatus('配置已重置，可直接开始对话。');
}

function clearConversation() {
  if (state.streaming && state.controller) {
    state.controller.abort();
  }
  state.messages = [];
  renderMessages();
  setStreaming(false);
  setStatus('对话已清空，等待新的提问。');
}

composerEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.streaming) return;
  const text = inputEl.value.trim();
  if (!text) return;
  state.messages.push({ role: 'user', content: text });
  inputEl.value = '';
  renderMessages();
  await sendToModel();
});

['api-key', 'model', 'system-prompt', 'search-endpoint', 'search-key'].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener('change', saveConfig);
  el.addEventListener('blur', saveConfig);
});

resetConfigBtn.addEventListener('click', resetConfig);
clearChatBtn.addEventListener('click', clearConversation);

restoreConfig();
renderMessages();
