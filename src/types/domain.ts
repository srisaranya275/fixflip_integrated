import { Timestamp } from 'firebase/firestore';

export type UserRole = 'CUSTOMER' | 'MECHANIC' | 'VENDOR';

export type RepairStatus =
  | 'PENDING'
  | 'QUOTATION_RECEIVED'
  | 'QUOTATION_ACCEPTED'
  | 'REPAIR_IN_PROGRESS'
  | 'REPAIR_COMPLETED'
  | 'CANCELLED';

export type QuotationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type ListingCondition = 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'FOR_PARTS';
export type ListingStatus = 'AVAILABLE' | 'OFFER_RECEIVED' | 'SOLD';
export type TransactionStatus = 'CONFIRMED' | 'PICKUP_SCHEDULED' | 'COMPLETED';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type WarrantyHealth = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  location?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface RepairRequest {
  id: string;
  requestCode: string;
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
  status: RepairStatus;
  quotationCount: number;
  acceptedQuotationId?: string | null;
  acceptedMechanicId?: string | null;
  acceptedMechanicName?: string | null;
  acceptedQuoteCost?: number | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Quotation {
  id: string;
  requestId: string;
  requestCode: string;
  productName: string;
  customerId: string;
  mechanicId: string;
  mechanicName: string;
  estimatedCost: number;
  spareParts: string;
  completionTimeDays: number;
  additionalLifespanYears: number;
  repairDescription: string;
  notes?: string;
  status: QuotationStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WarrantyRecord {
  id: string;
  ownerId: string;
  productName: string;
  brand: string;
  serialOrImei: string;
  purchaseDate: string;
  warrantyDurationMonths: number;
  purchasePrice: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ResaleListing {
  id: string;
  listingCode: string;
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
  status: ListingStatus;
  offerCount: number;
  acceptedOfferId?: string | null;
  buyerVendorId?: string | null;
  buyerVendorName?: string | null;
  soldPrice?: number | null;
  soldAt?: Timestamp | null;
  transactionStatus?: TransactionStatus | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface VendorOffer {
  id: string;
  listingId: string;
  listingCode: string;
  productName: string;
  sellerId: string;
  vendorId: string;
  vendorName: string;
  offeredPrice: number;
  message: string;
  status: OfferStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  relatedType: 'REPAIR_REQUEST' | 'QUOTATION' | 'RESALE_LISTING' | 'VENDOR_OFFER';
  relatedId: string;
  read: boolean;
  createdAt?: Timestamp;
}

export interface DecisionInput {
  originalPrice: number;
  productAgeYears: number;
  repairCost: number;
  replacementCost: number;
  previousRepairCount: number;
  previousRepairCost: number;
  estimatedAdditionalLifespanYears: number;
  recurringFault: boolean;
}

export interface DecisionResult {
  engine: 'Browser-RepairLoopCore-TS' | 'Java21-RepairLoopCore';
  repairScore: number;
  replacementScore: number;
  repairCostRatio: number;
  repairCostPercentage: number;
  estimatedSavings: number;
  additionalLifespanYears: number;
  recommendation: 'REPAIR' | 'REPLACE';
  explanation: string;
  factorBreakdown: {
    costRatioPoints: number;
    lifespanPoints: number;
    productAgePoints: number;
    repairHistoryPoints: number;
    faultReliabilityPoints: number;
  };
}
