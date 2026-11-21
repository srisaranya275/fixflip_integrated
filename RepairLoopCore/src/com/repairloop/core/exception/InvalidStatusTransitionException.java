package com.repairloop.core.exception;

/**
 * Thrown when an invalid state transition is attempted in the repair lifecycle.
 */
public class InvalidStatusTransitionException extends RuntimeException {
    public InvalidStatusTransitionException(String message) {
        super(message);
    }
}
