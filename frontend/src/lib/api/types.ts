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

export type MemoryCardDraft = {
  skill_point_id: string | null;
  title: string;
  body: string;
  card_type: CardType;
  stability: number | null;
  relevance: number | null;
  novelty: number | null;
  priority: number | null;
  next_due: string | null;
};

export type GeneratedCardDraft = {
  draft: MemoryCardDraft;
  rationale: string;
  confidence: number;
};

export type ImportSourceKind = 'url' | 'markdown' | 'text' | 'code';

export type ImportPreviewMaterial = {
  id: string;
  title: string;
  snippet: string;
  kind: string;
  source_url: string | null;
  tags: string[];
};

export type ImportPreviewCluster = {
  id: string;
  topic: string;
  summary: string;
  materials: ImportPreviewMaterial[];
  drafts: GeneratedCardDraft[];
};

export type ImportPreview = {
  clusters: ImportPreviewCluster[];
};

export type ImportSourceInput = {
  title?: string;
  content: string;
  url?: string;
  tags?: string[];
  kind?: ImportSourceKind;
};

export type ImportPreviewParams = {
  directionName?: string;
  language?: string;
  desiredCardsPerCluster?: number;
  sources: ImportSourceInput[];
};

export type Evidence = {
  id: string;
  card_id: string;
  source_type: string;
  source_uri: string | null;
  excerpt: string | null;
  credibility: number;
  created_at: string;
};

export type NewEvidenceInput = {
  source_type: string;
  source_uri?: string | null;
  excerpt?: string | null;
  credibility?: number | null;
};

export type WorkoutPhase = 'quiz' | 'apply' | 'review';

export type WorkoutItemPlan = {
  item_id: string;
  card: MemoryCard;
  sequence: number;
};

export type WorkoutSegmentPlan = {
  phase: WorkoutPhase;
  items: WorkoutItemPlan[];
};

export type WorkoutTotals = {
  total_cards: number;
  quiz: number;
  apply: number;
  review: number;
};

export type TodayWorkoutPlan = {
  workout_id: string;
  scheduled_for: string;
  generated_at: string;
  segments: WorkoutSegmentPlan[];
  totals: WorkoutTotals;
};

export type WorkoutResultKind = 'pass' | 'fail';

export type WorkoutCardProgress = {
  card_id: string;
  result: WorkoutResultKind;
  stability: number;
  priority: number;
  next_due: string | null;
};

export type WorkoutCompletionSummary = {
  workout_id: string;
  completed_at: string;
  updates: WorkoutCardProgress[];
};

export type SettingsSummary = {
  data_path: string | null;
  database_size_bytes: number;
  direction_count: number;
  skill_point_count: number;
  card_count: number;
  evidence_count: number;
  workout_count: number;
  last_workout_completed_at: string | null;
};

export type SettingsDirectionExport = {
  id: string;
  name: string;
  stage: DirectionStage;
  quarterly_goal: string | null;
  created_at: string;
  updated_at: string;
};

export type SettingsSkillPointExport = {
  id: string;
  direction_id: string;
  name: string;
  summary: string | null;
  level: SkillLevel;
  created_at: string;
  updated_at: string;
};

