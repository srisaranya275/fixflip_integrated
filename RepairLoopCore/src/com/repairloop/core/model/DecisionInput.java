package com.repairloop.core.model;

import com.repairloop.core.exception.DomainValidationException;

/**
 * Encapsulates all input parameters for the Repair-vs-Replace Decision Engine.
 */
public class DecisionInput {
    private final double originalPrice;
    private final double productAgeYears;
    private final double repairCost;
    private final double replacementCost;
    private final int previousRepairCount;
    private final double previousRepairCost;
    private final double estimatedAdditionalLifespanYears;
    private final boolean recurringFault;

    public DecisionInput(
            double originalPrice,
            double productAgeYears,
            double repairCost,
            double replacementCost,
            int previousRepairCount,
            double previousRepairCost,
            double estimatedAdditionalLifespanYears,
            boolean recurringFault) {
        if (originalPrice <= 0 || replacementCost <= 0) {
            throw new DomainValidationException("Original price and replacement cost must be greater than zero.");
        }
        if (repairCost < 0 || productAgeYears < 0 || previousRepairCount < 0 || previousRepairCost < 0 || estimatedAdditionalLifespanYears < 0) {
            throw new DomainValidationException("Numeric input parameters cannot be negative.");
        }
        this.originalPrice = originalPrice;
        this.productAgeYears = productAgeYears;
        this.repairCost = repairCost;
        this.replacementCost = replacementCost;
        this.previousRepairCount = previousRepairCount;
        this.previousRepairCost = previousRepairCost;
        this.estimatedAdditionalLifespanYears = estimatedAdditionalLifespanYears;
        this.recurringFault = recurringFault;
    }

    public double getOriginalPrice() {
        return originalPrice;
    }

    public double getProductAgeYears() {
        return productAgeYears;
    }

    public double getRepairCost() {
        return repairCost;
    }

    public double getReplacementCost() {
        return replacementCost;
    }

    public int getPreviousRepairCount() {
        return previousRepairCount;
    }

    public double getPreviousRepairCost() {
        return previousRepairCost;
    }

    public double getEstimatedAdditionalLifespanYears() {
        return estimatedAdditionalLifespanYears;
    }

    public boolean isRecurringFault() {
        return recurringFault;
    }
}
