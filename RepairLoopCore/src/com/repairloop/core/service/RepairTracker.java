package com.repairloop.core.service;

import com.repairloop.core.exception.DomainValidationException;
import com.repairloop.core.exception.InvalidStatusTransitionException;
import com.repairloop.core.interfaces.Trackable;
import com.repairloop.core.model.RepairStatus;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Enforces deterministic repair workflow status transitions using an EnumMap state machine.
 */
public class RepairTracker {
    private static final Map<RepairStatus, Set<RepairStatus>> ALLOWED_TRANSITIONS = new EnumMap<>(RepairStatus.class);

    static {
        ALLOWED_TRANSITIONS.put(RepairStatus.PENDING,
                EnumSet.of(RepairStatus.QUOTATION_RECEIVED, RepairStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(RepairStatus.QUOTATION_RECEIVED,
                EnumSet.of(RepairStatus.QUOTATION_ACCEPTED, RepairStatus.CANCELLED));
        ALLOWED_TRANSITIONS.put(RepairStatus.QUOTATION_ACCEPTED,
                EnumSet.of(RepairStatus.REPAIR_IN_PROGRESS));
        ALLOWED_TRANSITIONS.put(RepairStatus.REPAIR_IN_PROGRESS,
                EnumSet.of(RepairStatus.REPAIR_COMPLETED));
        ALLOWED_TRANSITIONS.put(RepairStatus.REPAIR_COMPLETED, EnumSet.noneOf(RepairStatus.class));
        ALLOWED_TRANSITIONS.put(RepairStatus.CANCELLED, EnumSet.noneOf(RepairStatus.class));
    }

    public boolean isTransitionAllowed(RepairStatus current, RepairStatus next) {
        if (current == null || next == null) {
            return false;
        }
        return ALLOWED_TRANSITIONS.getOrDefault(current, EnumSet.noneOf(RepairStatus.class)).contains(next);
    }

    public void updateStatus(Trackable entity, RepairStatus nextStatus) {
        if (entity == null || nextStatus == null) {
            throw new DomainValidationException("Trackable entity and nextStatus must not be null.");
        }
        RepairStatus current = entity.getStatus();
        if (!isTransitionAllowed(current, nextStatus)) {
            throw new InvalidStatusTransitionException(
                    String.format("Invalid status transition for %s: cannot move from %s to %s.",
                            entity.getTrackingId(), current, nextStatus));
        }
        entity.setStatus(nextStatus);
    }
}
