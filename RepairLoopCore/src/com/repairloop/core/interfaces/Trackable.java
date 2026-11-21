package com.repairloop.core.interfaces;

import com.repairloop.core.model.RepairStatus;

/**
 * Contract for domain entities whose repair workflow progress is tracked.
 */
public interface Trackable {
    String getTrackingId();
    RepairStatus getStatus();
    void setStatus(RepairStatus nextStatus);
}
