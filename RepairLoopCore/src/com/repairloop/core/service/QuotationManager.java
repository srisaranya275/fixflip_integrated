package com.repairloop.core.service;

import com.repairloop.core.exception.DomainValidationException;
import com.repairloop.core.exception.DuplicateAcceptanceException;
import com.repairloop.core.model.Quotation;
import com.repairloop.core.model.QuotationStatus;
import com.repairloop.core.model.RepairRequest;
import com.repairloop.core.model.RepairStatus;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Manages mechanic quotations per repair request using Java Collections.
 * Enforces single-acceptance and automatic rejection of competing quotations.
 */
public class QuotationManager {
    private final Map<String, List<Quotation>> quotationsByRequest = new HashMap<>();
    private final Map<String, String> acceptedQuotationByRequest = new HashMap<>();

    public void addQuotation(RepairRequest request, Quotation quotation) {
        if (request == null || quotation == null) {
            throw new DomainValidationException("Request and quotation must not be null.");
        }
        if (!request.getId().equals(quotation.getRequestId())) {
            throw new DomainValidationException("Quotation requestId does not match RepairRequest ID.");
        }
        if (acceptedQuotationByRequest.containsKey(request.getId())) {
            throw new DuplicateAcceptanceException(
                    "Cannot submit quotation: request " + request.getId() + " already has an accepted quotation.");
        }

        List<Quotation> list = quotationsByRequest.computeIfAbsent(request.getId(), k -> new ArrayList<>());
        list.add(quotation);

        if (request.getStatus() == RepairStatus.PENDING) {
            request.setStatus(RepairStatus.QUOTATION_RECEIVED);
        }
    }

    /**
     * Returns quotations sorted by lowest estimated cost, then shortest completion time.
     */
    public List<Quotation> compareQuotations(String requestId) {
        List<Quotation> list = quotationsByRequest.getOrDefault(requestId, Collections.emptyList());
        List<Quotation> sorted = new ArrayList<>(list);
        Collections.sort(sorted);
        return Collections.unmodifiableList(sorted);
    }

    /**
     * Validates and accepts one quotation while rejecting all competing quotations
     * for the same request. Prevents duplicate acceptance.
     */
    public Quotation acceptQuotation(RepairRequest request, String quotationId) {
        if (request == null || quotationId == null || quotationId.isBlank()) {
            throw new DomainValidationException("Valid repair request and quotationId are required.");
        }
        if (acceptedQuotationByRequest.containsKey(request.getId())) {
            throw new DuplicateAcceptanceException(
                    "Quotation already accepted for request " + request.getId()
                            + " (accepted ID: " + acceptedQuotationByRequest.get(request.getId()) + ").");
        }

        List<Quotation> list = quotationsByRequest.get(request.getId());
        if (list == null || list.isEmpty()) {
            throw new DomainValidationException("No quotations exist for request " + request.getId());
        }

        Quotation target = null;
        for (Quotation q : list) {
            if (q.getQuotationId().equals(quotationId)) {
                target = q;
                break;
            }
        }
        if (target == null) {
            throw new DomainValidationException("Quotation " + quotationId + " not found for request " + request.getId());
        }
        if (target.getStatus() != QuotationStatus.PENDING) {
            throw new DuplicateAcceptanceException("Quotation " + quotationId + " is not in PENDING state.");
        }

        for (Quotation q : list) {
            if (q.getQuotationId().equals(quotationId)) {
                q.setStatus(QuotationStatus.ACCEPTED);
            } else {
                q.setStatus(QuotationStatus.REJECTED);
            }
        }

        acceptedQuotationByRequest.put(request.getId(), target.getQuotationId());
        request.setAcceptedQuotationId(target.getQuotationId());
        request.setAcceptedMechanicName(target.getMechanicName());
        request.setStatus(RepairStatus.QUOTATION_ACCEPTED);

        return target;
    }
}
