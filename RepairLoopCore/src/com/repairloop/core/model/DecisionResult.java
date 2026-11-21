package com.repairloop.core.model;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Structured output returned by RepairDecisionEngine containing weighted scores,
 * financial ratios, recommendation, transparent explanation, and per-factor breakdown.
 */
public class DecisionResult {
    private final int repairScore;
    private final int replacementScore;
    private final double repairCostRatio;
    private final double repairCostPercentage;
    private final double estimatedSavings;
    private final double additionalLifespanYears;
    private final RecommendationType recommendation;
    private final String explanation;
    private final Map<String, Double> factorRepairPoints;

    public DecisionResult(
            int repairScore,
            int replacementScore,
            double repairCostRatio,
            double repairCostPercentage,
            double estimatedSavings,
            double additionalLifespanYears,
            RecommendationType recommendation,
            String explanation,
            Map<String, Double> factorRepairPoints) {
        this.repairScore = repairScore;
        this.replacementScore = replacementScore;
        this.repairCostRatio = repairCostRatio;
        this.repairCostPercentage = repairCostPercentage;
        this.estimatedSavings = estimatedSavings;
        this.additionalLifespanYears = additionalLifespanYears;
        this.recommendation = recommendation;
        this.explanation = explanation;
        this.factorRepairPoints = Collections.unmodifiableMap(new LinkedHashMap<>(factorRepairPoints));
    }

    public int getRepairScore() {
        return repairScore;
    }

    public int getReplacementScore() {
        return replacementScore;
    }

    public double getRepairCostRatio() {
        return repairCostRatio;
    }

    public double getRepairCostPercentage() {
        return repairCostPercentage;
    }

    public double getEstimatedSavings() {
        return estimatedSavings;
    }

    public double getAdditionalLifespanYears() {
        return additionalLifespanYears;
    }

    public RecommendationType getRecommendation() {
        return recommendation;
    }

    public String getExplanation() {
        return explanation;
    }

    public Map<String, Double> getFactorRepairPoints() {
        return factorRepairPoints;
    }
}
