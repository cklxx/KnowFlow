import { expect, test } from '@playwright/test';

const digestResponse = {
  date: '2024-06-01',
  intro: 'OpenAI 正式发布 GPT-5，多模态推理能力全面升级。',
  one_minute_brief: '新模型重点强化了复杂任务的推理稳定性，并提供企业级安全落地方案。',
  items: [
    {
      title: 'OpenAI 发布 GPT-5',
      headline: '多模态推理与企业安全方案同步上线',
      text_summary: 'GPT-5 在推理和多模态处理上显著增强，OpenAI 推出企业安全套件帮助快速落地。',
      source_url: 'https://example.com/openai-gpt5',
      transcript_url: 'https://example.com/openai-gpt5-transcript',
      audio_url: 'https://example.com/audio/gpt5.mp3',
      audio_base64: null,
      published_at: '2024-06-01T08:00:00Z',
      happened: ['OpenAI 宣布 GPT-5 正式对外发布', '新模型原生支持图像、语音与文本的联合推理'],
      impact: ['大模型推理能力进一步降低企业复杂任务成本', '多模态能力让产品团队能快速落地 AI 助理'],
      actions: ['评估 GPT-5 API 对现有产品的提升空间', '安排安全团队参与企业套件的 PoC'],
      core_insights: ['推理可靠性比模型参数更关键', '企业落地需要安全治理工具的配套'],
      info_checks: ['确认 GPT-5 企业版的 SLA 与合规条款', '与供应商核实成本模型'],
      more_thoughts: ['观察微软与 Google 是否会同步推出竞品', '关注国内大模型在多模态上的追赶速度'],
      key_questions: [
        {
          question: 'GPT-5 相比上一代的最核心提升是什么？',
          answer: '复杂任务的多步推理稳定性大幅提升，错误率显著降低。',
          follow_up_question: '这是否意味着我们可以把高价值业务流程交给大模型？',
          follow_up_answer: '可以引入试点，但仍需配合人工审核与细粒度的安全策略。'
        },
        {
          question: '企业安全套件包含哪些能力？',
          answer: '提供数据隔离、访问控制、审计追踪与敏感信息清洗。',
          follow_up_question: null,
          follow_up_answer: null
        }
      ]
    }
  ]
};

test.describe('Daily digest experience', () => {
  test('renders digest content with multi-round Q&A', async ({ page }) => {
    await page.route('**/api/digest/today', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 120));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(digestResponse)
      });
    });

    await page.route('**/openai-gpt5-transcript', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: '# GPT-5 文字稿\n\n🧠 发生了什么：多模态推理上线'
      });
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'AI 小耳朵 · 今日摘要' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '今日一句话' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: '一分钟极速版' })).toBeVisible();

    await expect(page.getByText(digestResponse.intro)).toBeVisible();
    await expect(page.getByText(digestResponse.one_minute_brief)).toBeVisible();

    const title = digestResponse.items[0].title;
    await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    await expect(page.getByText(digestResponse.items[0].headline)).toBeVisible();

    await expect(page.locator('audio')).toHaveAttribute('src', digestResponse.items[0].audio_url);
    await expect(page.getByRole('link', { name: '下载文字稿' })).toHaveAttribute('href', digestResponse.items[0].transcript_url);
    await expect(page.getByRole('link', { name: '查看原文报道 ↗' })).toHaveAttribute(
      'href',
      digestResponse.items[0].source_url
    );

    await expect(page.getByText('🧠 发生了什么')).toBeVisible();
    for (const entry of digestResponse.items[0].happened) {
      await expect(page.getByText(entry)).toBeVisible();
    }

    await expect(page.getByRole('heading', { level: 4, name: '❓ 关键问题' })).toBeVisible();
    await expect(page.getByText('问题：GPT-5 相比上一代的最核心提升是什么？')).toBeVisible();
    await expect(page.getByText('追问：这是否意味着我们可以把高价值业务流程交给大模型？')).toBeVisible();

    const transcriptButton = page.getByRole('button', { name: '展开文字稿' });
    await expect(transcriptButton).toBeVisible();
    await transcriptButton.click();
    await expect(page.getByRole('button', { name: '收起文字稿' })).toBeVisible();
    await expect(page.getByText('GPT-5 文字稿')).toBeVisible();

    await expect(page.getByText('正在为你准备今日的 AI 小耳朵内容…')).toHaveCount(0);
  });

  test('renders base64 audio fallback and hides empty sections', async ({ page }) => {
    const fallbackResponse = {
      date: '2024-06-02',
      intro: '今天的焦点是一条离线生成的节目内容。',
      one_minute_brief: '总结一下：我们照样帮你把重点讲清楚，即使模型不在线。',
      items: [
        {
          title: '离线节目的友好提醒',
          headline: '我们照常播报',
          text_summary: '模型离线也不慌，节目里会告诉你需要知道的重点。',
          source_url: 'https://example.com/offline-digest',
          transcript_url: 'https://example.com/offline-transcript',
          audio_url: null,
          audio_base64: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjMzLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAABAAABhGFtYmkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
          published_at: null,
          happened: [],
          impact: [],
          actions: [],
          core_insights: [],
          info_checks: [],
          more_thoughts: [],
          key_questions: [
            {
              question: '如果模型离线，我还能听到节目吗？',
              answer: '可以，我们会用本地脚本生成音频并继续播报。',
              follow_up_question: null,
              follow_up_answer: null
            }
          ]
        }
      ]
    };

    await page.route('**/api/digest/today', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fallbackResponse)
      });
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { level: 2, name: '今日一句话' })).toBeVisible();
    await expect(page.getByText(fallbackResponse.intro)).toBeVisible();
    await expect(page.getByText(fallbackResponse.one_minute_brief)).toBeVisible();

    const card = page.getByRole('article').first();
    await expect(card.getByRole('heading', { level: 2, name: '离线节目的友好提醒' })).toBeVisible();
    await expect(card.locator('audio')).toHaveAttribute('src', /^data:audio\/mpeg;base64,/);
    await expect(card.locator('.publish-time')).toHaveCount(0);

    await expect(card.getByText('🧠 发生了什么')).toHaveCount(0);
    await expect(card.getByText('👀 和我有什么关系')).toHaveCount(0);
    await expect(card.getByText('✅ 我需要做什么')).toHaveCount(0);
    await expect(card.getByText('💡 核心认知')).toHaveCount(0);
    await expect(card.getByText('🔍 信息校验')).toHaveCount(0);
    await expect(card.getByText('🤔 更多思考')).toHaveCount(0);

    await expect(card.getByText('问题：如果模型离线，我还能听到节目吗？')).toBeVisible();
    await expect(card.getByText('追问：', { exact: false })).toHaveCount(0);
  });

  test('shows a friendly error state when the API fails', async ({ page }) => {
    await page.route('**/api/digest/today', async (route) => {
      await route.fulfill({ status: 500, body: 'error' });
    });

    await page.goto('/');

    await expect(page.getByText('加载今日摘要时遇到问题，请稍后再试。')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '今日一句话' })).toHaveCount(0);
  });
});
