use std::time::Duration;

use anyhow::Context;
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

pub async fn connect(database_url: &str) -> anyhow::Result<SqlitePool> {
    SqlitePoolOptions::new()
        .max_connections(5)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
        .with_context(|| format!("failed to connect to database at {database_url}"))
}
