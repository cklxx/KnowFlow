use std::{path::Path, str::FromStr, time::Duration};

use anyhow::Context;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    SqlitePool,
};

pub async fn connect(database_url: &str) -> anyhow::Result<SqlitePool> {
    ensure_sqlite_parent_exists(database_url)?;

    let options = SqliteConnectOptions::from_str(database_url)
        .with_context(|| format!("invalid sqlite url: {database_url}"))?
        .create_if_missing(true);

    SqlitePoolOptions::new()
        .max_connections(5)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect_with(options)
        .await
        .with_context(|| format!("failed to connect to database at {database_url}"))
}

fn ensure_sqlite_parent_exists(database_url: &str) -> anyhow::Result<()> {
    if let Some(path) = database_path(database_url) {
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent).with_context(|| {
                    format!("failed to create parent directory for {database_url}")
                })?;
            }
        }
    }

    Ok(())
}

fn database_path(database_url: &str) -> Option<&Path> {
    if let Some(path) = database_url.strip_prefix("sqlite://") {
        if path.starts_with(':') {
            return None;
        }
        let path = path.split('?').next().unwrap_or(path);
        return Some(Path::new(path));
    }

    None
}
