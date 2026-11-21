package com.repairloop.core.model;

import com.repairloop.core.exception.DomainValidationException;
import com.repairloop.core.interfaces.Trackable;
import java.time.LocalDate;

/**
 * Represents a customer repair request extending AssetItem and implementing Trackable.
 */
public class RepairRequest extends AssetItem implements Trackable {
    private final String customerId;
    private final String customerName;
    private final String modelNumber;
    private final LocalDate purchaseDate;
    private final double originalPrice;
    private final double replacementPrice;
    private final int previousRepairCount;
    private final double previousRepairCost;
    private final boolean recurringFault;
    private final String problemDescription;
    private RepairStatus status;
    private String acceptedQuotationId;
    private String acceptedMechanicName;

    public RepairRequest(
            String id,
            String customerId,
            String customerName,
            String category,
            String productName,
            String brand,
            String modelNumber,
            double ageYears,
            LocalDate purchaseDate,
            double originalPrice,
            double replacementPrice,
            int previousRepairCount,
            double previousRepairCost,
            boolean recurringFault,
            String problemDescription,
            String location) {
        super(id, category, productName, brand, ageYears, location);
        if (originalPrice <= 0 || replacementPrice <= 0) {
            throw new DomainValidationException("Original and replacement prices must be positive.");
        }
        if (previousRepairCount < 0 || previousRepairCost < 0) {
            throw new DomainValidationException("Previous repair history cannot be negative.");
        }
        this.customerId = customerId;
        this.customerName = customerName;
        this.modelNumber = modelNumber;
        this.purchaseDate = purchaseDate;
        this.originalPrice = originalPrice;
        this.replacementPrice = replacementPrice;
        this.previousRepairCount = previousRepairCount;
        this.previousRepairCost = previousRepairCost;
        this.recurringFault = recurringFault;
        this.problemDescription = problemDescription;
        this.status = RepairStatus.PENDING;
    }

    @Override
    public String getTrackingId() {
        return getId();
    }

    @Override
    public RepairStatus getStatus() {
        return status;
    }

    @Override
    public void setStatus(RepairStatus nextStatus) {
        this.status = nextStatus;
    }

    public String getCustomerId() {
        return customerId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public String getModelNumber() {
        return modelNumber;
    }

    public LocalDate getPurchaseDate() {
        return purchaseDate;
    }

    public double getOriginalPrice() {
        return originalPrice;
    }

    public double getReplacementPrice() {
        return replacementPrice;
    }

    public int getPreviousRepairCount() {
        return previousRepairCount;
    }

    public double getPreviousRepairCost() {
        return previousRepairCost;
    }

    public boolean isRecurringFault() {
        return recurringFault;
    }

    public String getProblemDescription() {
        return problemDescription;
    }

    public String getAcceptedQuotationId() {
        return acceptedQuotationId;
    }

    public void setAcceptedQuotationId(String acceptedQuotationId) {
        this.acceptedQuotationId = acceptedQuotationId;
    }

    public String getAcceptedMechanicName() {
        return acceptedMechanicName;
    }

    public void setAcceptedMechanicName(String acceptedMechanicName) {
        this.acceptedMechanicName = acceptedMechanicName;
    }

    @Override
    public String getSummary() {
        return String.format("[%s] %s %s (%s) - Status: %s",
                getId(), getBrand(), getProductName(), modelNumber, status.getDisplayLabel());
    }
}
