/** Σ(weight) × rate per KG, rounded to rupees. Used for sales and purchases. */
export function saleLineAmount(totalWeightKg: number, ratePerKg: number): number {
  return Math.round(Number(totalWeightKg || 0) * Number(ratePerKg || 0));
}

/** Line totals always come from recorded bag weights when those weights exist. */
export function pricedFromBags<T extends {
  bags: number;
  weightKg: number;
  ratePerKg: number;
  amount: number;
  bagWeights?: { weightKg: number }[];
}>(item: T): T {
  const hasBags = !!item.bagWeights && item.bagWeights.length > 0;
  const weightKg = hasBags
    ? item.bagWeights!.reduce((sum, bag) => sum + Number(bag.weightKg || 0), 0)
    : Number(item.weightKg || 0);
  return {
    ...item,
    bags: hasBags ? item.bagWeights!.length : item.bags,
    weightKg,
    amount: saleLineAmount(weightKg, item.ratePerKg),
  };
}

/** Outstanding after a collection. Never drops below zero. */
export function outstandingAfterPayment(previousOutstanding: number, amount: number): number {
  return Math.max(0, previousOutstanding - amount);
}
