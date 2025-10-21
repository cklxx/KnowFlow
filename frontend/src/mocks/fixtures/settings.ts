import type {
  SettingsCardExport,
  SettingsCardTagExport,
  SettingsEvidenceExport,
  SettingsExport,
  SettingsSkillPointExport,
  SettingsSummary,
} from '@api';

import { listAllCards, listAllEvidenceRecords, listAllSkillPoints, listDirections } from './directions';

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
