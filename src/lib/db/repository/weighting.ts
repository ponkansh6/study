/** 未解答の問題に与える固定重み */
export const UNSEEN_WEIGHT = 12;
/** 誤答数の絶対回数ボーナス: 1 + MISS_COEF * min(incorrect, MISS_CAP) → 1.0〜3.0 */
export const MISS_COEF = 0.5;
export const MISS_CAP = 4;
/** 正解数の減衰: 1 / (1 + MASTERY_COEF * min(correct, MASTERY_CAP)) → 1.0〜0.364 */
export const MASTERY_COEF = 0.35;
export const MASTERY_CAP = 5;
/** 経過時間ランプ: RECENCY_MIN → RECENCY_MAX を RECENCY_FULL_DAYS 日でリニアに */
export const RECENCY_MIN = 0.2;
export const RECENCY_MAX = 3;
export const RECENCY_FULL_DAYS = 7;
/** 直近が誤答だったときの倍率 */
export const LATEST_MISS_MULT = 2;
/** クランプ */
export const WEIGHT_MIN = 0.1;
export const WEIGHT_MAX = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeightStats {
  answered: number;
  incorrect: number;
  latestIncorrect: boolean;
  /** 最終解答時刻。answered > 0 なら通常は非 null */
  lastAnsweredAt: Date | null;
}

/** Domain rule: 4-axis multiplicative weighting (accuracy ratio × absolute miss bonus × mastery decay × recency × latest-miss multiplier), clamped to [WEIGHT_MIN, WEIGHT_MAX]. */
export function computeWeight(stats: WeightStats | null | undefined, now: Date): number {
  if (!stats || stats.answered <= 0) return UNSEEN_WEIGHT;

  const incorrect = stats.incorrect;
  const correct = Math.max(0, stats.answered - incorrect);

  // 比率軸（従来ロジックを踏襲）: 1.0〜5.0
  const accuracyTerm = 1 + 4 * (incorrect / stats.answered);
  // 絶対誤答回数: 1.0〜3.0
  const missBonus = 1 + MISS_COEF * Math.min(incorrect, MISS_CAP);
  // 絶対正解回数による減衰: 1.0〜0.364
  const masteryDecay = 1 / (1 + MASTERY_COEF * Math.min(correct, MASTERY_CAP));

  // 経過日数。lastAnsweredAt が null（欠損）なら「十分に古い」扱い。
  // 未来日時（クロックスキュー）は 0 に切り上げ。
  const elapsedDays =
    stats.lastAnsweredAt === null
      ? RECENCY_FULL_DAYS
      : Math.max(0, (now.getTime() - stats.lastAnsweredAt.getTime()) / DAY_MS);
  let recency =
    RECENCY_MIN + (RECENCY_MAX - RECENCY_MIN) * Math.min(1, elapsedDays / RECENCY_FULL_DAYS);

  // 直近が誤答なら recency で押し下げない（下限 1.0）
  if (stats.latestIncorrect) recency = Math.max(1, recency);

  const raw =
    accuracyTerm *
    missBonus *
    masteryDecay *
    recency *
    (stats.latestIncorrect ? LATEST_MISS_MULT : 1);

  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, raw));
}

export interface WeightedItem<T> {
  item: T;
  weight: number;
}

/** Weighted random pick. rng returns [0,1). Returns the picked item or null when list is empty. */
export function pickByWeight<T>(
  items: WeightedItem<T>[],
  rng: () => number = Math.random,
): T | null {
  const totalWeight = items.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight <= 0 || items.length === 0) return null;
  let randomVal = rng() * totalWeight;
  for (const entry of items) {
    if (randomVal < entry.weight) return entry.item;
    randomVal -= entry.weight;
  }
  // Floating-point safety net
  return items[items.length - 1]?.item ?? null;
}
