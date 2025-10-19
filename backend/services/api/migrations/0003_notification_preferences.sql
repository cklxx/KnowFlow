CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    daily_reminder_enabled INTEGER NOT NULL DEFAULT 1,
    daily_reminder_time TEXT NOT NULL DEFAULT '21:00',
    daily_reminder_target TEXT NOT NULL DEFAULT 'today',
    due_reminder_enabled INTEGER NOT NULL DEFAULT 1,
    due_reminder_time TEXT NOT NULL DEFAULT '20:30',
    due_reminder_target TEXT NOT NULL DEFAULT 'review',
    remind_before_due_minutes INTEGER NOT NULL DEFAULT 45,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO notification_preferences (
    id,
    daily_reminder_enabled,
    daily_reminder_time,
    daily_reminder_target,
    due_reminder_enabled,
    due_reminder_time,
    due_reminder_target,
    remind_before_due_minutes
)
SELECT 1, 1, '21:00', 'today', 1, '20:30', 'review', 45
WHERE NOT EXISTS (SELECT 1 FROM notification_preferences WHERE id = 1);
