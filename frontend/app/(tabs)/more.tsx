import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, Screen, Text } from '@/ui/components';
import { ProgressOverview } from '@/features/progress';
import { useTheme } from '@/providers';

export default function MoreScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.sectionHeader}>
            <Text variant="title">快速引导</Text>
            <Text variant="caption">30 分钟完成方向、技能点与首批卡片。</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/onboarding')}
            style={({ pressed }) => [
              styles.actionButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceAlt,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>开始 Onboarding</Text>
            <Text variant="caption" style={{ color: theme.colors.textMuted }}>
              系统将指引你写入方向、技能与训练计划
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/import')}
            style={({ pressed }) => [
              styles.actionButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceAlt,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>导入材料</Text>
            <Text variant="caption" style={{ color: theme.colors.textMuted }}>
              粘贴链接或笔记，自动整理主题并生成卡片草稿
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.actionButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceAlt,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>设置与导出</Text>
            <Text variant="caption" style={{ color: theme.colors.textMuted }}>
              查看数据目录并生成 JSON 备份快照
            </Text>
          </Pressable>
        </Card>
        <View style={styles.sectionHeader}>
          <Text variant="title">Progress</Text>
          <Text variant="caption">每日训练、卡片与应用情况一目了然。</Text>
        </View>
        <ProgressOverview />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  actionButton: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    gap: 6,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
