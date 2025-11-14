use std::path::PathBuf;

use crate::error::Result;
use tokio::fs;

#[derive(Clone, Debug)]
pub struct AssetStore {
    base_dir: PathBuf,
    static_prefix: String,
}

impl AssetStore {
    pub fn new<P, S>(base_dir: P, static_prefix: S) -> Self
    where
        P: Into<PathBuf>,
        S: Into<String>,
    {
        let mut prefix = static_prefix.into();
        if prefix.trim().is_empty() {
            prefix = "/static".to_string();
        }
        let prefix = prefix.trim().trim_end_matches('/').to_string();
        let normalized_prefix = if prefix.starts_with('/') {
            prefix
        } else {
            format!("/{prefix}")
        };

        Self {
            base_dir: base_dir.into(),
            static_prefix: normalized_prefix,
        }
    }

    pub fn base_dir(&self) -> &PathBuf {
        &self.base_dir
    }

    pub fn static_prefix(&self) -> &str {
        &self.static_prefix
    }

    async fn ensure_dir(&self, sub_dir: &str) -> Result<PathBuf> {
        let path = self.base_dir.join(sub_dir);
        fs::create_dir_all(&path).await?;
        Ok(path)
    }

    pub async fn write_transcript(
        &self,
        date_slug: &str,
        index: usize,
        content: &str,
    ) -> Result<String> {
        let dir = self.ensure_dir("transcripts").await?;
        let file_name = format!("{date_slug}-item-{index:02}.md");
        let path = dir.join(&file_name);
        fs::write(&path, content).await?;
        Ok(self.url_for("transcripts", &file_name))
    }

    pub async fn write_audio(&self, date_slug: &str, index: usize, bytes: &[u8]) -> Result<String> {
        let dir = self.ensure_dir("audio").await?;
        let file_name = format!("{date_slug}-item-{index:02}.mp3");
        let path = dir.join(&file_name);
        fs::write(&path, bytes).await?;
        Ok(self.url_for("audio", &file_name))
    }

    fn url_for(&self, sub_dir: &str, file_name: &str) -> String {
        format!("{}/{}/{}", self.static_prefix, sub_dir, file_name)
    }
}
