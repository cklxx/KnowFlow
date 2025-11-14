use crate::clients::volcengine::VolcengineClient;
use crate::error::Result;
use base64::Engine;

#[derive(Clone)]
pub struct TtsService {
    client: VolcengineClient,
}

#[derive(Clone, Debug)]
pub struct TtsOutput {
    pub bytes: Vec<u8>,
    pub base64: String,
}

impl TtsService {
    pub fn new(client: VolcengineClient) -> Self {
        Self { client }
    }

    pub async fn synthesize(&self, text: &str) -> Result<TtsOutput> {
        let audio = self.client.text_to_speech(text).await?;
        let base64 = base64::engine::general_purpose::STANDARD.encode(&audio);
        Ok(TtsOutput {
            bytes: audio,
            base64,
        })
    }
}
