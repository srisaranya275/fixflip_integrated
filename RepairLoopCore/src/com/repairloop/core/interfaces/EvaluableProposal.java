package com.repairloop.core.interfaces;

/**
 * Polymorphic contract shared by Quotations and VendorOffers so proposals
 * from mechanics and vendors can be inspected and summarized uniformly.
 */
public interface EvaluableProposal {
    String getProposalId();
    String getTargetEntityId();
    String getProviderName();
    double getMonetaryAmount();
    String getProposalSummary();
}
