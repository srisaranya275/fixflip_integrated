package com.repairloop.core.model;

import com.repairloop.core.exception.DomainValidationException;
import com.repairloop.core.interfaces.EvaluableProposal;
import java.time.Instant;

/**
 * Represents a vendor buyout offer on a resale listing.
 * Implements Comparable (highest offer first) and EvaluableProposal.
 */
public class VendorOffer implements EvaluableProposal, Comparable<VendorOffer> {
    private final String offerId;
    private final String listingId;
    private final String vendorId;
    private final String vendorName;
    private final double offeredPrice;
    private final String message;
    private final Instant offeredAt;
    private OfferStatus status;

    public VendorOffer(
            String offerId,
            String listingId,
            String vendorId,
            String vendorName,
            double offeredPrice,
            String message) {
        if (offeredPrice <= 0) {
            throw new DomainValidationException("Offered price must be positive.");
        }
        this.offerId = offerId;
        this.listingId = listingId;
        this.vendorId = vendorId;
        this.vendorName = vendorName;
        this.offeredPrice = offeredPrice;
        this.message = message == null ? "" : message;
        this.offeredAt = Instant.now();
        this.status = OfferStatus.PENDING;
    }

    public String getOfferId() {
        return offerId;
    }

    public String getListingId() {
        return listingId;
    }

    public String getVendorId() {
        return vendorId;
    }

    public String getVendorName() {
        return vendorName;
    }

    public double getOfferedPrice() {
        return offeredPrice;
    }

    public String getMessage() {
        return message;
    }

    public Instant getOfferedAt() {
        return offeredAt;
    }

    public OfferStatus getStatus() {
        return status;
    }

    public void setStatus(OfferStatus status) {
        this.status = status;
    }

    @Override
    public String getProposalId() {
        return offerId;
    }

    @Override
    public String getTargetEntityId() {
        return listingId;
    }

    @Override
    public String getProviderName() {
        return vendorName;
    }

    @Override
    public double getMonetaryAmount() {
        return offeredPrice;
    }

    @Override
    public String getProposalSummary() {
        return String.format("Offer %s by %s: $%.2f | \"%s\" | %s",
                offerId, vendorName, offeredPrice, message, status);
    }

    @Override
    public int compareTo(VendorOffer other) {
        // Sort highest offered price first
        return Double.compare(other.offeredPrice, this.offeredPrice);
    }
}
