import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import type { ImportSourceKind } from '@api';
import { emitShareImportIntent, type ShareImportIntent } from '@/features/import';

const normalizeKind = (value?: string): ImportSourceKind => {
  if (!value) {
    return 'text';
  }

  const normalized = value.toLowerCase();
  if (normalized === 'markdown' || normalized === 'text' || normalized === 'url' || normalized === 'code') {
    return normalized;
  }

  return 'text';
};

const toStringArray = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input
      .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const decodeJson = (raw: string): unknown => {
  const attempts = [raw];
  try {
    attempts.push(decodeURIComponent(raw));
  } catch (error) {
    // ignore decoding failures
    console.warn('Failed to decode share payload component', error);
  }

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (error) {
      // continue to next attempt
      console.warn('Failed to parse share payload JSON fragment', error);
    }
  }

  return null;
};

const parseAutoPreview = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
  }

  return undefined;
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const parseSource = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
  const title = typeof data.title === 'string' ? data.title : undefined;
  const url = typeof data.url === 'string' ? data.url : undefined;
  const content = typeof data.content === 'string' ? data.content : undefined;
  const tags = toStringArray(data.tags);
  const kind = normalizeKind(typeof data.kind === 'string' ? data.kind : undefined);

  if (!content?.trim() && !url?.trim()) {
    return null;
  }

  return { kind, title, url, content, tags } satisfies ShareImportIntent['sources'][number];
};

const parsePayload = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return {} as Record<string, unknown>;
  }
  return payload as Record<string, unknown>;
};

const buildIntentFromUrl = (url: string): Omit<ShareImportIntent, 'receivedAt'> | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    console.warn('Unable to parse share URL', error);
    return null;
  }

  const path = parsed.pathname.replace(/^\//, '');
  if (!path.includes('import') && !path.includes('share')) {
    return null;
  }

  const params = parsed.searchParams;
  const rawPayload = params.get('payload') ?? params.get('data');
  const payload = rawPayload ? parsePayload(decodeJson(rawPayload)) : {};

  const sources: ShareImportIntent['sources'] = [];

  const payloadSources = Array.isArray(payload.sources) ? payload.sources : [];
  payloadSources.forEach((item) => {
    const source = parseSource(item);
    if (source) {
      sources.push(source);
    }
  });

  const singlePayloadSource = parseSource(payload.source);
  if (singlePayloadSource) {
    sources.push(singlePayloadSource);
  }

  const queryContent = params.get('text') ?? params.get('content') ?? (typeof payload.text === 'string' ? payload.text : undefined);
  const queryUrl = params.get('url') ?? (typeof payload.url === 'string' ? payload.url : undefined);
  const queryTitle = params.get('title') ?? (typeof payload.title === 'string' ? payload.title : undefined);
  const queryTags = toStringArray(params.get('tags') ?? payload.tags);
  const queryKind = normalizeKind(params.get('kind') ?? (typeof payload.kind === 'string' ? payload.kind : undefined));

  if ((queryContent && queryContent.trim()) || (queryUrl && queryUrl.trim())) {
    sources.push({
      kind: queryKind,
      title: queryTitle ?? undefined,
      url: queryUrl ?? undefined,
      content: queryContent ?? undefined,
      tags: queryTags,
    });
  }

  const filteredSources = sources.filter((source, index, array) => {
    const hasMaterial = (source.content?.trim() ?? '') !== '' || (source.url?.trim() ?? '') !== '';
    if (!hasMaterial) {
      return false;
    }
    const fingerprint = `${source.title ?? ''}|${source.url ?? ''}|${source.content ?? ''}`;
    return array.findIndex((candidate) => `${candidate.title ?? ''}|${candidate.url ?? ''}|${candidate.content ?? ''}` === fingerprint) === index;
  });

  if (!filteredSources.length) {
    return null;
  }

  const desiredCards =
    parseNumber(payload.desiredCardsPerCluster ?? payload.desired_cards_per_cluster ?? params.get('cards') ?? params.get('count')) ?? undefined;
  const directionId =
    typeof payload.directionId === 'string'
      ? payload.directionId
      : typeof payload.direction_id === 'string'
      ? payload.direction_id
      : params.get('directionId') ?? params.get('direction_id') ?? undefined;
  const directionName =
    typeof payload.directionName === 'string'
      ? payload.directionName
      : typeof payload.direction_name === 'string'
      ? payload.direction_name
      : params.get('directionName') ?? params.get('direction_name') ?? undefined;
  const language =
    typeof payload.language === 'string' ? payload.language : params.get('language') ?? undefined;

  const autoPreview =
    parseAutoPreview(payload.autoPreview ?? payload.auto_preview ?? params.get('autoPreview')) ?? undefined;

  return {
    directionId: directionId ?? undefined,
    directionName: directionName?.trim() || undefined,
    language: language?.trim() || undefined,
    desiredCardsPerCluster: desiredCards,
    autoPreview,
    sources: filteredSources,
  };
};

export const ShareIntentProvider = ({ children }: PropsWithChildren): JSX.Element => {
  useEffect(() => {
    let mounted = true;

    const handleIntent = (incomingUrl: string | null) => {
      if (!incomingUrl) {
        return;
      }
      const intent = buildIntentFromUrl(incomingUrl);
      if (!intent) {
        return;
      }

      emitShareImportIntent({
        ...intent,
        autoPreview: intent.autoPreview ?? true,
      });
      router.push('/import');
    };

    Linking.getInitialURL()
      .then((initialUrl) => {
        if (mounted) {
          handleIntent(initialUrl);
        }
      })
      .catch((error) => {
        console.warn('Failed to read initial share URL', error);
      });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIntent(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return <>{children}</>;
};
