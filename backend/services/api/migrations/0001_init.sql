-- Directions capture high-level themes a user is pursuing
CREATE TABLE IF NOT EXISTS directions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stage TEXT NOT NULL,
    quarterly_goal TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_directions_stage ON directions(stage);

-- Skill points live under a direction and capture mastery levels
CREATE TABLE IF NOT EXISTS skill_points (
    id TEXT PRIMARY KEY,
    direction_id TEXT NOT NULL,
    name TEXT NOT NULL,
    summary TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (direction_id) REFERENCES directions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_points_direction ON skill_points(direction_id);

-- Memory cards: smallest knowledge units (fact/concept/procedure/claim)
CREATE TABLE IF NOT EXISTS memory_cards (
    id TEXT PRIMARY KEY,
    direction_id TEXT NOT NULL,
    skill_point_id TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    card_type TEXT NOT NULL,
    stability REAL NOT NULL DEFAULT 0.1,
    relevance REAL NOT NULL DEFAULT 0.7,
    novelty REAL NOT NULL DEFAULT 0.5,
    priority REAL NOT NULL DEFAULT 0.5,
    next_due TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (direction_id) REFERENCES directions(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_point_id) REFERENCES skill_points(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_direction ON memory_cards(direction_id);
CREATE INDEX IF NOT EXISTS idx_cards_skill_point ON memory_cards(skill_point_id);
CREATE INDEX IF NOT EXISTS idx_cards_next_due ON memory_cards(next_due);

-- Evidence connects cards to their sources (documents, code, metrics)
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_uri TEXT,
    excerpt TEXT,
    credibility INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES memory_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evidence_card ON evidence(card_id);

-- Workouts capture daily training sessions and their items
CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    scheduled_for TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workouts_schedule ON workouts(scheduled_for);

CREATE TABLE IF NOT EXISTS workout_items (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    phase TEXT NOT NULL,
    result TEXT,
    due_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES memory_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workout_items_workout ON workout_items(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_items_card ON workout_items(card_id);

-- Tagging table to support quick filtering
CREATE TABLE IF NOT EXISTS card_tags (
    card_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (card_id, tag),
    FOREIGN KEY (card_id) REFERENCES memory_cards(id) ON DELETE CASCADE
);

-- Tracking card applications in real tasks
CREATE TABLE IF NOT EXISTS card_applications (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    context TEXT NOT NULL,
    noted_at TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES memory_cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_card_applications_card ON card_applications(card_id);
