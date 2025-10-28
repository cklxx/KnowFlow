import type { CardType, SkillLevel } from '@api';
import { cardTypes, skillLevels } from './constants';

export const getCardTypeLabel = (value: CardType) =>
  cardTypes.find((type) => type.value === value)?.label ?? value;

export const getSkillLevelLabel = (value: SkillLevel) =>
  skillLevels.find((level) => level.value === value)?.label ?? value;
