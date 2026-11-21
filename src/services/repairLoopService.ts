import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  AppNotification,
  ListingCondition,
  Quotation,
  RepairRequest,
  RepairStatus,
  ResaleListing,
  TransactionStatus,
  UserProfile,
  UserRole,
  VendorOffer,
  WarrantyRecord,
} from '../types/domain';
import { generateShortCode } from '../utils/warranty';

function clip(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function sortByCreatedDesc<T extends { createdAt?: { toMillis?: () => number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bMs = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bMs - aMs;
  });
}

// -----------------------------------------------------------------------------
// User Profile
// -----------------------------------------------------------------------------
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function createUserProfile(params: {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  location?: string;
}): Promise<UserProfile> {
  const path = `users/${params.uid}`;
  try {
    const payload: Record<string, unknown> = {
      uid: params.uid,
      fullName: clip(params.fullName, 80) || 'FixFlip Member',
      email: clip(params.email, 120),
      role: params.role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (params.location && params.location.trim()) {
      payload.location = clip(params.location, 120);
    }
    await setDoc(doc(db, 'users', params.uid), payload);
    const created = await getDoc(doc(db, 'users', params.uid));
    return created.data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  params: { fullName: string; location?: string }
): Promise<UserProfile> {
  const path = `users/${uid}`;
  const cleanName = clip(params.fullName, 80);
  if (cleanName.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }
  try {
    await updateDoc(doc(db, 'users', uid), {
      fullName: cleanName,
      location: clip(params.location || '', 120),
      updatedAt: serverTimestamp(),
    });
    const updated = await getDoc(doc(db, 'users', uid));
    return updated.data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// -----------------------------------------------------------------------------
// Repair Requests
// -----------------------------------------------------------------------------
export interface CreateRepairRequestInput {
  customerId: string;
  customerName: string;
  category: string;
  productName: string;
  brand: string;
  modelNumber: string;
  productAgeYears: number;
  purchaseDate: string;
  originalPrice: number;
  replacementPrice: number;
  previousRepairCount: number;
  previousRepairCost: number;
  recurringFault: boolean;
  problemDescription: string;
  location: string;
  imageUrl?: string;
}

export async function createRepairRequest(input: CreateRepairRequestInput): Promise<string> {
  const ref = doc(collection(db, 'repairRequests'));
  const path = `repairRequests/${ref.id}`;
  try {
    const payload: Record<string, unknown> = {
      requestCode: generateShortCode('REQ'),
      customerId: input.customerId,
      customerName: clip(input.customerName, 80),
      category: clip(input.category, 60),
      productName: clip(input.productName, 100),
      brand: clip(input.brand, 60),
      modelNumber: clip(input.modelNumber, 60),
      productAgeYears: Math.max(0, Math.min(50, Number(input.productAgeYears))),
      purchaseDate: input.purchaseDate.slice(0, 10),
      originalPrice: Math.max(1, Math.min(1000000, Number(input.originalPrice))),
      replacementPrice: Math.max(1, Math.min(1000000, Number(input.replacementPrice))),
      previousRepairCount: Math.max(0, Math.min(100, Math.round(Number(input.previousRepairCount)))),
      previousRepairCost: Math.max(0, Math.min(1000000, Number(input.previousRepairCost))),
      recurringFault: Boolean(input.recurringFault),
      problemDescription: clip(input.problemDescription, 1500),
      location: clip(input.location, 120),
      status: 'PENDING',
      quotationCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.imageUrl && input.imageUrl.length <= 250000) {
      payload.imageUrl = input.imageUrl;
    }
    await setDoc(ref, payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function cancelRepairRequest(requestId: string): Promise<void> {
  const path = `repairRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'repairRequests', requestId), {
      status: 'CANCELLED',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function advanceRepairStatus(
  request: RepairRequest,
  nextStatus: 'REPAIR_IN_PROGRESS' | 'REPAIR_COMPLETED'
): Promise<void> {
  const path = `repairRequests/${request.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'repairRequests', request.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });

    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      recipientId: request.customerId,
      title:
        nextStatus === 'REPAIR_IN_PROGRESS'
          ? `Repair Started (${request.requestCode})`
          : `Repair Completed (${request.requestCode})`,
      message:
        nextStatus === 'REPAIR_IN_PROGRESS'
          ? `${request.acceptedMechanicName || 'Your mechanic'} has started repairing ${request.productName}.`
          : `${request.productName} repair has been marked completed by ${request.acceptedMechanicName || 'your mechanic'}.`,
      relatedType: 'REPAIR_REQUEST',
      relatedId: request.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeCustomerRepairRequests(
  customerId: string,
  onData: (items: RepairRequest[]) => void
): Unsubscribe {
  const q = query(collection(db, 'repairRequests'), where('customerId', '==', customerId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RepairRequest, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'repairRequests')
  );
}

export function subscribeOpenRepairRequests(onData: (items: RepairRequest[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'repairRequests'),
    where('status', 'in', ['PENDING', 'QUOTATION_RECEIVED'])
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RepairRequest, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'repairRequests')
  );
}

export function subscribeMechanicAssignedRequests(
  mechanicId: string,
  onData: (items: RepairRequest[]) => void
): Unsubscribe {
  const q = query(collection(db, 'repairRequests'), where('acceptedMechanicId', '==', mechanicId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RepairRequest, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'repairRequests')
  );
}

// -----------------------------------------------------------------------------
// Quotations
// -----------------------------------------------------------------------------
export async function submitQuotation(params: {
  request: RepairRequest;
  mechanicId: string;
  mechanicName: string;
  estimatedCost: number;
  spareParts: string;
  completionTimeDays: number;
  additionalLifespanYears: number;
  repairDescription: string;
  notes?: string;
}): Promise<string> {
  const quoteRef = doc(collection(db, 'quotations'));
  const path = `quotations/${quoteRef.id}`;
  try {
    const batch = writeBatch(db);
    const payload: Record<string, unknown> = {
      requestId: params.request.id,
      requestCode: params.request.requestCode,
      productName: clip(params.request.productName, 100),
      customerId: params.request.customerId,
      mechanicId: params.mechanicId,
      mechanicName: clip(params.mechanicName, 80),
      estimatedCost: Math.max(1, Math.min(1000000, Number(params.estimatedCost))),
      spareParts: clip(params.spareParts, 300),
      completionTimeDays: Math.max(1, Math.min(365, Math.round(Number(params.completionTimeDays)))),
      additionalLifespanYears: Math.max(0.5, Math.min(30, Number(params.additionalLifespanYears))),
      repairDescription: clip(params.repairDescription, 1000),
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (params.notes && params.notes.trim()) {
      payload.notes = clip(params.notes, 600);
    }
    batch.set(quoteRef, payload);

    batch.update(doc(db, 'repairRequests', params.request.id), {
      status: 'QUOTATION_RECEIVED' as RepairStatus,
      quotationCount: (params.request.quotationCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });

    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      recipientId: params.request.customerId,
      title: `New Quotation for ${params.request.requestCode}`,
      message: `${clip(params.mechanicName, 60)} submitted a quote of $${Number(params.estimatedCost).toFixed(2)} for ${params.request.productName}.`,
      relatedType: 'QUOTATION',
      relatedId: quoteRef.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return quoteRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateQuotation(params: {
  quotationId: string;
  estimatedCost: number;
  spareParts: string;
  completionTimeDays: number;
  additionalLifespanYears: number;
  repairDescription: string;
  notes?: string;
}): Promise<void> {
  const path = `quotations/${params.quotationId}`;
  try {
    await updateDoc(doc(db, 'quotations', params.quotationId), {
      estimatedCost: Math.max(1, Math.min(1000000, Number(params.estimatedCost))),
      spareParts: clip(params.spareParts, 300),
      completionTimeDays: Math.max(1, Math.min(365, Math.round(Number(params.completionTimeDays)))),
      additionalLifespanYears: Math.max(0.5, Math.min(30, Number(params.additionalLifespanYears))),
      repairDescription: clip(params.repairDescription, 1000),
      notes: clip(params.notes || '', 600),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function acceptQuotation(params: {
  request: RepairRequest;
  selectedQuotation: Quotation;
  allQuotationsForRequest: Quotation[];
}): Promise<void> {
  const path = `repairRequests/${params.request.id}`;
  if (
    params.request.status !== 'PENDING' &&
    params.request.status !== 'QUOTATION_RECEIVED'
  ) {
    throw new Error('A quotation has already been accepted or the request is closed.');
  }
  try {
    const batch = writeBatch(db);

    for (const q of params.allQuotationsForRequest) {
      if (q.status === 'PENDING') {
        batch.update(doc(db, 'quotations', q.id), {
          status: q.id === params.selectedQuotation.id ? 'ACCEPTED' : 'REJECTED',
          updatedAt: serverTimestamp(),
        });
      }
    }

    batch.update(doc(db, 'repairRequests', params.request.id), {
      status: 'QUOTATION_ACCEPTED',
      acceptedQuotationId: params.selectedQuotation.id,
      acceptedMechanicId: params.selectedQuotation.mechanicId,
      acceptedMechanicName: clip(params.selectedQuotation.mechanicName, 80),
      acceptedQuoteCost: params.selectedQuotation.estimatedCost,
      updatedAt: serverTimestamp(),
    });

    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      recipientId: params.selectedQuotation.mechanicId,
      title: `Quotation Accepted (${params.request.requestCode})`,
      message: `${params.request.customerName} accepted your $${params.selectedQuotation.estimatedCost.toFixed(2)} quote for ${params.request.productName}.`,
      relatedType: 'QUOTATION',
      relatedId: params.selectedQuotation.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeCustomerQuotations(
  customerId: string,
  onData: (items: Quotation[]) => void
): Unsubscribe {
  const q = query(collection(db, 'quotations'), where('customerId', '==', customerId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Quotation, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'quotations')
  );
}

export function subscribeMechanicQuotations(
  mechanicId: string,
  onData: (items: Quotation[]) => void
): Unsubscribe {
  const q = query(collection(db, 'quotations'), where('mechanicId', '==', mechanicId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Quotation, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'quotations')
  );
}

// -----------------------------------------------------------------------------
// Warranty Register
// -----------------------------------------------------------------------------
export async function createWarranty(params: {
  ownerId: string;
  productName: string;
  brand: string;
  serialOrImei: string;
  purchaseDate: string;
  warrantyDurationMonths: number;
  purchasePrice: number;
}): Promise<string> {
  const ref = doc(collection(db, 'warranties'));
  const path = `warranties/${ref.id}`;
  try {
    await setDoc(ref, {
      ownerId: params.ownerId,
      productName: clip(params.productName, 100),
      brand: clip(params.brand, 60),
      serialOrImei: clip(params.serialOrImei, 80),
      purchaseDate: params.purchaseDate.slice(0, 10),
      warrantyDurationMonths: Math.max(1, Math.min(240, Math.round(Number(params.warrantyDurationMonths)))),
      purchasePrice: Math.max(1, Math.min(1000000, Number(params.purchasePrice))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteWarranty(warrantyId: string): Promise<void> {
  const path = `warranties/${warrantyId}`;
  try {
    await deleteDoc(doc(db, 'warranties', warrantyId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeWarranties(
  ownerId: string,
  onData: (items: WarrantyRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, 'warranties'), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WarrantyRecord, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'warranties')
  );
}

// -----------------------------------------------------------------------------
// Resale Marketplace & Vendor Offers
// -----------------------------------------------------------------------------
export async function createResaleListing(params: {
  sellerId: string;
  sellerName: string;
  productName: string;
  category: string;
  brand: string;
  model: string;
  ageYears: number;
  condition: ListingCondition;
  expectedPrice: number;
  location: string;
  description: string;
  imageUrl?: string;
}): Promise<string> {
  const ref = doc(collection(db, 'resaleListings'));
  const path = `resaleListings/${ref.id}`;
  try {
    const payload: Record<string, unknown> = {
      listingCode: generateShortCode('RSL'),
      sellerId: params.sellerId,
      sellerName: clip(params.sellerName, 80),
      productName: clip(params.productName, 100),
      category: clip(params.category, 60),
      brand: clip(params.brand, 60),
      model: clip(params.model, 60),
      ageYears: Math.max(0, Math.min(50, Number(params.ageYears))),
      condition: params.condition,
      expectedPrice: Math.max(1, Math.min(1000000, Number(params.expectedPrice))),
      location: clip(params.location, 120),
      description: clip(params.description, 1500),
      status: 'AVAILABLE',
      offerCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (params.imageUrl && params.imageUrl.length <= 250000) {
      payload.imageUrl = params.imageUrl;
    }
    await setDoc(ref, payload);
    return ref.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function submitVendorOffer(params: {
  listing: ResaleListing;
  vendorId: string;
  vendorName: string;
  offeredPrice: number;
  message: string;
}): Promise<string> {
  const offerRef = doc(collection(db, 'vendorOffers'));
  const path = `vendorOffers/${offerRef.id}`;
  try {
    const batch = writeBatch(db);
    batch.set(offerRef, {
      listingId: params.listing.id,
      listingCode: params.listing.listingCode,
      productName: clip(params.listing.productName, 100),
      sellerId: params.listing.sellerId,
      vendorId: params.vendorId,
      vendorName: clip(params.vendorName, 80),
      offeredPrice: Math.max(1, Math.min(1000000, Number(params.offeredPrice))),
      message: clip(params.message, 600),
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'resaleListings', params.listing.id), {
      status: 'OFFER_RECEIVED',
      offerCount: (params.listing.offerCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });

    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      recipientId: params.listing.sellerId,
      title: `New Vendor Offer (${params.listing.listingCode})`,
      message: `${clip(params.vendorName, 60)} offered $${Number(params.offeredPrice).toFixed(2)} for ${params.listing.productName}.`,
      relatedType: 'VENDOR_OFFER',
      relatedId: offerRef.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return offerRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function acceptVendorOffer(params: {
  listing: ResaleListing;
  selectedOffer: VendorOffer;
  allOffersForListing: VendorOffer[];
}): Promise<void> {
  const path = `resaleListings/${params.listing.id}`;
  if (params.listing.status === 'SOLD') {
    throw new Error('This product has already been sold.');
  }
  try {
    const batch = writeBatch(db);

    for (const o of params.allOffersForListing) {
      if (o.status === 'PENDING') {
        batch.update(doc(db, 'vendorOffers', o.id), {
          status: o.id === params.selectedOffer.id ? 'ACCEPTED' : 'REJECTED',
          updatedAt: serverTimestamp(),
        });
      }
    }

    batch.update(doc(db, 'resaleListings', params.listing.id), {
      status: 'SOLD',
      acceptedOfferId: params.selectedOffer.id,
      buyerVendorId: params.selectedOffer.vendorId,
      buyerVendorName: clip(params.selectedOffer.vendorName, 80),
      soldPrice: params.selectedOffer.offeredPrice,
      soldAt: serverTimestamp(),
      transactionStatus: 'CONFIRMED' as TransactionStatus,
      updatedAt: serverTimestamp(),
    });

    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      recipientId: params.selectedOffer.vendorId,
      title: `Offer Accepted (${params.listing.listingCode})`,
      message: `${params.listing.sellerName} accepted your $${params.selectedOffer.offeredPrice.toFixed(2)} offer for ${params.listing.productName}.`,
      relatedType: 'VENDOR_OFFER',
      relatedId: params.selectedOffer.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateResaleTransactionStatus(params: {
  listing: ResaleListing;
  nextStatus: 'PICKUP_SCHEDULED' | 'COMPLETED';
  actorRole: 'VENDOR' | 'CUSTOMER';
}): Promise<void> {
  const path = `resaleListings/${params.listing.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'resaleListings', params.listing.id), {
      transactionStatus: params.nextStatus,
      updatedAt: serverTimestamp(),
    });

    const recipientId =
      params.actorRole === 'VENDOR' ? params.listing.sellerId : params.listing.buyerVendorId;
    if (recipientId) {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        recipientId,
        title:
          params.nextStatus === 'PICKUP_SCHEDULED'
            ? `Pickup Scheduled (${params.listing.listingCode})`
            : `Transaction Completed (${params.listing.listingCode})`,
        message:
          params.nextStatus === 'PICKUP_SCHEDULED'
            ? `Pickup has been scheduled for ${params.listing.productName}.`
            : `The resale transaction for ${params.listing.productName} has been marked completed.`,
        relatedType: 'RESALE_LISTING',
        relatedId: params.listing.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function rejectVendorOffer(offerId: string): Promise<void> {
  const path = `vendorOffers/${offerId}`;
  try {
    await updateDoc(doc(db, 'vendorOffers', offerId), {
      status: 'REJECTED',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeCustomerResaleListings(
  sellerId: string,
  onData: (items: ResaleListing[]) => void
): Unsubscribe {
  const q = query(collection(db, 'resaleListings'), where('sellerId', '==', sellerId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ResaleListing, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'resaleListings')
  );
}

export function subscribeOpenResaleListings(onData: (items: ResaleListing[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'resaleListings'),
    where('status', 'in', ['AVAILABLE', 'OFFER_RECEIVED'])
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ResaleListing, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'resaleListings')
  );
}

export function subscribeVendorPurchasedListings(
  vendorId: string,
  onData: (items: ResaleListing[]) => void
): Unsubscribe {
  const q = query(collection(db, 'resaleListings'), where('buyerVendorId', '==', vendorId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ResaleListing, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'resaleListings')
  );
}

export function subscribeSellerOffers(
  sellerId: string,
  onData: (items: VendorOffer[]) => void
): Unsubscribe {
  const q = query(collection(db, 'vendorOffers'), where('sellerId', '==', sellerId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VendorOffer, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'vendorOffers')
  );
}

export function subscribeVendorOffers(
  vendorId: string,
  onData: (items: VendorOffer[]) => void
): Unsubscribe {
  const q = query(collection(db, 'vendorOffers'), where('vendorId', '==', vendorId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VendorOffer, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'vendorOffers')
  );
}

// -----------------------------------------------------------------------------
// Notifications
// -----------------------------------------------------------------------------
export function subscribeNotifications(
  recipientId: string,
  onData: (items: AppNotification[]) => void
): Unsubscribe {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', recipientId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }));
      onData(sortByCreatedDesc(items));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
