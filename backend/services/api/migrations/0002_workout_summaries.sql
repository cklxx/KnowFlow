CREATE TABLE IF NOT EXISTS workout_summaries (
    workout_id TEXT PRIMARY KEY,
    completed_at TEXT NOT NULL,
    total_items INTEGER NOT NULL,
    pass_rate REAL NOT NULL,
    kv_delta REAL NOT NULL,
    udr REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workout_summaries_completed_at ON workout_summaries(completed_at);
