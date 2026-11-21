package com.repairloop.core.model;

import com.repairloop.core.exception.DomainValidationException;

/**
 * Represents a customer resale marketplace listing extending AssetItem.
 */
public class ResaleListing extends AssetItem {
    private final String sellerId;
    private final String sellerName;
    private final String model;
    private final String condition;
    private final double expectedPrice;
    private final String description;
    private ListingStatus status;
    private String acceptedOfferId;
    private String buyerVendorId;
    private String buyerVendorName;
    private double soldPrice;

    public ResaleListing(
            String id,
            String sellerId,
            String sellerName,
            String productName,
            String category,
            String brand,
            String model,
            double ageYears,
            String condition,
            double expectedPrice,
            String location,
            String description) {
        super(id, category, productName, brand, ageYears, location);
        if (expectedPrice <= 0) {
            throw new DomainValidationException("Expected resale price must be positive.");
        }
        this.sellerId = sellerId;
        this.sellerName = sellerName;
        this.model = model;
        this.condition = condition;
        this.expectedPrice = expectedPrice;
        this.description = description;
        this.status = ListingStatus.AVAILABLE;
    }

    public String getSellerId() {
        return sellerId;
    }

    public String getSellerName() {
        return sellerName;
    }

    public String getModel() {
        return model;
    }

    public String getCondition() {
        return condition;
    }

    public double getExpectedPrice() {
        return expectedPrice;
    }

    public String getDescription() {
        return description;
    }

    public ListingStatus getStatus() {
        return status;
    }

    public void setStatus(ListingStatus status) {
        this.status = status;
    }

    public String getAcceptedOfferId() {
        return acceptedOfferId;
    }

    public String getBuyerVendorId() {
        return buyerVendorId;
    }

    public String getBuyerVendorName() {
        return buyerVendorName;
    }

    public double getSoldPrice() {
        return soldPrice;
    }

    public void markSold(String offerId, String vendorId, String vendorName, double price) {
        this.status = ListingStatus.SOLD;
        this.acceptedOfferId = offerId;
        this.buyerVendorId = vendorId;
        this.buyerVendorName = vendorName;
        this.soldPrice = price;
    }

    @Override
    public String getSummary() {
        return String.format("[%s] %s %s (%s) - Asking $%.2f - %s",
                getId(), getBrand(), getProductName(), condition, expectedPrice, status);
    }
}
