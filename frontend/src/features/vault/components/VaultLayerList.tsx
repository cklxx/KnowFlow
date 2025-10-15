import type {
  VaultAnnotation,
  VaultCardSummary,
  VaultEvergreenNote,
  VaultHighlight,
} from '@api';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers';
import { Card, Text } from '@/ui/components';

type HighlightListProps = {
  items: VaultHighlight[];
};

type AnnotationListProps = {
  items: VaultAnnotation[];
};

type CardListProps = {
  items: VaultCardSummary[];
};

type EvergreenListProps = {
  items: VaultEvergreenNote[];
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const DirectionBadge = ({ label }: { label: string }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Text>
    </View>
  );
};

const MetaRow = ({ label, value }: { label: string; value: string }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text variant="caption" style={{ color: theme.colors.textMuted }}>
        {label}
      </Text>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {value}
      </Text>
    </View>
  );
};

export const VaultHighlightList = ({ items }: HighlightListProps) => {
  const { theme } = useTheme();

  if (!items.length) {
    return <EmptyState message="暂无高光摘录，试着为卡片补充一条证据。" />;
  }

  return (
    <View style={styles.list}>
      {items.map((highlight) => (
        <Card key={highlight.id}>
          <View style={styles.headerRow}>
            <DirectionBadge label={highlight.direction_name} />
            <Text variant="caption" style={{ color: theme.colors.textMuted }}>
              {formatDate(highlight.captured_at)}
            </Text>
          </View>
          <Text variant="subtitle" style={{ marginBottom: 0 }}>
            {highlight.card_title}
          </Text>
          {highlight.excerpt ? (
            <Text style={{ color: theme.colors.textSecondary }}>{highlight.excerpt}</Text>
          ) : null}
          <MetaRow
            label="来源"
            value={highlight.source_uri ? highlight.source_uri : highlight.source_type}
          />
          <MetaRow label="可信度" value={`${highlight.credibility}`} />
        </Card>
      ))}
    </View>
  );
};

export const VaultAnnotationList = ({ items }: AnnotationListProps) => {
  const { theme } = useTheme();

  if (!items.length) {
    return <EmptyState message="暂无标注，先在实际任务中记录一次应用吧。" />;
  }

  return (
    <View style={styles.list}>
      {items.map((annotation) => (
        <Card key={annotation.id}>
          <View style={styles.headerRow}>
            <DirectionBadge label={annotation.direction_name} />
            <Text variant="caption" style={{ color: theme.colors.textMuted }}>
              {formatDate(annotation.noted_at)}
            </Text>
          </View>
          <Text variant="subtitle" style={{ marginBottom: 0 }}>
            {annotation.card_title}
          </Text>
          <Text style={{ color: theme.colors.textSecondary }}>{annotation.context}</Text>
        </Card>
      ))}
    </View>
  );
};

export const VaultCardList = ({ items }: CardListProps) => {
  const { theme } = useTheme();

  if (!items.length) {
    return <EmptyState message="暂未收录卡片，先在方向树中创建几张吧。" />;
  }

  return (
    <View style={styles.list}>
      {items.map((card) => {
        const meta = [
          card.skill_point_name ? `技能点：${card.skill_point_name}` : null,
          `类型：${card.card_type}`,
        ].filter(Boolean) as string[];

        return (
          <Card key={card.id}>
            <View style={styles.headerRow}>
              <DirectionBadge label={card.direction_name} />
              <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                {formatDate(card.updated_at)}
              </Text>
            </View>
            <Text variant="subtitle" style={{ marginBottom: 0 }}>
              {card.title}
            </Text>
            <View style={styles.metaWrap}>
              {meta.map((entry) => (
                <Text key={entry} variant="caption" style={{ color: theme.colors.textMuted }}>
                  {entry}
                </Text>
              ))}
            </View>
            <View style={styles.metricRow}>
              <MetricPill label="稳定度" value={card.stability.toFixed(2)} />
              <MetricPill label="优先级" value={card.priority.toFixed(2)} />
              {card.next_due ? <MetricPill label="下次到期" value={formatDate(card.next_due)} /> : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
};

export const VaultEvergreenList = ({ items }: EvergreenListProps) => {
  const { theme } = useTheme();

  if (!items.length) {
    return <EmptyState message="还没有沉淀的 Evergreen 笔记，保持训练并记录应用次数。" />;
  }

  return (
    <View style={styles.list}>
      {items.map((note) => (
        <Card key={note.id}>
          <View style={styles.headerRow}>
            <DirectionBadge label={note.direction_name} />
            <Text variant="caption" style={{ color: theme.colors.textMuted }}>
              稳定度 {note.stability.toFixed(2)}
            </Text>
          </View>
          <Text variant="subtitle" style={{ marginBottom: 0 }}>
            {note.title}
          </Text>
          <Text style={{ color: theme.colors.textSecondary }}>{note.summary}</Text>
          <View style={styles.metricRow}>
            <MetricPill label="应用次数" value={`${note.application_count}`} />
            {note.last_applied_at ? (
              <MetricPill label="最近应用" value={formatDate(note.last_applied_at)} />
            ) : null}
          </View>
        </Card>
      ))}
    </View>
  );
};

const MetricPill = ({ label, value }: { label: string; value: string }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text variant="caption" style={{ color: theme.colors.textMuted }}>
        {label}
      </Text>
      <Text variant="caption" style={{ color: theme.colors.textSecondary }}>
        {value}
      </Text>
    </View>
  );
};

const EmptyState = ({ message }: { message: string }) => {
  const { theme } = useTheme();

  return (
    <Card style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.colors.textMuted, textAlign: 'center' }}>{message}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    flexDirection: 'column',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
});

