import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bubble, GiftedChat, InputToolbar, Send, type IMessage } from 'react-native-gifted-chat';

import { useTheme } from '@/providers';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { Text } from '@/ui/components/Text';

import type { CardType, GeneratedCardDraft } from '@api';
import { useGenerateCardDrafts } from '../hooks';

const ASSISTANT_USER = { _id: 'assistant', name: 'KnowFlow AI' } as const;
const CURRENT_USER = { _id: 'user', name: 'You' } as const;

const CARD_TYPE_LABELS: Record<CardType, string> = {
  fact: '事实卡',
  concept: '概念卡',
  procedure: '流程卡',
  claim: '论证卡',
};

const CARD_TYPE_OPTIONS = (Object.keys(CARD_TYPE_LABELS) as CardType[]).map((value) => ({
  value,
  label: CARD_TYPE_LABELS[value],
}));

const DRAFT_COUNT_OPTIONS = [3, 5, 8].map((count) => ({
  value: count.toString(),
  label: `${count} 份`,
}));

const createIntroMessage = (): IMessage => ({
  _id: 'intro',
  text: '粘贴你的资料、灵感或问题，我会为你生成可以直接记忆的卡片草稿。',
  createdAt: new Date(),
  user: ASSISTANT_USER,
});

const formatDrafts = (drafts: GeneratedCardDraft[]) => {
  if (!drafts || drafts.length === 0) {
    return '暂时没能产出草稿，请尝试提供更多上下文或换个角度描述。';
  }

  return drafts
    .map((draft, index) => {
      const confidence = Math.round(draft.confidence * 100);
      const body = draft.draft.body.trim();
      const truncatedBody = body.length > 320 ? `${body.slice(0, 317)}…` : body;
      const rationale = draft.rationale.trim();

      return [
        `#${index + 1} · ${draft.draft.title}`,
        `类型：${CARD_TYPE_LABELS[draft.draft.card_type] ?? draft.draft.card_type}`,
        `信心：${confidence}%`,
        truncatedBody,
        rationale ? `理由：${rationale}` : undefined,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
};

export const IntelligenceChat = () => {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<IMessage[]>([createIntroMessage()]);
  const [preferredType, setPreferredType] = useState<CardType>('concept');
  const [desiredCount, setDesiredCount] = useState<number>(3);

  const { mutateAsync, isPending } = useGenerateCardDrafts();

  const handleSend = useCallback(async (outgoing: IMessage[] = []) => {
    if (!outgoing.length) return;

    setMessages((current) => GiftedChat.append(current, outgoing));

    const latest = outgoing[0];
    const prompt = latest?.text?.trim();

    if (!prompt) {
      return;
    }

    try {
      const drafts = await mutateAsync({
        materials: [{ content: prompt }],
        preferredCardType: preferredType,
        desiredCount,
      });

      setMessages((current) =>
        GiftedChat.append(current, [
          {
            _id: `draft-${Date.now()}`,
            text: formatDrafts(drafts),
            createdAt: new Date(),
            user: ASSISTANT_USER,
          },
        ]),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setMessages((current) =>
        GiftedChat.append(current, [
          {
            _id: `error-${Date.now()}`,
            text: `抱歉，生成失败：${message}`,
            createdAt: new Date(),
            user: ASSISTANT_USER,
          },
        ]),
      );
    }
  }, [desiredCount, mutateAsync, preferredType]);

  const renderBubble = useCallback(
    (props: Parameters<typeof Bubble>[0]) => (
      <Bubble
        {...props}
        wrapperStyle={{
          left: {
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: 16,
            padding: 4,
          },
          right: {
            backgroundColor: theme.colors.accent,
            borderRadius: 16,
            padding: 4,
          },
        }}
        textStyle={{
          left: { color: theme.colors.textSecondary },
          right: { color: '#FFFFFF' },
        }}
      />
    ),
    [theme.colors.accent, theme.colors.surfaceAlt, theme.colors.textSecondary],
  );

  const renderInputToolbar = useCallback(
    (props: Parameters<typeof InputToolbar>[0]) => (
      <InputToolbar
        {...props}
        containerStyle={{
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: 8,
          paddingVertical: 6,
        }}
        primaryStyle={{
          alignItems: 'center',
        }}
      />
    ),
    [theme.colors.border, theme.colors.surface],
  );

  const renderSend = useCallback(
    (props: Parameters<typeof Send>[0]) => (
      <Send {...props}>
        <View style={styles.sendButton}>
          <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>发送</Text>
        </View>
      </Send>
    ),
    [theme.colors.accent],
  );

  const typing = isPending;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Text variant="title">AI Draft Studio</Text>
        <Text variant="caption">快速整理知识卡片的专属助理。</Text>
      </View>
      <View style={styles.controls}>
        <View style={styles.controlGroup}>
          <Text variant="caption" style={styles.controlLabel}>
            偏好卡片类型
          </Text>
          <SegmentedControl
            options={CARD_TYPE_OPTIONS}
            value={preferredType}
            onChange={(value) => setPreferredType(value as CardType)}
          />
        </View>
        <View style={styles.controlGroup}>
          <Text variant="caption" style={styles.controlLabel}>
            目标草稿数量
          </Text>
          <SegmentedControl
            options={DRAFT_COUNT_OPTIONS}
            value={desiredCount.toString()}
            onChange={(value) => setDesiredCount(Number(value))}
          />
        </View>
      </View>
      <GiftedChat
        messages={messages}
        onSend={handleSend}
        user={CURRENT_USER}
        placeholder="向 AI 描述你正在整理的素材..."
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderSend={renderSend}
        isTyping={typing}
        showUserAvatar={false}
        alwaysShowSend
        messagesContainerStyle={styles.chat}
        keyboardShouldPersistTaps="handled"
        timeTextStyle={{
          left: { color: theme.colors.textMuted },
          right: { color: theme.colors.surface },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
  },
  header: {
    paddingBottom: 12,
    gap: 4,
  },
  controls: {
    gap: 12,
    marginBottom: 12,
  },
  controlGroup: {
    gap: 6,
  },
  controlLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chat: {
    backgroundColor: 'transparent',
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
