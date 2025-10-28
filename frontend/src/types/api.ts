// Core API types based on backend domain models aligned with the PRD

// Direction Types
export type DirectionStage = 'explore' | 'shape' | 'attack' | 'stabilize';

export interface Direction {
  id: string;
  name: string;
  stage: DirectionStage;
  quarterly_goal: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDirectionRequest {
  name: string;
  stage: DirectionStage;
  quarterly_goal?: string | null;
}

export interface UpdateDirectionRequest {
  name?: string;
  stage?: DirectionStage;
  quarterly_goal?: string | null;
}

// Skill Point Types
export type SkillLevel = 'unknown' | 'emerging' | 'working' | 'fluent';

export interface SkillPoint {
  id: string;
  direction_id: string;
  name: string;
  summary: string | null;
  level: SkillLevel;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillPointRequest {
  direction_id: string;
  name: string;
  summary?: string | null;
  level?: SkillLevel;
}

export interface UpdateSkillPointRequest {
  name?: string;
  summary?: string | null;
  level?: SkillLevel;
}

// Memory Card Types
export type CardType = 'fact' | 'concept' | 'procedure' | 'claim';

export interface MemoryCard {
  id: string;
  direction_id: string;
  skill_point_id: string | null;
  title: string;
  body: string;
  card_type: CardType;
  created_at: string;
  updated_at: string;
}

export interface CreateCardRequest {
  direction_id: string;
  title: string;
  body: string;
  card_type: CardType;
  skill_point_id?: string | null;
}

export interface UpdateCardRequest {
  title?: string;
  body?: string;
  card_type?: CardType;
  skill_point_id?: string | null;
}

// Generic API error shape
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Evidence Types
export interface Evidence {
  id: string;
  content: string;
  source_url: string | null;
  created_at: string;
}

export interface CreateEvidenceRequest {
  content: string;
  source_url?: string;
}

// Today Workout Types
export interface WorkoutCard {
  id: string;
  direction_id: string;
  direction_name: string;
  title: string;
  body: string;
  card_type: CardType;
}

export interface WorkoutResponse {
  cards: WorkoutCard[];
  total_due: number;
}

export interface SubmitReviewRequest {
  card_id: string;
  quality: number; // 0-5 scale
}

// Progress Types
export interface ProgressDirectionMetric {
  direction_id: string;
  direction_name: string;
  reviewed_today: number;
  due_cards: number;
}

export interface ProgressResponse {
  streak: number;
  cards_reviewed_today: number;
  total_cards: number;
  direction_metrics: ProgressDirectionMetric[];
}

// Intelligence/AI Types
export interface CardDraft {
  title: string;
  body: string;
  card_type?: CardType;
  evidence_content?: string;
}

export interface IntelligenceRequest {
  direction_id: string;
  user_input: string;
  conversation_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface IntelligenceResponse {
  message: string;
  card_drafts?: CardDraft[];
}

// Search Types
export interface SearchRequest {
  query: string;
  direction_id?: string;
  limit?: number;
}

export interface SearchResult {
  cards: MemoryCard[];
  total: number;
}

// Tree Types
export interface TreeCardSummary {
  id: string;
  skill_point_id: string | null;
  title: string;
  body: string;
  card_type: CardType;
}

export interface TreeSkillPointBranch {
  skill_point: SkillPoint;
  card_count: number;
  cards: TreeCardSummary[];
}

export interface TreeDirectionMetrics {
  skill_point_count: number;
  card_count: number;
}

export interface TreeDirectionBranch {
  direction: Direction;
  metrics: TreeDirectionMetrics;
  skill_points: TreeSkillPointBranch[];
  orphan_cards: TreeCardSummary[];
}

export interface TreeSnapshot {
  directions: TreeDirectionBranch[];
  generated_at: string;
}

// Vault Types
export interface VaultCard {
  id: string;
  direction_id: string;
  direction_name: string;
  title: string;
  body: string;
  card_type: CardType;
  created_at: string;
  next_review_at: string | null;
  review_count: number;
}

export interface VaultResponse {
  cards: VaultCard[];
  total: number;
  page: number;
  page_size: number;
}

export interface VaultFilter {
  direction_id?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'next_review_at' | 'review_count';
  sort_order?: 'asc' | 'desc';
}

// Settings Types
export interface NotificationPreferences {
  email_reviews: boolean;
  email_digest: boolean;
  push_reviews: boolean;
  weekly_summary: boolean;
}

export interface SettingsExport {
  exported_at: string;
  directions: Direction[];
  skill_points: SkillPoint[];
  cards: MemoryCard[];
  evidence: Evidence[];
  card_tags: Array<{
    id: string;
    name: string;
  }>;
}

// Import Types
export interface ImportPreviewRequest {
  direction_id: string;
  content: string;
}

export interface ImportPreviewResponse {
  clusters: Array<{
    theme: string;
    cards: CardDraft[];
  }>;
  total_cards: number;
}

export interface ImportConfirmRequest {
  direction_id: string;
  cards: Array<{
    title: string;
    body: string;
    card_type?: CardType;
    evidence_content?: string;
    skill_point_id?: string | null;
  }>;
}
