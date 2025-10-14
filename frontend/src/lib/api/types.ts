export type DirectionStage = 'explore' | 'shape' | 'attack' | 'stabilize';

export type Direction = {
  id: string;
  name: string;
  stage: DirectionStage;
  quarterly_goal: string | null;
  created_at: string;
  updated_at: string;
};

export type SkillLevel = 'unknown' | 'emerging' | 'working' | 'fluent';

export type SkillPoint = {
  id: string;
  direction_id: string;
  name: string;
  summary: string | null;
  level: SkillLevel;
  created_at: string;
  updated_at: string;
};

export type CardType = 'fact' | 'concept' | 'procedure' | 'claim';

export type MemoryCard = {
  id: string;
  direction_id: string;
  skill_point_id: string | null;
  title: string;
  body: string;
  card_type: CardType;
  stability: number;
  relevance: number;
  novelty: number;
  priority: number;
  next_due: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateDirectionPayload = {
  name: string;
  stage: DirectionStage;
  quarterly_goal?: string | null;
};

export type UpdateDirectionPayload = Partial<CreateDirectionPayload>;

export type CreateSkillPointPayload = {
  name: string;
  summary?: string | null;
  level?: SkillLevel;
};

export type UpdateSkillPointPayload = Partial<CreateSkillPointPayload>;

export type CreateMemoryCardPayload = {
  title: string;
  body: string;
  card_type: CardType;
  skill_point_id?: string | null;
  stability?: number;
  relevance?: number;
  novelty?: number;
  priority?: number;
  next_due?: string | null;
};

export type UpdateMemoryCardPayload = Partial<CreateMemoryCardPayload>;
