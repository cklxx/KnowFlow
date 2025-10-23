import type {
  SettingsCardExport,
  SettingsCardTagExport,
  SettingsEvidenceExport,
  SettingsExport,
  SettingsSkillPointExport,
  SettingsSummary,
  NotificationPreferences,
  UpdateNotificationPreferencesPayload,
} from '@api';

import { listAllCards, listAllEvidenceRecords, listAllSkillPoints, listDirections } from './directions';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  daily_reminder_enabled: true,
  daily_reminder_time: '20:30',
  daily_reminder_target: 'today',
  due_reminder_enabled: true,
  due_reminder_time: '18:45',
  due_reminder_target: 'review',
  remind_before_due_minutes: 45,
};

let notificationPreferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };

const cloneNotificationPreferences = (prefs: NotificationPreferences): NotificationPreferences => ({ ...prefs });

const isValidTime = (value: string) => {
  const timePattern = /^(\d{2}):(\d{2})$/;
  const match = timePattern.exec(value);
  if (!match) {
    return false;
  }
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
};

const assertReminderTarget = (
  value: NotificationPreferences['daily_reminder_target'],
): NotificationPreferences['daily_reminder_target'] => {
  if (value !== 'today' && value !== 'review') {
    throw new Error('Invalid reminder target');
  }
  return value;
};

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
    created_at: card.created_at,
    updated_at: card.updated_at,
  }));

const buildEvidenceExports = (): SettingsEvidenceExport[] =>
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
    if (card.skill_point_id) {
      tags.push({ card_id: card.id, tag: `skill_point:${card.skill_point_id}` });
    }
    return tags;
  });

export const buildSettingsSummary = (): SettingsSummary => {
  const directions = listDirections();
  const skillPoints = listAllSkillPoints();
  const cards = listAllCards();

  return {
    data_path: '/Users/demo/KnowFlow/knowflow.sqlite3',
    database_size_bytes: 12_582_912 + cards.length * 1_024,
    direction_count: directions.length,
    skill_point_count: skillPoints.length,
    card_count: cards.length,
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
  };
};

export const getNotificationPreferences = (): NotificationPreferences =>
  cloneNotificationPreferences(notificationPreferences);

export const updateNotificationPreferencesRecord = (
  payload: UpdateNotificationPreferencesPayload,
): NotificationPreferences => {
  const next = { ...notificationPreferences };

  if (payload.daily_reminder_enabled !== undefined) {
    next.daily_reminder_enabled = payload.daily_reminder_enabled;
  }
  if (payload.daily_reminder_time !== undefined) {
    const time = payload.daily_reminder_time.trim();
    if (!isValidTime(time)) {
      throw new Error('Invalid daily reminder time');
    }
    next.daily_reminder_time = time;
  }
  if (payload.daily_reminder_target !== undefined) {
    next.daily_reminder_target = assertReminderTarget(payload.daily_reminder_target);
  }

  if (payload.due_reminder_enabled !== undefined) {
    next.due_reminder_enabled = payload.due_reminder_enabled;
  }
  if (payload.due_reminder_time !== undefined) {
    const time = payload.due_reminder_time.trim();
    if (!isValidTime(time)) {
      throw new Error('Invalid due reminder time');
    }
    next.due_reminder_time = time;
  }
  if (payload.due_reminder_target !== undefined) {
    next.due_reminder_target = assertReminderTarget(payload.due_reminder_target);
  }

  if (payload.remind_before_due_minutes !== undefined) {
    const value = payload.remind_before_due_minutes;
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Invalid remind_before_due_minutes');
    }
    next.remind_before_due_minutes = Math.floor(value);
  }

  notificationPreferences = next;
  return getNotificationPreferences();
};
