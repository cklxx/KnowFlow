import { useEffect, useMemo, useState } from 'react';
import type { DailyDigest, DigestItem, DigestQuestion } from './types';
import './App.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

const isAbsoluteUrl = (url: string) => /^(https?:)?\/\//.test(url) || url.startsWith('data:');

const resolveAssetUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }

  if (isAbsoluteUrl(url)) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

const buildAudioSource = (item: DigestItem) => {
  const audioUrl = resolveAssetUrl(item.audio_url);
  if (audioUrl) {
    return audioUrl;
  }

  if (item.audio_base64) {
    return `data:audio/mpeg;base64,${item.audio_base64}`;
  }

  return undefined;
};

const formatDateTime = (timestamp?: string | null) => {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const QuestionBlock = ({ question }: { question: DigestQuestion }) => {
  return (
    <div className="question-block">
      <div className="question">
        <span className="question-label">问题：</span>
        {question.question}
      </div>
      <div className="answer">
        <span className="answer-label">解答：</span>
        {question.answer}
      </div>
      {question.follow_up_question && question.follow_up_answer && (
        <div className="follow-up">
          <div className="question">
            <span className="question-label">追问：</span>
            {question.follow_up_question}
          </div>
          <div className="answer">
            <span className="answer-label">回应：</span>
            {question.follow_up_answer}
          </div>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, items }: { title: string; items: string[] }) => {
  if (!items.length) {
    return null;
  }

  return (
    <section className="detail-section">
      <h4>{title}</h4>
      <ul>
        {items.map((entry, index) => (
          <li key={`${title}-${index}`}>{entry}</li>
        ))}
      </ul>
    </section>
  );
};

const DigestCard = ({ item }: { item: DigestItem }) => {
  const audioSrc = useMemo(() => buildAudioSource(item), [item]);
  const publishedAt = useMemo(() => formatDateTime(item.published_at), [item.published_at]);
  const transcriptUrl = useMemo(() => resolveAssetUrl(item.transcript_url), [item.transcript_url]);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [transcriptContent, setTranscriptContent] = useState<string | null>(null);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTranscriptOpen || transcriptContent || !transcriptUrl) {
      return;
    }

    const controller = new AbortController();
    const fetchTranscript = async () => {
      try {
        setIsTranscriptLoading(true);
        setTranscriptError(null);
        const response = await fetch(transcriptUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`加载文字稿失败：${response.status}`);
        }
        const text = await response.text();
        setTranscriptContent(text);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }
        console.error(err);
        setTranscriptError('文字稿加载失败，请稍后再试。');
      } finally {
        setIsTranscriptLoading(false);
      }
    };

    fetchTranscript();

    return () => {
      controller.abort();
    };
  }, [isTranscriptOpen, transcriptContent, transcriptUrl]);

  const toggleTranscript = () => {
    if (!transcriptUrl) {
      setTranscriptError('暂无可展示的文字稿。');
      setIsTranscriptOpen(true);
      return;
    }

    setIsTranscriptOpen((prev) => !prev);
  };

  return (
    <article className="digest-card">
      <header className="digest-card__header">
        <div>
          <h2>{item.title}</h2>
          <p className="headline">{item.headline}</p>
        </div>
        {publishedAt && <time className="publish-time">{publishedAt}</time>}
      </header>

      {audioSrc ? (
        <div className="audio-player">
          <audio controls preload="none" src={audioSrc}>
            您的浏览器不支持音频播放，请下载音频后收听。
          </audio>
        </div>
      ) : (
        <p className="audio-placeholder">暂无音频，先看看文字摘要吧。</p>
      )}

      <div className="transcript-controls">
        <button
          type="button"
          onClick={toggleTranscript}
          disabled={!transcriptUrl || isTranscriptLoading}
          aria-expanded={isTranscriptOpen}
        >
          {isTranscriptLoading ? '文字稿加载中…' : isTranscriptOpen ? '收起文字稿' : '展开文字稿'}
        </button>
        {transcriptUrl && (
          <a href={transcriptUrl} target="_blank" rel="noreferrer">
            下载文字稿
          </a>
        )}
      </div>

      {isTranscriptOpen && (
        <div className="transcript-panel">
          {transcriptError && <p className="transcript-status error">{transcriptError}</p>}
          {isTranscriptLoading && !transcriptContent && !transcriptError && (
            <p className="transcript-status">文字稿加载中…</p>
          )}
          {transcriptContent && <pre>{transcriptContent}</pre>}
        </div>
      )}

      <Section title="🧠 发生了什么" items={item.happened} />
      <Section title="👀 和我有什么关系" items={item.impact} />
      <Section title="✅ 我需要做什么" items={item.actions} />
      <Section title="💡 核心认知" items={item.core_insights} />
      <Section title="🔍 信息校验" items={item.info_checks} />
      <Section title="🤔 更多思考" items={item.more_thoughts} />

      {item.key_questions.length > 0 && (
        <section className="detail-section">
          <h4>❓ 关键问题</h4>
          <div className="questions">
            {item.key_questions.map((question, index) => (
              <QuestionBlock key={`${item.title}-question-${index}`} question={question} />
            ))}
          </div>
        </section>
      )}

      <footer className="digest-card__footer">
        <a href={item.source_url} target="_blank" rel="noreferrer" className="source-link">
          查看原文报道 ↗
        </a>
        <p className="text-summary">{item.text_summary}</p>
      </footer>
    </article>
  );
};

function App() {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchDigest = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/digest/today`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`请求失败：${response.status}`);
        }

        const data = (await response.json()) as DailyDigest;
        setDigest(data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }

        console.error(err);
        setError('加载今日摘要时遇到问题，请稍后再试。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDigest();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="branding">
          <span className="logo" aria-hidden="true">
            👂
          </span>
          <div>
            <h1>AI 小耳朵 · 今日摘要</h1>
            <p className="tagline">每天 10 分钟，不焦虑地跟上 AI</p>
          </div>
        </div>
        {digest?.date && <p className="digest-date">{digest.date}</p>}
      </header>

      {isLoading && <p className="status">正在为你准备今日的 AI 小耳朵内容…</p>}
      {error && !isLoading && <p className="status error">{error}</p>}

      {!isLoading && !error && digest && (
        <>
          <section className="intro">
            <h2>今日一句话</h2>
            <p>{digest.intro}</p>
          </section>

          <section className="brief">
            <h3>一分钟极速版</h3>
            <p>{digest.one_minute_brief}</p>
          </section>

          <section className="digest-items">
            {digest.items.map((item) => (
              <DigestCard key={item.title} item={item} />
            ))}
          </section>
        </>
      )}
    </main>
  );
}

export default App;
