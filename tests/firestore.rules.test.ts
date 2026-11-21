/**
 * RepairLoop Firestore Security Rules — Adversarial Dirty Dozen Payload Spec
 * Documents all 12 adversarial vectors verified against firestore.rules.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  targetPath: string;
  operation: 'create' | 'update' | 'get' | 'list';
  payload: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedBy: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Privilege Escalation on Signup',
    targetPath: '/users/attacker_uid',
    operation: 'create',
    payload: { uid: 'attacker_uid', fullName: 'Eve', email: 'eve@example.com', role: 'ADMIN' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: "data.role in ['CUSTOMER', 'MECHANIC', 'VENDOR']",
  },
  {
    id: 2,
    name: 'Role Mutation Post-Signup',
    targetPath: '/users/u1',
    operation: 'update',
    payload: { role: 'MECHANIC' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: "incoming().role == existing().role && affectedKeys().hasOnly(['fullName', 'location', 'updatedAt'])",
  },
  {
    id: 3,
    name: 'PII Scraping via List',
    targetPath: '/users',
    operation: 'list',
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'allow list: if false;',
  },
  {
    id: 4,
    name: 'Shadow Field Injection',
    targetPath: '/repairRequests/req1',
    operation: 'create',
    payload: { customerId: 'u1', isApproved: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'data.keys().hasOnly([...])',
  },
  {
    id: 5,
    name: 'Spoofed Customer ID',
    targetPath: '/repairRequests/req2',
    operation: 'create',
    payload: { customerId: 'victim_uid', status: 'PENDING' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().customerId == request.auth.uid',
  },
  {
    id: 6,
    name: 'Competing Mechanic Snooping',
    targetPath: '/quotations/quote_from_m1',
    operation: 'get',
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'existing().mechanicId == request.auth.uid || existing().customerId == request.auth.uid',
  },
  {
    id: 7,
    name: 'Orphaned Quotation',
    targetPath: '/quotations/q_orphan',
    operation: 'create',
    payload: { requestId: 'nonexistent_id', mechanicId: 'm1', status: 'PENDING' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'exists(/databases/$(database)/documents/repairRequests/$(incoming().requestId))',
  },
  {
    id: 8,
    name: 'Customer Spoofing Mechanic Quote',
    targetPath: '/quotations/q_spoof',
    operation: 'create',
    payload: { requestId: 'req1', mechanicId: 'customer_uid', status: 'PENDING' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isMechanicRole()',
  },
  {
    id: 9,
    name: 'State Shortcutting Repair Status',
    targetPath: '/repairRequests/req1',
    operation: 'update',
    payload: { status: 'REPAIR_COMPLETED' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: "existing().status == 'REPAIR_IN_PROGRESS' && incoming().status == 'REPAIR_COMPLETED'",
  },
  {
    id: 10,
    name: 'Competing Vendor Snooping',
    targetPath: '/vendorOffers',
    operation: 'list',
    payload: { query: "where('listingId', '==', 'list1')" },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'resource.data.vendorId == request.auth.uid || resource.data.sellerId == request.auth.uid',
  },
  {
    id: 11,
    name: 'Double Purchase of Sold Listing',
    targetPath: '/resaleListings/sold_listing',
    operation: 'update',
    payload: { status: 'SOLD', buyerVendorId: 'v2' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: "existing().status != 'SOLD'",
  },
  {
    id: 12,
    name: 'Forged Timestamp Write',
    targetPath: '/warranties/w1',
    operation: 'create',
    payload: { ownerId: 'u1', createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().createdAt == request.time',
  },
];
