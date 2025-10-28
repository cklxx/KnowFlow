import type { CardType, DirectionStage, SkillLevel } from '@api';

export const stageOptions: Array<{ value: DirectionStage; label: string; description: string }> = [
  { value: 'explore', label: 'Explore', description: 'Research and collect resources' },
  { value: 'shape', label: 'Shape', description: 'Define boundaries and core skills' },
  { value: 'attack', label: 'Attack', description: 'Deliberate practice and card creation' },
  { value: 'stabilize', label: 'Stabilize', description: 'Review and refine long-term knowledge' },
];

export const skillLevels: Array<{ value: SkillLevel; label: string }> = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'emerging', label: 'Emerging' },
  { value: 'working', label: 'Working' },
  { value: 'fluent', label: 'Fluent' },
];

export const cardTypes: Array<{ value: CardType; label: string; helper: string }> = [
  { value: 'fact', label: 'Fact', helper: 'Atomic data, definitions, or specific values' },
  { value: 'concept', label: 'Concept', helper: 'Relationships and frameworks' },
  { value: 'procedure', label: 'Procedure', helper: 'Step-by-step actions or workflows' },
  { value: 'claim', label: 'Claim', helper: 'Arguments with supporting evidence' },
];

export const initialDirectionForm = {
  name: '',
  stage: stageOptions[0]!.value,
  quarterly_goal: '',
};

export const initialSkillForm = {
  name: '',
  summary: '',
  level: skillLevels[0]!.value,
};

export const initialCardForm = {
  title: '',
  body: '',
  card_type: cardTypes[0]!.value,
  skill_point_id: 'none',
};
