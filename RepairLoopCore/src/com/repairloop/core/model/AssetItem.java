package com.repairloop.core.model;

import com.repairloop.core.exception.DomainValidationException;
import java.time.Instant;

/**
 * Abstract base class representing a physical electronic device or household appliance
 * tracked within RepairLoop (demonstrates inheritance and encapsulation).
 */
public abstract class AssetItem {
    private final String id;
    private final String category;
    private final String productName;
    private final String brand;
    private final double ageYears;
    private final String location;
    private final Instant createdAt;

    protected AssetItem(
            String id,
            String category,
            String productName,
            String brand,
            double ageYears,
            String location) {
        if (id == null || id.isBlank()) {
            throw new DomainValidationException("Asset ID must not be blank.");
        }
        if (productName == null || productName.isBlank()) {
            throw new DomainValidationException("Product name must not be blank.");
        }
        if (ageYears < 0 || ageYears > 60) {
            throw new DomainValidationException("Product age must be between 0 and 60 years.");
        }
        this.id = id;
        this.category = category == null ? "General Electronics" : category;
        this.productName = productName;
        this.brand = brand == null ? "Unknown" : brand;
        this.ageYears = ageYears;
        this.location = location == null ? "Unspecified" : location;
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getCategory() {
        return category;
    }

    public String getProductName() {
        return productName;
    }

    public String getBrand() {
        return brand;
    }

    public double getAgeYears() {
        return ageYears;
    }

    public String getLocation() {
        return location;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public abstract String getSummary();
}
