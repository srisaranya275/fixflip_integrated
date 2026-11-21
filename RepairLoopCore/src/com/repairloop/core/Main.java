package com.repairloop.core;

import com.repairloop.core.exception.DuplicateAcceptanceException;
import com.repairloop.core.exception.InvalidStatusTransitionException;
import com.repairloop.core.interfaces.EvaluableProposal;
import com.repairloop.core.model.DecisionInput;
import com.repairloop.core.model.DecisionResult;
import com.repairloop.core.model.Quotation;
import com.repairloop.core.model.RepairRequest;
import com.repairloop.core.model.RepairStatus;
import com.repairloop.core.model.ResaleListing;
import com.repairloop.core.model.VendorOffer;
import com.repairloop.core.service.QuotationManager;
import com.repairloop.core.service.RepairDecisionEngine;
import com.repairloop.core.service.RepairTracker;
import com.repairloop.core.service.VendorOfferManager;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Runnable academic demonstration of the RepairLoopCore Java 21 business logic module.
 */
public class Main {
    public static void main(String[] args) {
        printHeader("FixFlip — Plain Java 21 Business Logic Demonstration");

        // 1. Create a Repair Request
        System.out.println("\n1. CREATING REPAIR REQUEST");
        RepairRequest request = new RepairRequest(
                "REQ-2026-1042",
                "cust_001",
                "Ananya Sharma",
                "Laptops & Computers",
                "ThinkPad X1 Carbon Gen 10",
                "Lenovo",
                "21CB-000AUS",
                2.5,
                LocalDate.of(2024, 5, 14),
                1450.00,
                1399.00,
                0,
                0.00,
                false,
                "USB-C charging IC failure and degraded battery capacity (58%).",
                "Seattle, WA");
        System.out.println("   " + request.getSummary());

        // 2. Run Repair Decision Engine
        System.out.println("\n2. RUNNING REPAIR-VS-REPLACE DECISION ENGINE");
        RepairDecisionEngine decisionEngine = new RepairDecisionEngine();
        DecisionInput input = new DecisionInput(
                request.getOriginalPrice(),
                request.getAgeYears(),
                265.00,
                request.getReplacementPrice(),
                request.getPreviousRepairCount(),
                request.getPreviousRepairCost(),
                3.5,
                request.isRecurringFault());
        DecisionResult decision = decisionEngine.evaluate(input);
        System.out.printf("   Repair Score:       %d / 100%n", decision.getRepairScore());
        System.out.printf("   Replacement Score:  %d / 100%n", decision.getReplacementScore());
        System.out.printf("   Repair Cost Ratio:  %.1f%%%n", decision.getRepairCostPercentage());
        System.out.printf("   Estimated Savings:  $%.2f%n", decision.getEstimatedSavings());
        System.out.printf("   Recommendation:     %s%n", decision.getRecommendation());
        System.out.println("   Factor Breakdown:   " + decision.getFactorRepairPoints());
        System.out.println("   Explanation:        " + decision.getExplanation());

        // 3. Create Multiple Quotations
        System.out.println("\n3. SUBMITTING & COMPARING MECHANIC QUOTATIONS");
        QuotationManager quotationManager = new QuotationManager();
        Quotation q1 = new Quotation("QT-901", request.getId(), "mech_01", "Precision Boardworks",
                310.00, "OEM Battery + TPS65987 Controller IC", 4, 3.0,
                "Micro-solder power delivery controller and replace battery pack.", "90-day workmanship warranty");
        Quotation q2 = new Quotation("QT-902", request.getId(), "mech_02", "Cascade Tech Bench",
                265.00, "Genuine Lenovo Battery + USB-C Power IC", 2, 3.5,
                "Full motherboard power-rail diagnostic and OEM cell swap.", "Same-week turnaround");
        Quotation q3 = new Quotation("QT-903", request.getId(), "mech_03", "Metro Microelectronics",
                295.00, "Replacement Power IC + Thermal Paste", 3, 2.5,
                "Replace power delivery IC and clean cooling fan assembly.", "Pickup available");

        quotationManager.addQuotation(request, q1);
        quotationManager.addQuotation(request, q2);
        quotationManager.addQuotation(request, q3);

        List<Quotation> comparedQuotes = quotationManager.compareQuotations(request.getId());
        for (Quotation q : comparedQuotes) {
            System.out.println("   " + q.getProposalSummary());
        }

        // 4. Accept One Quotation & Prevent Duplicate Acceptance
        System.out.println("\n4. ACCEPTING SELECTED QUOTATION (QT-902)");
        Quotation acceptedQuote = quotationManager.acceptQuotation(request, "QT-902");
        System.out.println("   Accepted: " + acceptedQuote.getProposalSummary());
        for (Quotation q : quotationManager.compareQuotations(request.getId())) {
            System.out.println("   Post-Acceptance State -> " + q.getQuotationId() + ": " + q.getStatus());
        }
        try {
            quotationManager.acceptQuotation(request, "QT-901");
        } catch (DuplicateAcceptanceException ex) {
            System.out.println("   [Guard Verified] Blocked duplicate quotation acceptance: " + ex.getMessage());
        }

        // 5. Update Repair Status via RepairTracker State Machine
        System.out.println("\n5. TRACKING REPAIR STATUS TRANSITIONS");
        RepairTracker tracker = new RepairTracker();
        System.out.println("   Current Status: " + request.getStatus() + " (" + request.getStatus().getDisplayLabel() + ")");
        tracker.updateStatus(request, RepairStatus.REPAIR_IN_PROGRESS);
        System.out.println("   Updated Status: " + request.getStatus() + " (" + request.getStatus().getDisplayLabel() + ")");
        tracker.updateStatus(request, RepairStatus.REPAIR_COMPLETED);
        System.out.println("   Updated Status: " + request.getStatus() + " (" + request.getStatus().getDisplayLabel() + ")");
        try {
            tracker.updateStatus(request, RepairStatus.PENDING);
        } catch (InvalidStatusTransitionException ex) {
            System.out.println("   [Guard Verified] Blocked invalid status transition: " + ex.getMessage());
        }

        // 6. Create Vendor Offers for a Resale Listing
        System.out.println("\n6. RESALE MARKETPLACE & VENDOR OFFERS");
        ResaleListing listing = new ResaleListing(
                "RSL-2026-3088",
                "cust_001",
                "Ananya Sharma",
                "Breville Barista Express",
                "Kitchen Appliances",
                "Breville",
                "BES870XL",
                4.0,
                "GOOD",
                360.00,
                "Seattle, WA",
                "Descaled quarterly; steam wand pressure steady; includes portafilter and baskets.");
        System.out.println("   " + listing.getSummary());

        VendorOfferManager offerManager = new VendorOfferManager();
        VendorOffer o1 = new VendorOffer("OFF-501", listing.getId(), "vend_01", "Pacific Refurbished Goods",
                325.00, "Can collect within 24 hours; cash or instant transfer.");
        VendorOffer o2 = new VendorOffer("OFF-502", listing.getId(), "vend_02", "Northwind Circular Appliances",
                355.00, "Matches our refurbished espresso stock; ready for immediate pickup.");
        offerManager.addOffer(listing, o1);
        offerManager.addOffer(listing, o2);

        for (VendorOffer offer : offerManager.compareOffers(listing.getId())) {
            System.out.println("   " + offer.getProposalSummary());
        }

        // Demonstrate Polymorphism using EvaluableProposal
        System.out.println("\n   [Polymorphism Demo: Uniform EvaluableProposal Summary]");
        List<EvaluableProposal> allProposals = new ArrayList<>();
        allProposals.add(acceptedQuote);
        allProposals.addAll(offerManager.compareOffers(listing.getId()));
        for (EvaluableProposal proposal : allProposals) {
            System.out.printf("   - Proposal %s for %s ($%.2f by %s)%n",
                    proposal.getProposalId(), proposal.getTargetEntityId(),
                    proposal.getMonetaryAmount(), proposal.getProviderName());
        }

        // 7. Accept One Vendor Offer & Prevent Duplicate Purchase
        System.out.println("\n7. ACCEPTING VENDOR OFFER (OFF-502)");
        VendorOffer winningOffer = offerManager.acceptOffer(listing, "OFF-502");
        System.out.println("   Winning Offer: " + winningOffer.getProposalSummary());
        System.out.println("   Updated Listing: " + listing.getSummary());
        for (VendorOffer offer : offerManager.compareOffers(listing.getId())) {
            System.out.println("   Post-Sale Offer State -> " + offer.getOfferId() + ": " + offer.getStatus());
        }
        try {
            offerManager.acceptOffer(listing, "OFF-501");
        } catch (DuplicateAcceptanceException ex) {
            System.out.println("   [Guard Verified] Blocked duplicate listing purchase: " + ex.getMessage());
        }

        printHeader("Demonstration Complete");
    }

    private static void printHeader(String title) {
        System.out.println("========================================================================");
        System.out.println("  " + title);
        System.out.println("========================================================================");
    }
}
