package com.repairloop.core.exception;

/**
 * Thrown when domain inputs fail validation constraints (e.g., negative prices).
 */
public class DomainValidationException extends IllegalArgumentException {
    public DomainValidationException(String message) {
        super(message);
    }
}
