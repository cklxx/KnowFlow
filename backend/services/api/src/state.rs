use sqlx::SqlitePool;

use crate::services::llm::LlmClient;

#[derive(Clone)]
pub struct AppState {
    pool: SqlitePool,
    llm: LlmClient,
}

impl AppState {
    pub fn new(pool: SqlitePool, llm: LlmClient) -> Self {
        Self { pool, llm }
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    pub fn llm(&self) -> &LlmClient {
        &self.llm
    }
}
