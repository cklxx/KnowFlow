// Core API types based on backend domain models

// Direction Types
export interface Direction {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDirectionRequest {
  name: string;
  description?: string;
}

export interface UpdateDirectionRequest {
  name?: string;
  description?: string;
}

// Memory Card Types
export interface MemoryCard {
  id: string;
  direction_id: string;
  question: string;
  answer: string;
  evidence_ids: string[];
  created_at: string;
  updated_at: string;
  next_review_at: string | null;
  review_count: number;
  ease_factor: number;
  interval_days: number;
}

export interface CreateCardRequest {
  direction_id: string;
  question: string;
  answer: string;
  evidence_ids?: string[];
}

export interface UpdateCardRequest {
  question?: string;
  answer?: string;
  evidence_ids?: string[];
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

// Skill Point Types
export interface SkillPoint {
  id: string;
  direction_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillPointRequest {
  direction_id: string;
  name: string;
  description?: string;
  parent_id?: string;
}

// Today Workout Types
export interface WorkoutCard {
  id: string;
  direction_id: string;
  question: string;
  answer: string;
  evidence_ids: string[];
}

export interface WorkoutResponse {
  cards: WorkoutCard[];
  total_due: number;
}

export interface SubmitReviewRequest {
  card_id: string;
  quality: number; // 0-5 scale
}

// Intelligence/AI Types
export interface CardDraft {
  question: string;
  answer: string;
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
export interface TreeNode {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  card_count: number;
  children: TreeNode[];
}

export interface TreeSnapshot {
  direction_id: string;
  direction_name: string;
  root_nodes: TreeNode[];
  total_cards: number;
}

// Vault Types
export interface VaultCard {
  id: string;
  direction_id: string;
  direction_name: string;
  question: string;
  answer: string;
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
    question: string;
    answer: string;
    evidence_content?: string;
  }>;
}

// Onboarding Types
export interface OnboardingBootstrapResponse {
  direction_id: string;
  sample_cards: MemoryCard[];
}

// Progress Types
export interface ProgressStats {
  direction_id: string;
  direction_name: string;
  total_cards: number;
  cards_due_today: number;
  cards_reviewed_today: number;
  total_reviews: number;
  average_ease_factor: number;
  mastery_percentage: number;
}

export interface ProgressResponse {
  stats: ProgressStats[];
  overall_cards: number;
  overall_reviews: number;
}

// Settings Types
export interface NotificationPreferences {
  enabled: boolean;
  daily_reminder_time: string | null;
  reminder_days: number[];
}

export interface SettingsExport {
  directions: Direction[];
  cards: MemoryCard[];
  evidence: Evidence[];
  skill_points: SkillPoint[];
  exported_at: string;
}

// Common API Response Types
export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}