export type SettingsCardExport = {
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

export type SettingsEvidenceExport = {
  id: string;
  card_id: string;
  source_type: string;
  source_uri: string | null;
  excerpt: string | null;
  credibility: number;
  created_at: string;
};

export type SettingsCardTagExport = {
  card_id: string;
  tag: string;
};

export type SettingsWorkoutExport = {
  id: string;
  scheduled_for: string;
  completed_at: string | null;
  status: string;
  payload: string;
  created_at: string;
  updated_at: string;
};

export type SettingsWorkoutItemExport = {
  id: string;
  workout_id: string;
  card_id: string;
  sequence: number;
  phase: WorkoutPhase;
  result: WorkoutResultKind | null;
  due_at: string | null;
  created_at: string;
};

export type SettingsCardApplicationExport = {
  id: string;
  card_id: string;
  context: string;
  noted_at: string;
};

export type SettingsExport = {
  directions: SettingsDirectionExport[];
  skill_points: SettingsSkillPointExport[];
  cards: SettingsCardExport[];
  evidence: SettingsEvidenceExport[];
  card_tags: SettingsCardTagExport[];
  workouts: SettingsWorkoutExport[];
  workout_items: SettingsWorkoutItemExport[];
  applications: SettingsCardApplicationExport[];
};

export type OnboardingSkillSeed = {
  name: string;
  summary?: string | null;
  level?: SkillLevel | null;
};

export type OnboardingCardSeed = {
  title: string;
  body: string;
  card_type: CardType;
  skill_point_name?: string | null;
  stability?: number | null;
  relevance?: number | null;
  novelty?: number | null;
  priority?: number | null;
  next_due?: string | null;
};

export type OnboardingDirectionSeed = {
  name: string;
  stage: DirectionStage;
  quarterly_goal?: string | null;
  skills: OnboardingSkillSeed[];
  cards: OnboardingCardSeed[];
};

export type OnboardingBootstrapPayload = {
  directions: OnboardingDirectionSeed[];
};

export type OnboardingDirectionBundle = {
  direction: Direction;
  skill_points: SkillPoint[];
  cards: MemoryCard[];
};

export type OnboardingBootstrapResult = {
  directions: OnboardingDirectionBundle[];
  today_plan: TodayWorkoutPlan | null;
};

export type ProgressSnapshot = {
  totals: {
    total_cards: number;
    active_directions: number;
    due_today: number;
    overdue: number;
    avg_stability: number;
  };
  activity: {
    workouts_completed_7d: number;
    new_cards_7d: number;
    applications_logged_7d: number;
  };
};

export type TreeCardSummary = {
  id: string;
  skill_point_id: string | null;
  title: string;
  body: string;
  card_type: CardType;
  stability: number;
  relevance: number;
  novelty: number;
  priority: number;
  next_due: string | null;
  evidence_count: number;
  application_count: number;
  last_applied_at: string | null;
};

export type TreeSkillPointBranch = {
  skill_point: SkillPoint;
  card_count: number;
  level_score: number;
  cards: TreeCardSummary[];
};

export type TreeDirectionMetrics = {
  skill_point_count: number;
  card_count: number;
  fluent_points: number;
  average_stability: number;
  upcoming_reviews: number;
};

export type TreeDirectionBranch = {
  direction: Direction;
  metrics: TreeDirectionMetrics;
  skill_points: TreeSkillPointBranch[];
  orphan_cards: TreeCardSummary[];
};

export type TreeSnapshot = {
  directions: TreeDirectionBranch[];
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

export type VaultHighlight = {
  id: string;
  direction_id: string;
  direction_name: string;
  card_id: string;
  card_title: string;
  source_type: string;
  source_uri: string | null;
  excerpt: string | null;
  credibility: number;
  captured_at: string;
};

export type VaultAnnotation = {
  id: string;
  direction_id: string;
  direction_name: string;
  card_id: string;
  card_title: string;
  context: string;
  noted_at: string;
};

export type VaultCardSummary = {
  id: string;
  direction_id: string;
  direction_name: string;
  skill_point_id: string | null;
  skill_point_name: string | null;
  title: string;
  card_type: string;
  stability: number;
  priority: number;
  next_due: string | null;
  updated_at: string;
};

export type VaultEvergreenNote = {
  id: string;
  direction_id: string;
  direction_name: string;
  title: string;
  summary: string;
  stability: number;
  application_count: number;
  last_applied_at: string | null;
};

export type VaultSnapshot = {
  highlights: VaultHighlight[];
  annotations: VaultAnnotation[];
  cards: VaultCardSummary[];
  evergreen: VaultEvergreenNote[];
};
