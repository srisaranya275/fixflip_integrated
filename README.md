# FixFlip — Repair. Reuse. Renew.

**FixFlip** is a full-stack electronics and household appliance repair, warranty registry, resale marketplace, and Repair-vs-Replace decision platform.

---

## Architecture Overview

1. **Web Application (React + TypeScript + Tailwind CSS)**
   - Role-based dashboards for **Customer**, **Mechanic**, and **Vendor**.
   - Full repair ticket lifecycle (`PENDING` -> `QUOTATION_RECEIVED` -> `QUOTATION_ACCEPTED` -> `REPAIR_IN_PROGRESS` -> `REPAIR_COMPLETED` / `CANCELLED`).
   - Confidential mechanic quotation bidding and atomic single-winner acceptance.
   - Product warranty register with automatic expiry calculation (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED`).
   - Resale marketplace with confidential vendor buyout offers and single-sale locking.
   - Interactive Repair-vs-Replace Decision Engine with transparent 100-point weighted scoring.

2. **Database & Authentication (Firebase)**
   - Firebase Authentication (Google Sign-In pre-configured; Email/Password supported when enabled in Firebase Console).
   - Cloud Firestore persistence with hardened security rules (`firestore.rules`) and schema blueprint (`firebase-blueprint.json`).
   - Database-level enforcement preventing mechanics from reading competing mechanic quotes and preventing vendors from reading competing vendor offers.

3. **Core Business Logic Module (`RepairLoopCore` — Plain Java 21, No Spring Boot)**
   - Located in `/RepairLoopCore`.
   - Object-oriented domain architecture using abstract base classes, interfaces, polymorphism, `HashMap`/`ArrayList`/`EnumMap`, enums, and custom exceptions.
   - Includes `RepairDecisionEngine`, `QuotationManager`, `RepairTracker`, `VendorOfferManager`, runnable `Main.java`, and a dependency-free `RepairLoopHttpServer` (`com.sun.net.httpserver.HttpServer`).

---

## Running the Web Frontend

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000`.

### Enabling Email/Password Authentication (Optional)
Google Sign-In is configured out of the box. To also allow Email/Password registration in Firebase:
1. Open the [Firebase Console](https://console.firebase.google.com/) for your project.
2. Navigate to **Authentication -> Sign-in method**.
3. Enable **Email/Password**.

---

## Compiling & Running the Java 21 Core Module (`RepairLoopCore`)

Requires **Java 21+** (JDK):

```bash
cd RepairLoopCore
mkdir -p out
javac -d out $(find src -name "*.java")

# Run the full 7-step academic demonstration
java -cp out com.repairloop.core.Main
```

### Optional: Connecting the Web Decision Engine to Java 21 Locally

Start the lightweight built-in Java HTTP server (no Spring Boot or external JARs required):

```bash
cd RepairLoopCore
java -cp out com.repairloop.core.server.RepairLoopHttpServer 8080
```

Then open the **Decision Engine** tab in the FixFlip web app to evaluate live via the Java 21 HTTP bridge. When the local Java server is not running (such as in cloud preview), the web app transparently evaluates using its mirrored TypeScript fallback engine.
