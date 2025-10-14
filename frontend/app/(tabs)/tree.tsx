import { useEffect, useState } from 'react';

import { DirectionList, MemoryCardList, SkillPointList } from '@/features/directions/components';
import { useDirections } from '@/features/directions/hooks';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { View, StyleSheet } from 'react-native';

export default function TreeScreen() {
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | undefined>(undefined);
  const { data: directions } = useDirections();

  useEffect(() => {
    if (!directions?.length) {
      setSelectedDirectionId(undefined);
      return;
    }

    if (!selectedDirectionId) {
      setSelectedDirectionId(directions[0].id);
      return;
    }

    if (!directions.some((direction) => direction.id === selectedDirectionId)) {
      setSelectedDirectionId(directions[0].id);
    }
  }, [directions, selectedDirectionId]);

  return (
    <Screen>
      <Text variant="title">Direction Tree</Text>
      <View style={styles.container}>
        <View style={styles.sidebar}>
          <Text variant="subtitle">Directions</Text>
          <DirectionList onSelect={setSelectedDirectionId} selectedId={selectedDirectionId} />
        </View>
        <View style={styles.content}>
          <Text variant="subtitle">Skill Points</Text>
          <SkillPointList directionId={selectedDirectionId} />
          <Text variant="subtitle" style={styles.sectionHeading}>
            Memory Cards
          </Text>
          <MemoryCardList directionId={selectedDirectionId} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    gap: 16,
  },
  sidebar: {
    flex: 1,
  },
  content: {
    flex: 2,
    gap: 16,
  },
  sectionHeading: {
    marginTop: 16,
  },
});
