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

export type WorkoutSegmentDirectionFocus = {
  direction_id: string;
  name: string;
  stage: DirectionStage;
  count: number;
  share: number;
  signals: string[];
};

export type WorkoutSegmentSkillFocus = {
  skill_point_id: string;
  name: string;
  level: SkillLevel;
  count: number;
  share: number;
  signals: string[];
};

export type WorkoutSegmentFocus = {
  headline: string;
  highlights: string[];
  direction_breakdown: WorkoutSegmentDirectionFocus[];
  skill_breakdown: WorkoutSegmentSkillFocus[];
};

export type WorkoutSegmentPlan = {
  phase: WorkoutPhase;
  focus: string | null;
  focus_details: WorkoutSegmentFocus | null;
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

export type WorkoutSummaryMetrics = {
  total_items: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  kv_delta: number;
  udr: number;
  recommended_focus: string | null;
  direction_breakdown: WorkoutSummaryDirectionBreakdown[];
  skill_breakdown: WorkoutSummarySkillBreakdown[];
};

export type WorkoutCompletionSummary = {
  workout_id: string;
  completed_at: string;
  updates: WorkoutCardProgress[];
  metrics: WorkoutSummaryMetrics;
  insights: string[];
};

export type WorkoutSummaryDirectionBreakdown = {
  direction_id: string;
  name: string;
  stage: DirectionStage;
  total: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  kv_delta: number;
  udr: number;
  avg_priority: number;
  share: number;
};

export type WorkoutSummarySkillBreakdown = {
  skill_point_id: string;
  name: string;
  level: SkillLevel;
  total: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  kv_delta: number;
  udr: number;
  avg_priority: number;
  share: number;
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
  mastery: {
    directions: ProgressDirectionMastery[];
    skill_gaps: ProgressSkillGap[];
  };
  retention: {
    retention_7d: number;
    retention_30d: number;
    retention_90d: number;
    trend: ProgressRetentionSample[];
  };
  streaks: {
    current: number;
    longest: number;
    last_completed_at: string | null;
  };
  applications: ProgressApplication[];
  recommendations: ProgressRecommendation[];
  momentum: ProgressMomentum;
};

export type ProgressDirectionMastery = {
  id: string;
  name: string;
  stage: DirectionStage;
  avg_skill_level: number;
  card_count: number;
  due_next_7d: number;
  recent_pass_rate: number;
};

export type ProgressSkillGap = {
  id: string;
  direction_id: string;
  direction_name: string;
  name: string;
  level: SkillLevel;
  card_count: number;
  due_next_7d: number;
  recent_fail_rate: number;
};

export type ProgressRecommendation = {
  headline: string;
  rationale: string;
};

export type ProgressApplication = {
  id: string;
  card_id: string;
  direction_id: string;
  direction_name: string;
  skill_point_id: string | null;
  skill_point_name: string | null;
  card_title: string;
  context: string;
  noted_at: string;
  impact_score: number;
};

export type ProgressRetentionSample = {
  date: string;
  pass_rate: number;
  total_reviews: number;
};

export type ProgressMomentum = {
  knowledge_velocity: ProgressTrendSeries;
  uncertainty_drop_rate: ProgressTrendSeries;
};

export type ProgressTrendSeries = {
  average_7d: number;
  average_30d: number;
  recent: ProgressTrendSample[];
};

export type ProgressTrendSample = {
  completed_at: string;
  value: number;
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

export type SearchResponse = {
  query: string;
  cards: SearchCardResult[];
  evidence: SearchEvidenceResult[];
  evergreen: SearchEvergreenResult[];
  applications: SearchApplicationResult[];
  directions: SearchDirectionResult[];
};

export type SearchCardResult = {
  id: string;
  title: string;
  body: string;
  card_type: CardType;
  priority: number;
  stability: number;
  next_due: string | null;
  direction_id: string;
  direction_name: string;
  skill_point_id: string | null;
  skill_point_name: string | null;
};

export type SearchEvidenceResult = {
  id: string;
  excerpt: string | null;
  source_type: string;
  source_uri: string | null;
  credibility: number;
  captured_at: string;
  card_id: string;
  card_title: string;
  direction_id: string;
  direction_name: string;
};

export type SearchEvergreenResult = {
  id: string;
  title: string;
  summary: string;
  stability: number;
  application_count: number;
  last_applied_at: string | null;
  direction_id: string;
  direction_name: string;
};

export type SearchApplicationResult = {
  id: string;
  context: string;
  noted_at: string;
  impact_score: number;
  card_id: string;
  card_title: string;
  direction_id: string;
  direction_name: string;
  skill_point_id: string | null;
  skill_point_name: string | null;
};

export type SearchDirectionResult = {
  id: string;
  name: string;
  stage: DirectionStage;
  quarterly_goal: string | null;
  card_count: number;
  skill_point_count: number;
};
