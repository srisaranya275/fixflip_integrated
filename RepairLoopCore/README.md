# RepairLoopCore (Java 21 Core Business Logic Module)

`RepairLoopCore` is a pure, framework-free **Java 21** object-oriented module containing the core domain models, decision scoring logic, quotation manager, repair workflow state machine, and vendor offer manager for **RepairLoop**.

No Spring Boot, Maven, or external third-party JARs are required.

---

## Package Structure

```text
RepairLoopCore/
└── src/com/repairloop/core/
    ├── Main.java                                  # Runnable end-to-end demonstration
    ├── exception/
    │   ├── DomainValidationException.java
    │   ├── DuplicateAcceptanceException.java
    │   └── InvalidStatusTransitionException.java
    ├── interfaces/
    │   ├── DecisionScorer.java
    │   ├── EvaluableProposal.java                 # Polymorphic contract for Quotes & Offers
    │   └── Trackable.java
    ├── model/
    │   ├── AssetItem.java                         # Abstract base class (inheritance)
    │   ├── DecisionInput.java
    │   ├── DecisionResult.java
    │   ├── ListingStatus.java
    │   ├── OfferStatus.java
    │   ├── Quotation.java
    │   ├── QuotationStatus.java
    │   ├── RecommendationType.java
    │   ├── RepairRequest.java
    │   ├── RepairStatus.java
    │   ├── ResaleListing.java
    │   └── VendorOffer.java
    ├── server/
    │   └── RepairLoopHttpServer.java              # Built-in Java HttpServer REST bridge
    └── service/
        ├── QuotationManager.java                  # HashMap + ArrayList quotation lifecycle
        ├── RepairDecisionEngine.java              # Transparent weighted scoring algorithm
        ├── RepairTracker.java                     # EnumMap transition state machine
        └── VendorOfferManager.java                # Confidential offer ranking & single-sale lock
```

---

## Compiling and Running (Java 21+)

From the `RepairLoopCore` directory:

```bash
# 1. Compile all Java sources
mkdir -p out
javac -d out $(find src -name "*.java")

# 2. Run the end-to-end academic demonstration
java -cp out com.repairloop.core.Main
```

### Optional: Run the Lightweight Java HTTP Server Bridge

`RepairLoopHttpServer` uses `com.sun.net.httpserver.HttpServer` (built into the JDK) on port `8080`:

```bash
java -cp out com.repairloop.core.server.RepairLoopHttpServer 8080
```

Endpoints exposed:
- `GET http://localhost:8080/api/health`
- `POST http://localhost:8080/api/decision/evaluate`

In the RepairLoop web application's **Decision Engine** tab, you can switch between the **Local Browser Engine** (always available in cloud preview) and the **Java 21 HTTP Bridge (`http://localhost:8080`)** when running `RepairLoopHttpServer` locally.
