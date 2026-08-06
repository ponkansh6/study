export interface WeightStats {
  answered: number;
  incorrect: number;
  latestIncorrect: boolean;
}

/** Domain rule: base 5, ratio bonus 1+4*(incorrect/answered) when answered>0, +2 when last answer was incorrect. */
export function computeWeight(stats: WeightStats | null | undefined): number {
  if (!stats || stats.answered <= 0) return 5;
  const incorrectRatio = stats.incorrect / stats.answered;
  const weight = 1 + 4 * incorrectRatio;
  return stats.latestIncorrect ? weight + 2 : weight;
}

export interface WeightedItem<T> {
  item: T;
  weight: number;
}

/** Weighted random pick. rng returns [0,1). Returns the picked item or null when list is empty. */
export function pickByWeight<T>(items: WeightedItem<T>[], rng: () => number = Math.random): T | null {
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
