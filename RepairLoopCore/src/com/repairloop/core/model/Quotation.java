package com.repairloop.core.model;

import com.repairloop.core.exception.DomainValidationException;
import com.repairloop.core.interfaces.EvaluableProposal;
import java.time.Instant;

/**
 * Represents a mechanic's repair quotation. Implements Comparable for cost-based
 * sorting and EvaluableProposal for polymorphic handling.
 */
public class Quotation implements EvaluableProposal, Comparable<Quotation> {
    private final String quotationId;
    private final String requestId;
    private final String mechanicId;
    private final String mechanicName;
    private final double estimatedCost;
    private final String spareParts;
    private final int completionTimeDays;
    private final double additionalLifespanYears;
    private final String repairDescription;
    private final String notes;
    private final Instant createdAt;
    private QuotationStatus status;

    public Quotation(
            String quotationId,
            String requestId,
            String mechanicId,
            String mechanicName,
            double estimatedCost,
            String spareParts,
            int completionTimeDays,
            double additionalLifespanYears,
            String repairDescription,
            String notes) {
        if (estimatedCost <= 0) {
            throw new DomainValidationException("Quotation cost must be greater than zero.");
        }
        if (completionTimeDays <= 0 || additionalLifespanYears <= 0) {
            throw new DomainValidationException("Completion time and lifespan extension must be positive.");
        }
        this.quotationId = quotationId;
        this.requestId = requestId;
        this.mechanicId = mechanicId;
        this.mechanicName = mechanicName;
        this.estimatedCost = estimatedCost;
        this.spareParts = spareParts;
        this.completionTimeDays = completionTimeDays;
        this.additionalLifespanYears = additionalLifespanYears;
        this.repairDescription = repairDescription;
        this.notes = notes == null ? "" : notes;
        this.createdAt = Instant.now();
        this.status = QuotationStatus.PENDING;
    }

    public String getQuotationId() {
        return quotationId;
    }

    public String getRequestId() {
        return requestId;
    }

    public String getMechanicId() {
        return mechanicId;
    }

    public String getMechanicName() {
        return mechanicName;
    }

    public double getEstimatedCost() {
        return estimatedCost;
    }

    public String getSpareParts() {
        return spareParts;
    }

    public int getCompletionTimeDays() {
        return completionTimeDays;
    }

    public double getAdditionalLifespanYears() {
        return additionalLifespanYears;
    }

    public String getRepairDescription() {
        return repairDescription;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public QuotationStatus getStatus() {
        return status;
    }

    public void setStatus(QuotationStatus status) {
        this.status = status;
    }

    @Override
    public String getProposalId() {
        return quotationId;
    }

    @Override
    public String getTargetEntityId() {
        return requestId;
    }

    @Override
    public String getProviderName() {
        return mechanicName;
    }

    @Override
    public double getMonetaryAmount() {
        return estimatedCost;
    }

    @Override
    public String getProposalSummary() {
        return String.format("Quote %s by %s: $%.2f | %d days | +%.1f yrs | %s",
                quotationId, mechanicName, estimatedCost, completionTimeDays, additionalLifespanYears, status);
    }

    @Override
    public int compareTo(Quotation other) {
        int costCmp = Double.compare(this.estimatedCost, other.estimatedCost);
        if (costCmp != 0) {
            return costCmp;
        }
        return Integer.compare(this.completionTimeDays, other.completionTimeDays);
    }
}
