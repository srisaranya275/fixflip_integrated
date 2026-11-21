package com.repairloop.core.exception;

/**
 * Thrown when attempting to accept a second quotation or second vendor offer
 * for an entity that has already been accepted or sold.
 */
public class DuplicateAcceptanceException extends RuntimeException {
    public DuplicateAcceptanceException(String message) {
        super(message);
    }
}
