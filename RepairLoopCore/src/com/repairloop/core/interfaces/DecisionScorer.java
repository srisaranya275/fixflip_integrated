package com.repairloop.core.interfaces;

import com.repairloop.core.model.DecisionInput;
import com.repairloop.core.model.DecisionResult;

/**
 * Strategy interface for evaluating Repair-vs-Replace trade-offs.
 */
public interface DecisionScorer {
    DecisionResult evaluate(DecisionInput input);
}
