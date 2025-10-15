import type { CardType, DirectionStage, SkillLevel } from '@api';

type SkillSuggestion = {
  name: string;
  summary?: string;
  level?: SkillLevel;
};

export type DirectionTemplate = {
  id: string;
  name: string;
  defaultStage: DirectionStage;
  defaultGoal: string;
  defaultCardType: CardType;
  skills: SkillSuggestion[];
};

export const DIRECTION_TEMPLATES: DirectionTemplate[] = [
  {
    id: 'ai-reading',
    name: 'AI × 阅读萃取',
    defaultStage: 'explore',
    defaultGoal: '搭建快速萃取流程，沉淀 10 张首批高价值卡片。',
    defaultCardType: 'concept',
    skills: [
      {
        name: 'Prompt 设计',
        summary: '能够针对不同材料快速调优提示词，让输出结构稳定。',
        level: 'emerging',
      },
      {
        name: '信息筛选',
        summary: '判断材料中哪些细节值得纳入卡片并给出理由。',
        level: 'working',
      },
      {
        name: '引用标注',
        summary: '为每个论断附上出处与可信度，便于后续复盘。',
        level: 'emerging',
      },
    ],
  },
  {
    id: 'rust-retrieval',
    name: 'Rust × 检索引擎',
    defaultStage: 'attack',
    defaultGoal: '完成核心索引与查询路径，支撑 MVP 检索体验。',
    defaultCardType: 'procedure',
    skills: [
      {
        name: '索引结构',
        summary: '熟悉倒排表、向量索引的取舍与组合。',
        level: 'working',
      },
      {
        name: '异步执行',
        summary: '掌握 Tokio/async-std 调度与性能调优。',
        level: 'emerging',
      },
      {
        name: '评估基准',
        summary: '能设计小规模数据集验证检索质量。',
        level: 'emerging',
      },
    ],
  },
  {
    id: 'product-strategy',
    name: '产品战略 × 框架',
    defaultStage: 'shape',
    defaultGoal: '梳理季度北极星指标与核心叙事，明确演进节奏。',
    defaultCardType: 'claim',
    skills: [
      {
        name: '北极星拆解',
        summary: '将抽象目标拆成可验证的指标与关键假设。',
        level: 'working',
      },
      {
        name: '竞争态势',
        summary: '对照竞品与市场信号，提炼差异化动作。',
        level: 'emerging',
      },
      {
        name: '叙事打磨',
        summary: '能输出 1 页叙事说服团队理解方向。',
        level: 'emerging',
      },
    ],
  },
  {
    id: 'growth-reflection',
    name: '成长复盘 × 反馈',
    defaultStage: 'stabilize',
    defaultGoal: '建立每周复盘节奏并沉淀可复用的反馈卡片。',
    defaultCardType: 'fact',
    skills: [
      {
        name: '事件回顾',
        summary: '能够快速回溯关键事件并抓住决策节点。',
        level: 'working',
      },
      {
        name: '反馈拆解',
        summary: '拆出反馈背后的行为模式与触发条件。',
        level: 'emerging',
      },
      {
        name: '改进行动',
        summary: '为每条反馈制定下一步行动并跟进结果。',
        level: 'working',
      },
    ],
  },
];
