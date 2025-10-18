import type { GenerateCardDraftsParams, GeneratedCardDraft } from '@api';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const fallbackDirection = (name?: string) => (name && name.trim().length > 0 ? name.trim() : '未命名方向');

export const generateMockCardDrafts = (params: GenerateCardDraftsParams): GeneratedCardDraft[] => {
  const materials = params.materials.filter((material) => normalizeWhitespace(material.content).length > 0);
  const sourceMaterials = materials.length > 0 ? materials : [{ content: '默认材料：介绍系统如何支持快速引导。', title: '默认材料' }];
  const desiredCount = clamp(params.desiredCount ?? 3, 1, 8);
  const cardType = params.preferredCardType ?? 'concept';
  const directionName = fallbackDirection(params.directionName);

  return Array.from({ length: desiredCount }).map((_, index) => {
    const material = sourceMaterials[index % sourceMaterials.length];
    const snippet = normalizeWhitespace(material.content).slice(0, 140);

    const stability = clamp(0.24 + index * 0.05, 0.2, 0.68);
    const relevance = clamp(0.76 - index * 0.04, 0.42, 0.82);
    const novelty = clamp(0.26 + index * 0.03, 0.2, 0.6);
    const priority = clamp(0.64 + index * 0.04, 0.5, 0.92);

    return {
      draft: {
        skill_point_id: null,
        title: `${directionName} · ${material.title ?? '材料'}关键洞察 ${index + 1}`,
        body: `${snippet}${snippet.length === material.content.length ? '' : '…'}`,
        card_type: cardType,
        stability,
        relevance,
        novelty,
        priority,
        next_due: new Date(Date.now() + (index + 1) * 36 * 60 * 60 * 1000).toISOString(),
      },
      rationale: `结合材料《${material.title ?? '未命名材料'}》总结方向「${directionName}」的重点。`,
      confidence: clamp(0.68 + index * 0.06, 0.6, 0.95),
    } satisfies GeneratedCardDraft;
  });
};
