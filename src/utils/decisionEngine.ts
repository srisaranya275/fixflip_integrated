import { DecisionInput, DecisionResult } from '../types/domain';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Frontend execution of the transparent weighted Repair-vs-Replace scoring model.
 * Mirrors RepairLoopCore's RepairDecisionEngine.java 1:1 so the web preview works
 * independently even when the local Java 21 HTTP bridge is not running.
 */
export function evaluateRepairDecisionLocal(input: DecisionInput): DecisionResult {
  const safeReplacement = Math.max(1, input.replacementCost);
  const repairCostRatio = input.repairCost / safeReplacement;
  const repairCostPercentage = repairCostRatio * 100;
  const estimatedSavings = safeReplacement - input.repairCost;

  // 1. Cost Ratio Weight (35 pts)
  const normalizedRatio = clamp((repairCostRatio - 0.25) / 0.45, 0, 1);
  const costRatioPoints = 35 * (1 - normalizedRatio);

  // 2. Additional Lifespan Weight (25 pts)
  const lifespanPoints = 25 * clamp(input.estimatedAdditionalLifespanYears / 4.0, 0, 1);

  // 3. Product Age Weight (15 pts)
  const productAgePoints = 15 * (1 - clamp(input.productAgeYears / 10.0, 0, 1));

  // 4. Prior Repair History Weight (15 pts)
  const countPenalty = clamp(input.previousRepairCount / 4.0, 0, 1);
  const spendRatio = input.previousRepairCost / safeReplacement;
  const spendPenalty = clamp(spendRatio / 0.5, 0, 1);
  const repairHistoryPoints = 15 * (1 - (0.6 * countPenalty + 0.4 * spendPenalty));

  // 5. Fault Reliability Weight (10 pts)
  const faultReliabilityPoints = input.recurringFault ? 0 : 10;

  const rawScore =
    costRatioPoints +
    lifespanPoints +
    productAgePoints +
    repairHistoryPoints +
    faultReliabilityPoints;

  let repairScore = Math.round(clamp(rawScore, 0, 100));
  if (input.repairCost >= safeReplacement) {
    repairScore = Math.min(repairScore, 35);
  }

  const replacementScore = 100 - repairScore;
  const recommendation: 'REPAIR' | 'REPLACE' = repairScore >= 52 ? 'REPAIR' : 'REPLACE';

  const explanation =
    `Repair cost represents ${repairCostPercentage.toFixed(1)}% of the $${safeReplacement.toFixed(2)} replacement price (estimated net difference: $${estimatedSavings.toFixed(2)}). ` +
    (recommendation === 'REPAIR'
      ? `With a repair score of ${repairScore}/100 and an estimated +${input.estimatedAdditionalLifespanYears.toFixed(1)} years of additional service life, repairing appears economically favorable. `
      : `With a repair score of ${repairScore}/100${input.recurringFault ? ' and a recurring fault history' : ''}, replacing the ${input.productAgeYears.toFixed(1)}-year-old unit offers better long-term value than investing further in repairs. `) +
    'Note: This advisory estimate is based on user-supplied parameters and is not a guaranteed outcome.';

  return {
    engine: 'Browser-RepairLoopCore-TS',
    repairScore,
    replacementScore,
    repairCostRatio: roundTwo(repairCostRatio),
    repairCostPercentage: roundTwo(repairCostPercentage),
    estimatedSavings: roundTwo(estimatedSavings),
    additionalLifespanYears: input.estimatedAdditionalLifespanYears,
    recommendation,
    explanation,
    factorBreakdown: {
      costRatioPoints: roundTwo(costRatioPoints),
      lifespanPoints: roundTwo(lifespanPoints),
      productAgePoints: roundTwo(productAgePoints),
      repairHistoryPoints: roundTwo(repairHistoryPoints),
      faultReliabilityPoints: roundTwo(faultReliabilityPoints),
    },
  };
}

/**
 * Attempts to evaluate via a locally running RepairLoopHttpServer (Java 21)
 * and transparently indicates whether Java 21 or the browser fallback was used.
 */
export async function evaluateViaJavaHttpBridge(
  input: DecisionInput,
  baseUrl = 'http://localhost:8080'
): Promise<{ result: DecisionResult; bridgeConnected: boolean; bridgeError?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${baseUrl}/api/decision/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Java HTTP server returned ${res.status}`);
    }
    const data = (await res.json()) as DecisionResult;
    return { result: data, bridgeConnected: true };
  } catch (err) {
    const fallback = evaluateRepairDecisionLocal(input);
    return {
      result: fallback,
      bridgeConnected: false,
      bridgeError:
        err instanceof Error
          ? `Local Java 21 HTTP server not reachable (${err.message}). Evaluated with local browser logic.`
          : 'Local Java 21 HTTP server not reachable. Evaluated with local browser logic.',
    };
  }
}
