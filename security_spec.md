# RepairLoop Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity & Role Integrity**: A `UserProfile` at `/users/{userId}` can only be read/created/updated by `userId == request.auth.uid`, never listed globally (`allow list: if false`), and `role` is restricted to `CUSTOMER`, `MECHANIC`, or `VENDOR` and is strictly immutable after creation.
2. **Repair Request Lifecycle**: A `RepairRequest` starts in `PENDING` (`quotationCount == 0`) created by its `customerId == request.auth.uid` (who has `CUSTOMER` role). Once `REPAIR_COMPLETED` or `CANCELLED`, it is terminally locked against further mutations.
3. **Quotation Confidentiality & Relational Integrity**: A `Quotation` can only be created by a `MECHANIC` referencing an existing open `RepairRequest` whose `customerId` matches `quotation.customerId`. Only the submitting `mechanicId` and the request's `customerId` can read/list that quotation. Competing mechanics are strictly denied.
4. **Single Quotation Acceptance**: Only the request's `customerId` can transition a `PENDING` quotation to `ACCEPTED` or `REJECTED`, and only while the parent request is in `PENDING` or `QUOTATION_RECEIVED`. Accepted/rejected quotations are terminally locked.
5. **Status Transition Guards**: Only the `acceptedMechanicId` can advance a `RepairRequest` from `QUOTATION_ACCEPTED` -> `REPAIR_IN_PROGRESS` -> `REPAIR_COMPLETED`.
6. **Resale & Vendor Offer Confidentiality**: A `VendorOffer` can only be created by a `VENDOR` for an existing open `ResaleListing`. Only the submitting `vendorId` and the listing's `sellerId` can read/list that offer. Competing vendors are strictly denied. Once a `ResaleListing` transitions to `SOLD`, it is terminally locked against duplicate purchases.
7. **Warranty & Notification Isolation**: `WarrantyRecord` documents are strictly owner-only (`ownerId == request.auth.uid`). `Notification` documents are strictly recipient-only for reads and read-flag updates.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Privilege Escalation on Signup**: `POST /users/u1` with `{ role: "ADMIN" }` -> DENIED (role allowlist only permits `CUSTOMER`, `MECHANIC`, `VENDOR`).
2. **Role Mutation Post-Signup**: `PATCH /users/u1` updating `{ role: "MECHANIC" }` -> DENIED (immutable `role` + `affectedKeys().hasOnly(['fullName', 'location', 'updatedAt'])`).
3. **PII Scraping via List**: `LIST /users` by any signed-in user -> DENIED (`allow list: if false`).
4. **Shadow Field Injection**: `POST /repairRequests/r1` with extra `{ isApproved: true }` -> DENIED (`keys().hasOnly(...)`).
5. **Spoofed Customer ID**: `POST /repairRequests/r1` by `u2` with `{ customerId: "u1" }` -> DENIED (`customerId == request.auth.uid`).
6. **Competing Mechanic Snooping**: `GET /quotations/q1` by mechanic `m2` where `q1.mechanicId == "m1"` -> DENIED.
7. **Orphaned Quotation**: `POST /quotations/q2` with nonexistent `requestId: "fake_req"` -> DENIED (`exists(...)`).
8. **Customer Spoofing Mechanic Quote**: `POST /quotations/q3` by a user whose profile role is `CUSTOMER` -> DENIED (`isMechanicRole()`).
9. **State Shortcutting Repair Status**: `PATCH /repairRequests/r1` jumping `PENDING` directly to `REPAIR_COMPLETED` -> DENIED.
10. **Competing Vendor Snooping**: `LIST /vendorOffers` by vendor `v2` querying offers for `listing1` -> DENIED unless `where('vendorId', '==', 'v2')`.
11. **Double Purchase of Sold Listing**: `PATCH /resaleListings/l1` when `status == "SOLD"` -> DENIED (terminal lock).
12. **Unverified / Forged Timestamp Write**: `POST /warranties/w1` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> DENIED.
