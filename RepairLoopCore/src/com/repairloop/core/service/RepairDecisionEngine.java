package com.repairloop.core.service;

import com.repairloop.core.interfaces.DecisionScorer;
import com.repairloop.core.model.DecisionInput;
import com.repairloop.core.model.DecisionResult;
import com.repairloop.core.model.RecommendationType;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Transparent weighted Repair-vs-Replace scoring engine.
 * Evaluates 5 normalized factors totaling 100 points:
 *  1. Repair-to-Replacement Cost Ratio (35 pts)
 *  2. Expected Additional Lifespan (25 pts)
 *  3. Product Age Factor (15 pts)
 *  4. Prior Repair History (15 pts)
 *  5. Recurring Fault Reliability (10 pts)
 */
public class RepairDecisionEngine implements DecisionScorer {

    @Override
    public DecisionResult evaluate(DecisionInput input) {
        double repairCostRatio = input.getRepairCost() / input.getReplacementCost();
        double repairCostPercentage = repairCostRatio * 100.0;
        double estimatedSavings = input.getReplacementCost() - input.getRepairCost();

        // 1. Cost Ratio Weight (35 pts): <= 25% repair cost earns full 35 pts; >= 70% earns 0 pts.
        double normalizedRatio = clamp((repairCostRatio - 0.25) / 0.45, 0.0, 1.0);
        double costPoints = 35.0 * (1.0 - normalizedRatio);

        // 2. Additional Lifespan Weight (25 pts): >= 4 additional years earns full 25 pts.
        double lifespanPoints = 25.0 * clamp(input.getEstimatedAdditionalLifespanYears() / 4.0, 0.0, 1.0);

        // 3. Product Age Weight (15 pts): newer products favor repair; 10+ years earns 0 pts.
        double agePoints = 15.0 * (1.0 - clamp(input.getProductAgeYears() / 10.0, 0.0, 1.0));

        // 4. Prior Repair History Weight (15 pts): combines count and cumulative prior spend.
        double countPenalty = clamp(input.getPreviousRepairCount() / 4.0, 0.0, 1.0);
        double spendRatio = input.getPreviousRepairCost() / input.getReplacementCost();
        double spendPenalty = clamp(spendRatio / 0.50, 0.0, 1.0);
        double historyPoints = 15.0 * (1.0 - (0.6 * countPenalty + 0.4 * spendPenalty));

        // 5. Recurring Fault Weight (10 pts): isolated faults favor repair.
        double faultPoints = input.isRecurringFault() ? 0.0 : 10.0;

        double rawRepairScore = costPoints + lifespanPoints + agePoints + historyPoints + faultPoints;
        int repairScore = (int) Math.round(clamp(rawRepairScore, 0.0, 100.0));

        // Economic guardrail: if repair equals or exceeds replacement price, cap repair score.
        if (input.getRepairCost() >= input.getReplacementCost()) {
            repairScore = Math.min(repairScore, 35);
        }

        int replacementScore = 100 - repairScore;
        RecommendationType recommendation = repairScore >= 52
                ? RecommendationType.REPAIR
                : RecommendationType.REPLACE;

        Map<String, Double> breakdown = new LinkedHashMap<>();
        breakdown.put("costRatioPoints", roundTwo(costPoints));
        breakdown.put("lifespanPoints", roundTwo(lifespanPoints));
        breakdown.put("productAgePoints", roundTwo(agePoints));
        breakdown.put("repairHistoryPoints", roundTwo(historyPoints));
        breakdown.put("faultReliabilityPoints", roundTwo(faultPoints));

        String explanation = buildExplanation(input, repairScore, repairCostPercentage, estimatedSavings, recommendation);

        return new DecisionResult(
                repairScore,
                replacementScore,
                roundTwo(repairCostRatio),
                roundTwo(repairCostPercentage),
                roundTwo(estimatedSavings),
                input.getEstimatedAdditionalLifespanYears(),
                recommendation,
                explanation,
                breakdown);
    }

    private String buildExplanation(
            DecisionInput input,
            int repairScore,
            double repairCostPct,
            double estimatedSavings,
            RecommendationType recommendation) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format(
                "Repair cost represents %.1f%% of the $%.2f replacement price (estimated net difference: $%.2f). ",
                repairCostPct, input.getReplacementCost(), estimatedSavings));

        if (recommendation == RecommendationType.REPAIR) {
            sb.append(String.format(
                    "With a repair score of %d/100 and an estimated +%.1f years of additional service life, repairing appears economically favorable. ",
                    repairScore, input.getEstimatedAdditionalLifespanYears()));
        } else {
            sb.append(String.format(
                    "With a repair score of %d/100%s, replacing the %.1f-year-old unit offers better long-term value than investing further in repairs. ",
                    repairScore,
                    input.isRecurringFault() ? " and a recurring fault history" : "",
                    input.getProductAgeYears()));
        }
        sb.append("Note: This advisory estimate is based on user-supplied parameters and is not a guaranteed outcome.");
        return sb.toString();
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private static double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
