import type { DirectionStage, SkillLevel } from '@api';

const DIRECTION_STAGE_LABELS: Record<DirectionStage, string> = {
  explore: '探索',
  shape: '成型',
  attack: '攻坚',
  stabilize: '固化',
};

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  unknown: '未评估',
  emerging: '起步',
  working: '攻坚',
  fluent: '固化',
};

export const formatDirectionStageLabel = (stage: DirectionStage): string =>
  DIRECTION_STAGE_LABELS[stage] ?? stage;

export const formatSkillLevelLabel = (level: SkillLevel): string =>
  SKILL_LEVEL_LABELS[level] ?? level;
