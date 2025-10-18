import type {
  NotificationPreferences,
  SettingsCardApplicationExport,
  SettingsCardExport,
  SettingsCardTagExport,
  SettingsExport,
  SettingsSkillPointExport,
  SettingsSummary,
  SettingsWorkoutExport,
  SettingsWorkoutItemExport,
} from '@api';

import {
  listAllCards,
  listAllEvidenceRecords,
  listAllSkillPoints,
  listDirections,
} from './directions';
import { mockTodayWorkout, mockWorkoutSummary } from './todayWorkout';

const buildDirectionExports = () =>
  listDirections().map((direction) => ({
    id: direction.id,
    name: direction.name,
    stage: direction.stage,
    quarterly_goal: direction.quarterly_goal,
    created_at: direction.created_at,
    updated_at: direction.updated_at,
  }));

const buildSkillPointExports = (): SettingsSkillPointExport[] =>
  listAllSkillPoints().map((skillPoint) => ({
    id: skillPoint.id,
    direction_id: skillPoint.direction_id,
    name: skillPoint.name,
    summary: skillPoint.summary,
    level: skillPoint.level,
    created_at: skillPoint.created_at,
    updated_at: skillPoint.updated_at,
  }));

const buildCardExports = (): SettingsCardExport[] =>
  listAllCards().map((card) => ({
    id: card.id,
    direction_id: card.direction_id,
    skill_point_id: card.skill_point_id,
    title: card.title,
    body: card.body,
    card_type: card.card_type,
    stability: card.stability ?? 0.3,
    relevance: card.relevance ?? 0.6,
    novelty: card.novelty ?? 0.3,
    priority: card.priority ?? 0.5,
    next_due: card.next_due ?? null,
    created_at: card.created_at,
    updated_at: card.updated_at,
  }));

const buildEvidenceExports = () =>
  listAllEvidenceRecords().map((evidence) => ({
    id: evidence.id,
    card_id: evidence.card_id,
    source_type: evidence.source_type,
    source_uri: evidence.source_uri,
    excerpt: evidence.excerpt,
    credibility: evidence.credibility,
    created_at: evidence.created_at,
  }));

const buildCardTags = (cards: SettingsCardExport[]): SettingsCardTagExport[] =>
  cards.flatMap((card) => {
    const tags: SettingsCardTagExport[] = [
      { card_id: card.id, tag: `direction:${card.direction_id}` },
      { card_id: card.id, tag: `type:${card.card_type}` },
    ];
    if (card.priority >= 0.75) {
      tags.push({ card_id: card.id, tag: 'priority:high' });
    }
    return tags;
  });

const buildWorkoutExport = (): SettingsWorkoutExport => ({
  id: mockTodayWorkout.workout_id,
  scheduled_for: mockTodayWorkout.scheduled_for,
  completed_at: mockWorkoutSummary.completed_at,
  status: 'completed',
  payload: JSON.stringify(mockTodayWorkout),
  created_at: mockTodayWorkout.generated_at,
  updated_at: mockWorkoutSummary.completed_at,
});

const buildWorkoutItems = (): SettingsWorkoutItemExport[] =>
  mockTodayWorkout.segments.flatMap((segment) =>
    segment.items.map((item) => ({
      id: `workout-item-${item.item_id}`,
      workout_id: mockTodayWorkout.workout_id,
      card_id: item.card.id,
      sequence: item.sequence,
      phase: segment.phase,
      result: segment.phase === 'quiz' ? 'pass' : null,
      due_at: item.card.next_due,
      created_at: mockTodayWorkout.generated_at,
    })),
  );

const buildApplications = (cards: SettingsCardExport[]): SettingsCardApplicationExport[] =>
  cards.slice(0, 3).map((card, index) => ({
    id: `app-export-${index + 1}`,
    card_id: card.id,
    context: `在真实项目中使用卡片「${card.title}」支撑一次决策。`,
    noted_at: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
  }));

export const buildSettingsSummary = (): SettingsSummary => {
  const directions = listDirections();
  const skillPoints = listAllSkillPoints();
  const cards = listAllCards();
  const evidence = listAllEvidenceRecords();

  return {
    data_path: '/Users/demo/KnowFlow/knowflow.sqlite3',
    database_size_bytes: 12_582_912 + cards.length * 1_024,
    direction_count: directions.length,
    skill_point_count: skillPoints.length,
    card_count: cards.length,
    evidence_count: evidence.length,
    workout_count: 18,
    last_workout_completed_at: mockWorkoutSummary.completed_at,
  };
};

export const buildSettingsExport = (): SettingsExport => {
  const directions = buildDirectionExports();
  const skillPoints = buildSkillPointExports();
  const cards = buildCardExports();
  const evidence = buildEvidenceExports();

  return {
    directions,
    skill_points: skillPoints,
    cards,
    evidence,
    card_tags: buildCardTags(cards),
    workouts: [buildWorkoutExport()],
    workout_items: buildWorkoutItems(),
    applications: buildApplications(cards),
  };
};

const defaultNotificationPreferences: NotificationPreferences = {
  daily_reminder_enabled: true,
  daily_reminder_time: '21:00',
  daily_reminder_target: 'today',
  due_reminder_enabled: true,
  due_reminder_time: '20:30',
  due_reminder_target: 'review',
  remind_before_due_minutes: 45,
  updated_at: new Date().toISOString(),
};

let notificationPreferencesState: NotificationPreferences = {
  ...defaultNotificationPreferences,
};

export const getNotificationPreferences = (): NotificationPreferences => ({
  ...notificationPreferencesState,
});

export const setNotificationPreferences = (
  payload: Omit<NotificationPreferences, 'updated_at'>,
): NotificationPreferences => {
  notificationPreferencesState = {
    ...payload,
    updated_at: new Date().toISOString(),
  };
  return getNotificationPreferences();
};

export const resetNotificationPreferences = () => {
  notificationPreferencesState = {
    ...defaultNotificationPreferences,
    updated_at: new Date().toISOString(),
  };
};
