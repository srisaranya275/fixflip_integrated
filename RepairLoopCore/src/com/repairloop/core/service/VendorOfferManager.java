package com.repairloop.core.service;

import com.repairloop.core.exception.DomainValidationException;
import com.repairloop.core.exception.DuplicateAcceptanceException;
import com.repairloop.core.model.ListingStatus;
import com.repairloop.core.model.OfferStatus;
import com.repairloop.core.model.ResaleListing;
import com.repairloop.core.model.VendorOffer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Manages confidential vendor offers on resale listings.
 * Enforces single winning buyer and prevents duplicate listing purchases.
 */
public class VendorOfferManager {
    private final Map<String, List<VendorOffer>> offersByListing = new HashMap<>();
    private final Map<String, String> acceptedOfferByListing = new HashMap<>();

    public void addOffer(ResaleListing listing, VendorOffer offer) {
        if (listing == null || offer == null) {
            throw new DomainValidationException("Listing and offer must not be null.");
        }
        if (!listing.getId().equals(offer.getListingId())) {
            throw new DomainValidationException("Offer listingId does not match ResaleListing ID.");
        }
        if (listing.getStatus() == ListingStatus.SOLD || acceptedOfferByListing.containsKey(listing.getId())) {
            throw new DuplicateAcceptanceException(
                    "Listing " + listing.getId() + " has already been sold.");
        }

        List<VendorOffer> list = offersByListing.computeIfAbsent(listing.getId(), k -> new ArrayList<>());
        list.add(offer);

        if (listing.getStatus() == ListingStatus.AVAILABLE) {
            listing.setStatus(ListingStatus.OFFER_RECEIVED);
        }
    }

    /**
     * Returns offers sorted highest offered price first.
     */
    public List<VendorOffer> compareOffers(String listingId) {
        List<VendorOffer> list = offersByListing.getOrDefault(listingId, Collections.emptyList());
        List<VendorOffer> sorted = new ArrayList<>(list);
        Collections.sort(sorted);
        return Collections.unmodifiableList(sorted);
    }

    /**
     * Accepts a single vendor offer, rejects all competing offers, and marks the listing SOLD.
     */
    public VendorOffer acceptOffer(ResaleListing listing, String offerId) {
        if (listing == null || offerId == null || offerId.isBlank()) {
            throw new DomainValidationException("Valid listing and offerId are required.");
        }
        if (listing.getStatus() == ListingStatus.SOLD || acceptedOfferByListing.containsKey(listing.getId())) {
            throw new DuplicateAcceptanceException(
                    "Duplicate purchase prevented: listing " + listing.getId() + " is already SOLD.");
        }

        List<VendorOffer> list = offersByListing.get(listing.getId());
        if (list == null || list.isEmpty()) {
            throw new DomainValidationException("No vendor offers exist for listing " + listing.getId());
        }

        VendorOffer winningOffer = null;
        for (VendorOffer offer : list) {
            if (offer.getOfferId().equals(offerId)) {
                winningOffer = offer;
                break;
            }
        }
        if (winningOffer == null) {
            throw new DomainValidationException("Offer " + offerId + " not found for listing " + listing.getId());
        }

        for (VendorOffer offer : list) {
            if (offer.getOfferId().equals(offerId)) {
                offer.setStatus(OfferStatus.ACCEPTED);
            } else {
                offer.setStatus(OfferStatus.REJECTED);
            }
        }

        acceptedOfferByListing.put(listing.getId(), winningOffer.getOfferId());
        listing.markSold(
                winningOffer.getOfferId(),
                winningOffer.getVendorId(),
                winningOffer.getVendorName(),
                winningOffer.getOfferedPrice());

        return winningOffer;
    }
}
