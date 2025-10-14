use std::net::SocketAddr;

use anyhow::Context;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub bind_address: SocketAddr,
    pub database_url: String,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let bind_address = std::env::var("BIND_ADDRESS")
            .unwrap_or_else(|_| "127.0.0.1:3000".to_string())
            .parse()
            .context("invalid BIND_ADDRESS")?;

        let database_url =
            std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://./knowflow.db".to_string());

        Ok(Self {
            bind_address,
            database_url,
        })
    }
}
