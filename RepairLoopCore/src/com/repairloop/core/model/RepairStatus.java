package com.repairloop.core.model;

/**
 * Lifecycle states for a customer repair request.
 */
public enum RepairStatus {
    PENDING("Request Submitted"),
    QUOTATION_RECEIVED("Quotations Received"),
    QUOTATION_ACCEPTED("Provider Selected"),
    REPAIR_IN_PROGRESS("Repair In Progress"),
    REPAIR_COMPLETED("Repair Completed"),
    CANCELLED("Cancelled");

    private final String displayLabel;

    RepairStatus(String displayLabel) {
        this.displayLabel = displayLabel;
    }

    public String getDisplayLabel() {
        return displayLabel;
    }

    public boolean isTerminal() {
        return this == REPAIR_COMPLETED || this == CANCELLED;
    }
}
