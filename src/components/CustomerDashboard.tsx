import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Plus,
  Recycle,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react';
import {
  acceptQuotation,
  acceptVendorOffer,
  cancelRepairRequest,
  createRepairRequest,
  createResaleListing,
  createWarranty,
  deleteWarranty,
  rejectVendorOffer,
  updateResaleTransactionStatus,
} from '../services/repairLoopService';
import {
  ListingCondition,
  Quotation,
  RepairRequest,
  ResaleListing,
  UserProfile,
  VendorOffer,
  WarrantyRecord,
} from '../types/domain';
import {
  calculateWarrantyStatus,
  compressImageToDataUrl,
  formatCurrency,
  resolveAssetUrl,
} from '../utils/warranty';
import { DecisionEngineView } from './DecisionEngineView';
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  PRODUCT_CATEGORIES,
  RepairTimeline,
  StatusText,
} from './ui/CommonUI';

export type CustomerTab =
  | 'overview'
  | 'requests'
  | 'quotations'
  | 'tracking'
  | 'warranty'
  | 'resale'
  | 'decision';

const SAMPLE_PHOTOS = [
  { label: 'No preset photo', url: '' },
  { label: 'Laptop Workstation', url: resolveAssetUrl('/src/assets/images/product_laptop_workstation_1795228565379.jpg') },
  { label: 'Espresso Appliance', url: resolveAssetUrl('/src/assets/images/product_espresso_machine_1795228564966.jpg') },
  { label: 'Studio Headphones', url: resolveAssetUrl('/src/assets/images/product_headphones_audio_1795228565036.jpg') },
];

interface CustomerDashboardProps {
  profile: UserProfile;
  activeTab: CustomerTab;
  onTabChange: (tab: CustomerTab) => void;
  requests: RepairRequest[];
  quotations: Quotation[];
  warranties: WarrantyRecord[];
  listings: ResaleListing[];
  offers: VendorOffer[];
  loading: boolean;
}

export function CustomerDashboard({
  profile,
  activeTab,
  onTabChange,
  requests,
  quotations,
  warranties,
  listings,
  offers,
  loading,
}: CustomerDashboardProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Repair Request Form State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqForm, setReqForm] = useState({
    category: PRODUCT_CATEGORIES[0],
    productName: '',
    brand: '',
    modelNumber: '',
    productAgeYears: 2,
    purchaseDate: new Date().toISOString().slice(0, 10),
    originalPrice: 1200,
    replacementPrice: 1100,
    previousRepairCount: 0,
    previousRepairCost: 0,
    recurringFault: false,
    problemDescription: '',
    location: profile.location || '',
    imageUrl: '',
  });

  // Warranty Form State
  const [showWarrantyForm, setShowWarrantyForm] = useState(false);
  const [warSubmitting, setWarSubmitting] = useState(false);
  const [warForm, setWarForm] = useState({
    productName: '',
    brand: '',
    serialOrImei: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    warrantyDurationMonths: 24,
    purchasePrice: 899,
  });

  // Resale Listing Form State
  const [showResaleForm, setShowResaleForm] = useState(false);
  const [resaleSubmitting, setResaleSubmitting] = useState(false);
  const [resaleForm, setResaleForm] = useState({
    productName: '',
    category: PRODUCT_CATEGORIES[0],
    brand: '',
    model: '',
    ageYears: 2,
    condition: 'GOOD' as ListingCondition,
    expectedPrice: 350,
    location: profile.location || '',
    description: '',
    imageUrl: '',
  });

  // Confirmation Dialog State
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Metrics
  const stats = useMemo(() => {
    const totalRequests = requests.length;
    const pendingQuotes = quotations.filter((q) => q.status === 'PENDING').length;
    const inProgress = requests.filter(
      (r) => r.status === 'QUOTATION_ACCEPTED' || r.status === 'REPAIR_IN_PROGRESS'
    ).length;
    const completed = requests.filter((r) => r.status === 'REPAIR_COMPLETED').length;
    return { totalRequests, pendingQuotes, inProgress, completed };
  }, [requests, quotations]);

  const handleImageUpload = async (
    file: File | undefined,
    target: 'request' | 'resale'
  ) => {
    if (!file) return;
    setErrorMsg(null);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      if (target === 'request') {
        setReqForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      } else {
        setResaleForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not process image.');
    }
  };

  const handleCreateRepairRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (reqForm.problemDescription.trim().length < 10) {
      setErrorMsg('Please describe the problem in at least 10 characters.');
      return;
    }
    setReqSubmitting(true);
    try {
      await createRepairRequest({
        customerId: profile.uid,
        customerName: profile.fullName,
        ...reqForm,
      });
      setShowRequestForm(false);
      setReqForm((prev) => ({
        ...prev,
        productName: '',
        brand: '',
        modelNumber: '',
        problemDescription: '',
        imageUrl: '',
      }));
      setSuccessMsg('Repair request submitted and published to verified mechanics.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create repair request.');
    } finally {
      setReqSubmitting(false);
    }
  };

  const handleCreateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setWarSubmitting(true);
    try {
      await createWarranty({
        ownerId: profile.uid,
        ...warForm,
      });
      setShowWarrantyForm(false);
      setWarForm({
        productName: '',
        brand: '',
        serialOrImei: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        warrantyDurationMonths: 24,
        purchasePrice: 899,
      });
      setSuccessMsg('Product warranty registered.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save warranty.');
    } finally {
      setWarSubmitting(false);
    }
  };

  const handleCreateResaleListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (resaleForm.description.trim().length < 10) {
      setErrorMsg('Please provide a description of at least 10 characters.');
      return;
    }
    setResaleSubmitting(true);
    try {
      await createResaleListing({
        sellerId: profile.uid,
        sellerName: profile.fullName,
        ...resaleForm,
      });
      setShowResaleForm(false);
      setResaleForm((prev) => ({
        ...prev,
        productName: '',
        brand: '',
        model: '',
        description: '',
        imageUrl: '',
      }));
      setSuccessMsg('Product listed on the FixFlip Resale Marketplace.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to list product.');
    } finally {
      setResaleSubmitting(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmState) return;
    setConfirmLoading(true);
    setErrorMsg(null);
    try {
      await confirmState.action();
      setConfirmState(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Action failed.');
      setConfirmState(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      {successMsg && (
        <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-xs font-medium text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0F1E36]">Customer Overview</h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage active device repairs, compare mechanic quotes, track warranties, and resell hardware.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onTabChange('requests');
                setShowRequestForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Request Repair</span>
            </button>
          </div>

          {/* 4-Column KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Total Repair Requests</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-[#0F1E36]">
                {stats.totalRequests}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Pending Quotations</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-amber-700">
                {stats.pendingQuotes}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Repairs In Progress</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-teal-700">
                {stats.inProgress}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Completed Repairs</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-emerald-700">
                {stats.completed}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#0F1E36] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Request Repair', tab: 'requests' as CustomerTab, openForm: 'req' },
                { label: 'Compare Quotations', tab: 'quotations' as CustomerTab },
                { label: 'Track Repairs', tab: 'tracking' as CustomerTab },
                { label: 'Warranty Register', tab: 'warranty' as CustomerTab },
                { label: 'Sell Product', tab: 'resale' as CustomerTab, openForm: 'resale' },
              ].map((qa) => (
                <button
                  key={qa.label}
                  type="button"
                  onClick={() => {
                    onTabChange(qa.tab);
                    if (qa.openForm === 'req') setShowRequestForm(true);
                    if (qa.openForm === 'resale') setShowResaleForm(true);
                  }}
                  className="flex items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-[#0F1E36] bg-slate-50 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50/40 transition-colors"
                >
                  <span className="truncate">{qa.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0F1E36]">Recent Activity</h3>
              <button
                type="button"
                onClick={() => onTabChange('tracking')}
                className="text-xs font-medium text-teal-700 hover:underline"
              >
                View Timeline
              </button>
            </div>
            {requests.length === 0 && listings.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No repair requests or resale listings yet. Start by submitting a repair request or listing a device.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{req.productName}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{req.requestCode}</span> · {req.brand} ·{' '}
                        {req.quotationCount} quotation(s)
                      </p>
                    </div>
                    <StatusText status={req.status} />
                  </div>
                ))}
                {listings.slice(0, 2).map((lst) => (
                  <div
                    key={lst.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Resale: {lst.productName}
                      </p>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{lst.listingCode}</span> · Asking{' '}
                        {formatCurrency(lst.expectedPrice)} · {lst.offerCount} offer(s)
                      </p>
                    </div>
                    <StatusText status={lst.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPAIR REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0F1E36]">Repair Requests</h2>
              <p className="mt-1 text-sm text-slate-600">
                Submit detailed repair tickets and manage active quotations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRequestForm((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showRequestForm ? 'Close Form' : 'New Repair Request'}</span>
            </button>
          </div>

          {showRequestForm && (
            <form
              onSubmit={handleCreateRepairRequest}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <h3 className="text-base font-semibold text-[#0F1E36] pb-3 border-b border-slate-100">
                Submit Device Repair Request
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={reqForm.category}
                    onChange={(e) => setReqForm({ ...reqForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqForm.productName}
                    onChange={(e) => setReqForm({ ...reqForm, productName: e.target.value })}
                    placeholder="e.g. ThinkPad X1 Carbon"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={reqForm.brand}
                    onChange={(e) => setReqForm({ ...reqForm, brand: e.target.value })}
                    placeholder="e.g. Lenovo"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Model Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqForm.modelNumber}
                    onChange={(e) => setReqForm({ ...reqForm, modelNumber: e.target.value })}
                    placeholder="e.g. 21CB-000AUS"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Age (Years)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step="0.5"
                    required
                    value={reqForm.productAgeYears}
                    onChange={(e) =>
                      setReqForm({ ...reqForm, productAgeYears: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    required
                    value={reqForm.purchaseDate}
                    onChange={(e) => setReqForm({ ...reqForm, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Original Price ($)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={reqForm.originalPrice}
                    onChange={(e) =>
                      setReqForm({ ...reqForm, originalPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Replacement Price ($)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={reqForm.replacementPrice}
                    onChange={(e) =>
                      setReqForm({ ...reqForm, replacementPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={reqForm.location}
                    onChange={(e) => setReqForm({ ...reqForm, location: e.target.value })}
                    placeholder="City, State"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Previous Repair Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={reqForm.previousRepairCount}
                    onChange={(e) =>
                      setReqForm({ ...reqForm, previousRepairCount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Previous Repair Cost ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={reqForm.previousRepairCost}
                    onChange={(e) =>
                      setReqForm({ ...reqForm, previousRepairCost: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqForm.recurringFault}
                      onChange={(e) =>
                        setReqForm({ ...reqForm, recurringFault: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-700">Recurring Fault</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Problem Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reqForm.problemDescription}
                  onChange={(e) =>
                    setReqForm({ ...reqForm, problemDescription: e.target.value })
                  }
                  placeholder="Describe symptoms, error codes, physical damage, or diagnostic notes..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Upload Product Photo (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleImageUpload(e.target.files?.[0], 'request')}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-200 file:text-xs file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Or Use Reference Photo
                  </label>
                  <select
                    value={SAMPLE_PHOTOS.some((p) => p.url === reqForm.imageUrl) ? reqForm.imageUrl : ''}
                    onChange={(e) => setReqForm({ ...reqForm, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    {SAMPLE_PHOTOS.map((p) => (
                      <option key={p.label} value={p.url}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reqSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {reqSubmitting ? 'Submitting...' : 'Submit Repair Request'}
                </button>
              </div>
            </form>
          )}

          {requests.length === 0 ? (
            <EmptyState
              title="No repair requests yet"
              description="Create your first repair request to receive confidential quotations from certified mechanics."
              actionLabel="Request Repair"
              onAction={() => setShowRequestForm(true)}
            />
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row gap-6 justify-between"
                >
                  <div className="flex flex-col sm:flex-row gap-5">
                    {req.imageUrl && (
                      <img
                        src={resolveAssetUrl(req.imageUrl)}
                        alt={req.productName}
                        referrerPolicy="no-referrer"
                        className="w-full sm:w-32 h-24 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-bold text-[#0F1E36]">{req.productName}</h3>
                        <StatusText status={req.status} />
                      </div>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono font-medium text-slate-700">{req.requestCode}</span>
                        {' · '}
                        {req.brand} {req.modelNumber}
                        {' · '}
                        {req.category}
                        {' · '}
                        {req.location}
                      </p>
                      <p className="text-sm text-slate-700 pt-1">{req.problemDescription}</p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums pt-1">
                        Age: {req.productAgeYears} yrs · Orig: {formatCurrency(req.originalPrice)} · Replace:{' '}
                        {formatCurrency(req.replacementPrice)} · Prior repairs: {req.previousRepairCount}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0">
                    <div className="text-left lg:text-right">
                      <p className="text-xs text-slate-500">Quotations</p>
                      <p className="text-lg font-bold font-mono tabular-nums text-[#0F1E36]">
                        {req.quotationCount}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.quotationCount > 0 && (
                        <button
                          type="button"
                          onClick={() => onTabChange('quotations')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F1E36] rounded-lg hover:bg-slate-800 whitespace-nowrap"
                        >
                          Compare Quotes
                        </button>
                      )}
                      {(req.status === 'PENDING' || req.status === 'QUOTATION_RECEIVED') && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              title: 'Cancel Repair Request',
                              message: `Cancel ${req.requestCode} (${req.productName})? Mechanics will no longer be able to quote on this request.`,
                              confirmLabel: 'Cancel Request',
                              destructive: true,
                              action: async () => {
                                await cancelRepairRequest(req.id);
                                setSuccessMsg(`Request ${req.requestCode} cancelled.`);
                              },
                            })
                          }
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUOTATIONS COMPARISON TAB */}
      {activeTab === 'quotations' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F1E36]">Compare Quotations</h2>
            <p className="mt-1 text-sm text-slate-600">
              Review mechanic quotes side-by-side. Accepting one quote automatically rejects competing bids and notifies the selected mechanic.
            </p>
          </div>

          {quotations.length === 0 ? (
            <EmptyState
              title="No quotations received yet"
              description="Once mechanics review your open repair requests, their confidential quotes will appear here for comparison."
              actionLabel="View Repair Requests"
              onAction={() => onTabChange('requests')}
            />
          ) : (
            <div className="space-y-6">
              {requests
                .filter((req) => quotations.some((q) => q.requestId === req.id))
                .map((req) => {
                  const reqQuotes = quotations
                    .filter((q) => q.requestId === req.id)
                    .sort((a, b) => a.estimatedCost - b.estimatedCost);
                  const canAccept =
                    req.status === 'PENDING' || req.status === 'QUOTATION_RECEIVED';

                  return (
                    <div
                      key={req.id}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                    >
                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-[#0F1E36]">
                            {req.productName}{' '}
                            <span className="font-mono text-xs font-normal text-slate-500">
                              ({req.requestCode})
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            Replacement baseline: {formatCurrency(req.replacementPrice)}
                          </p>
                        </div>
                        <StatusText status={req.status} />
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                              <th className="py-3 px-5">Mechanic</th>
                              <th className="py-3 px-5 text-right">Repair Cost</th>
                              <th className="py-3 px-5">Spare Parts</th>
                              <th className="py-3 px-5 text-right">Completion</th>
                              <th className="py-3 px-5 text-right">+Lifespan</th>
                              <th className="py-3 px-5">Notes</th>
                              <th className="py-3 px-5">Status</th>
                              <th className="py-3 px-5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {reqQuotes.map((q) => (
                              <tr key={q.id} className="hover:bg-slate-50/70">
                                <td className="py-3.5 px-5 font-semibold text-slate-900">
                                  {q.mechanicName}
                                </td>
                                <td className="py-3.5 px-5 text-right font-mono tabular-nums font-bold text-[#0F1E36]">
                                  {formatCurrency(q.estimatedCost)}
                                </td>
                                <td className="py-3.5 px-5 text-xs text-slate-700 max-w-xs">
                                  {q.spareParts}
                                </td>
                                <td className="py-3.5 px-5 text-right font-mono tabular-nums text-xs text-slate-700">
                                  {q.completionTimeDays} days
                                </td>
                                <td className="py-3.5 px-5 text-right font-mono tabular-nums text-xs text-teal-700 font-medium">
                                  +{q.additionalLifespanYears} yrs
                                </td>
                                <td className="py-3.5 px-5 text-xs text-slate-600 max-w-xs">
                                  {q.notes || q.repairDescription}
                                </td>
                                <td className="py-3.5 px-5">
                                  <StatusText status={q.status} />
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                  {canAccept && q.status === 'PENDING' ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmState({
                                          open: true,
                                          title: 'Accept Mechanic Quotation',
                                          message: `Accept ${q.mechanicName}'s quotation of ${formatCurrency(
                                            q.estimatedCost
                                          )} for ${req.productName}? All competing quotations will be automatically rejected.`,
                                          confirmLabel: 'Accept Quotation',
                                          action: async () => {
                                            await acceptQuotation({
                                              request: req,
                                              selectedQuotation: q,
                                              allQuotationsForRequest: reqQuotes,
                                            });
                                            setSuccessMsg(
                                              `Accepted ${q.mechanicName}'s quotation for ${req.requestCode}.`
                                            );
                                          },
                                        })
                                      }
                                      className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap"
                                    >
                                      Accept Quote
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* REPAIR TRACKING TAB */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F1E36]">Repair Tracking</h2>
            <p className="mt-1 text-sm text-slate-600">
              Real-time 5-stage repair progress updated by your selected mechanic.
            </p>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              title="No repairs to track"
              description="Submit a repair request to monitor progress from quotation through completion."
              actionLabel="Request Repair"
              onAction={() => {
                onTabChange('requests');
                setShowRequestForm(true);
              }}
            />
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#0F1E36]">{req.productName}</h3>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{req.requestCode}</span> · {req.brand}{' '}
                        {req.modelNumber}
                        {req.acceptedMechanicName
                          ? ` · Provider: ${req.acceptedMechanicName} (${formatCurrency(
                              req.acceptedQuoteCost
                            )})`
                          : ''}
                      </p>
                    </div>
                    <StatusText status={req.status} />
                  </div>
                  <RepairTimeline status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WARRANTY REGISTER TAB */}
      {activeTab === 'warranty' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0F1E36]">Warranty Register</h2>
              <p className="mt-1 text-sm text-slate-600">
                Keep serial numbers and purchase dates organized with automatic expiry tracking.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWarrantyForm((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showWarrantyForm ? 'Close Form' : 'Register Warranty'}</span>
            </button>
          </div>

          {showWarrantyForm && (
            <form
              onSubmit={handleCreateWarranty}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h3 className="text-base font-semibold text-[#0F1E36]">Add Product Warranty</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={warForm.productName}
                    onChange={(e) => setWarForm({ ...warForm, productName: e.target.value })}
                    placeholder="e.g. Bosch Series 6 Washer"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={warForm.brand}
                    onChange={(e) => setWarForm({ ...warForm, brand: e.target.value })}
                    placeholder="e.g. Bosch"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Serial Number / IMEI *
                  </label>
                  <input
                    type="text"
                    required
                    value={warForm.serialOrImei}
                    onChange={(e) => setWarForm({ ...warForm, serialOrImei: e.target.value })}
                    placeholder="SN-88392014"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={warForm.purchaseDate}
                    onChange={(e) => setWarForm({ ...warForm, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Warranty Duration (Months) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    required
                    value={warForm.warrantyDurationMonths}
                    onChange={(e) =>
                      setWarForm({ ...warForm, warrantyDurationMonths: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Purchase Price ($) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={warForm.purchasePrice}
                    onChange={(e) =>
                      setWarForm({ ...warForm, purchasePrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWarrantyForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={warSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {warSubmitting ? 'Saving...' : 'Save Warranty'}
                </button>
              </div>
            </form>
          )}

          {warranties.length === 0 ? (
            <EmptyState
              title="No warranties registered"
              description="Register electronics and appliances to monitor active coverage and expiration alerts."
              actionLabel="Register First Warranty"
              onAction={() => setShowWarrantyForm(true)}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-5">Product</th>
                      <th className="py-3 px-5">Serial / IMEI</th>
                      <th className="py-3 px-5">Purchase Date</th>
                      <th className="py-3 px-5">Expiry Date</th>
                      <th className="py-3 px-5 text-right">Purchase Price</th>
                      <th className="py-3 px-5">Coverage Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {warranties.map((w) => {
                      const calc = calculateWarrantyStatus(
                        w.purchaseDate,
                        w.warrantyDurationMonths
                      );
                      return (
                        <tr key={w.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-5">
                            <p className="font-semibold text-slate-900">{w.productName}</p>
                            <p className="text-xs text-slate-500">
                              {w.brand} · {w.warrantyDurationMonths} mo term
                            </p>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-xs text-slate-700">
                            {w.serialOrImei}
                          </td>
                          <td className="py-3.5 px-5 font-mono tabular-nums text-xs text-slate-700">
                            {w.purchaseDate}
                          </td>
                          <td className="py-3.5 px-5 font-mono tabular-nums text-xs text-slate-900 font-medium">
                            {calc.expiryDate}
                            <span className="block text-slate-400 font-normal">
                              {calc.daysRemaining >= 0
                                ? `${calc.daysRemaining} days left`
                                : `${Math.abs(calc.daysRemaining)} days ago`}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-900">
                            {formatCurrency(w.purchasePrice)}
                          </td>
                          <td className="py-3.5 px-5">
                            <StatusText status={calc.health} />
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  open: true,
                                  title: 'Delete Warranty Record',
                                  message: `Remove ${w.productName} (${w.serialOrImei}) from your warranty register?`,
                                  confirmLabel: 'Delete',
                                  destructive: true,
                                  action: async () => {
                                    await deleteWarranty(w.id);
                                    setSuccessMsg('Warranty record removed.');
                                  },
                                })
                              }
                              aria-label={`Delete ${w.productName}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESALE MARKETPLACE & OFFERS TAB */}
      {activeTab === 'resale' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0F1E36]">Resale Marketplace & Offers</h2>
              <p className="mt-1 text-sm text-slate-600">
                List used or non-viable devices for sale and compare confidential vendor buyout offers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowResaleForm((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showResaleForm ? 'Close Form' : 'Sell Product'}</span>
            </button>
          </div>

          {showResaleForm && (
            <form
              onSubmit={handleCreateResaleListing}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h3 className="text-base font-semibold text-[#0F1E36]">Create Resale Listing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={resaleForm.productName}
                    onChange={(e) => setResaleForm({ ...resaleForm, productName: e.target.value })}
                    placeholder="e.g. Breville Barista Express"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={resaleForm.category}
                    onChange={(e) => setResaleForm({ ...resaleForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={resaleForm.brand}
                    onChange={(e) => setResaleForm({ ...resaleForm, brand: e.target.value })}
                    placeholder="e.g. Breville"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    value={resaleForm.model}
                    onChange={(e) => setResaleForm({ ...resaleForm, model: e.target.value })}
                    placeholder="e.g. BES870XL"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Age (Years) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step="0.5"
                    required
                    value={resaleForm.ageYears}
                    onChange={(e) =>
                      setResaleForm({ ...resaleForm, ageYears: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Condition</label>
                  <select
                    value={resaleForm.condition}
                    onChange={(e) =>
                      setResaleForm({
                        ...resaleForm,
                        condition: e.target.value as ListingCondition,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="FOR_PARTS">For Parts / Repair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Expected Price ($) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={resaleForm.expectedPrice}
                    onChange={(e) =>
                      setResaleForm({ ...resaleForm, expectedPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={resaleForm.location}
                    onChange={(e) => setResaleForm({ ...resaleForm, location: e.target.value })}
                    placeholder="City, State"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reference Photo
                  </label>
                  <select
                    value={SAMPLE_PHOTOS.some((p) => p.url === resaleForm.imageUrl) ? resaleForm.imageUrl : ''}
                    onChange={(e) => setResaleForm({ ...resaleForm, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  >
                    {SAMPLE_PHOTOS.map((p) => (
                      <option key={p.label} value={p.url}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Upload Product Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleImageUpload(e.target.files?.[0], 'resale')}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-200 file:text-xs file:font-medium file:bg-slate-50 file:text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Condition & Accessories Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resaleForm.description}
                  onChange={(e) => setResaleForm({ ...resaleForm, description: e.target.value })}
                  placeholder="Describe working condition, included accessories, or known faults..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResaleForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resaleSubmitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {resaleSubmitting ? 'Publishing...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          )}

          {listings.length === 0 ? (
            <EmptyState
              title="No resale listings yet"
              description="List electronics or appliances you want to sell to verified refurbishment vendors."
              actionLabel="Sell First Product"
              onAction={() => setShowResaleForm(true)}
            />
          ) : (
            <div className="space-y-6">
              {listings.map((lst) => {
                const listingOffers = offers
                  .filter((o) => o.listingId === lst.id)
                  .sort((a, b) => b.offeredPrice - a.offeredPrice);

                return (
                  <div
                    key={lst.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="p-6 flex flex-col md:flex-row justify-between gap-5">
                      <div className="flex flex-col sm:flex-row gap-5">
                        {lst.imageUrl && (
                          <img
                            src={resolveAssetUrl(lst.imageUrl)}
                            alt={lst.productName}
                            referrerPolicy="no-referrer"
                            className="w-full sm:w-36 h-28 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        )}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-base font-bold text-[#0F1E36]">{lst.productName}</h3>
                            <StatusText status={lst.status} />
                          </div>
                          <p className="text-xs text-slate-500">
                            <span className="font-mono">{lst.listingCode}</span> · {lst.brand}{' '}
                            {lst.model} · {lst.condition.replace(/_/g, ' ')} · {lst.ageYears} yrs ·{' '}
                            {lst.location}
                          </p>
                          <p className="text-sm text-slate-700 pt-1">{lst.description}</p>
                        </div>
                      </div>

                      <div className="text-left md:text-right shrink-0 space-y-2">
                        <div>
                          <p className="text-xs text-slate-500">
                            {lst.status === 'SOLD' ? 'Final Sale Price' : 'Expected Price'}
                          </p>
                          <p className="text-xl font-bold font-mono tabular-nums text-[#0F1E36]">
                            {formatCurrency(lst.status === 'SOLD' ? lst.soldPrice : lst.expectedPrice)}
                          </p>
                        </div>
                        {lst.status === 'SOLD' && lst.buyerVendorName && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-emerald-700">
                              Purchased by {lst.buyerVendorName}
                            </p>
                            <div className="flex flex-wrap items-center md:justify-end gap-2">
                              <span className="text-[11px] font-medium text-slate-500">
                                Fulfillment:
                              </span>
                              <StatusText status={lst.transactionStatus || 'CONFIRMED'} />
                            </div>
                            {(!lst.transactionStatus || lst.transactionStatus === 'CONFIRMED') && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmState({
                                    open: true,
                                    title: 'Schedule Resale Pickup',
                                    message: `Mark pickup scheduled with ${lst.buyerVendorName} for ${lst.productName} (${lst.listingCode})?`,
                                    confirmLabel: 'Schedule Pickup',
                                    action: async () => {
                                      await updateResaleTransactionStatus({
                                        listing: lst,
                                        nextStatus: 'PICKUP_SCHEDULED',
                                        actorRole: 'CUSTOMER',
                                      });
                                      setSuccessMsg(
                                        `Pickup scheduled for ${lst.listingCode}.`
                                      );
                                    },
                                  })
                                }
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F1E36] rounded-lg hover:bg-slate-800 whitespace-nowrap"
                              >
                                Schedule Pickup
                              </button>
                            )}
                            {lst.transactionStatus === 'PICKUP_SCHEDULED' && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmState({
                                    open: true,
                                    title: 'Complete Resale Handover',
                                    message: `Confirm handoff and payment completion with ${lst.buyerVendorName} for ${lst.productName}?`,
                                    confirmLabel: 'Mark Completed',
                                    action: async () => {
                                      await updateResaleTransactionStatus({
                                        listing: lst,
                                        nextStatus: 'COMPLETED',
                                        actorRole: 'CUSTOMER',
                                      });
                                      setSuccessMsg(
                                        `Transaction completed for ${lst.listingCode}.`
                                      );
                                    },
                                  })
                                }
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap"
                              >
                                Mark Completed
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vendor Offers Comparison Table */}
                    <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-4">
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                        Vendor Offers ({listingOffers.length})
                      </h4>
                      {listingOffers.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No vendor offers received yet for this listing.
                        </p>
                      ) : (
                        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                                <th className="py-2.5 px-4">Vendor</th>
                                <th className="py-2.5 px-4 text-right">Offer Amount</th>
                                <th className="py-2.5 px-4">Message</th>
                                <th className="py-2.5 px-4">Date</th>
                                <th className="py-2.5 px-4">Status</th>
                                <th className="py-2.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {listingOffers.map((offer) => (
                                <tr key={offer.id}>
                                  <td className="py-3 px-4 font-semibold text-slate-900">
                                    {offer.vendorName}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0F1E36]">
                                    {formatCurrency(offer.offeredPrice)}
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 max-w-xs">
                                    {offer.message}
                                  </td>
                                  <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                                    {offer.createdAt?.toDate
                                      ? offer.createdAt.toDate().toLocaleDateString()
                                      : 'Just now'}
                                  </td>
                                  <td className="py-3 px-4">
                                    <StatusText status={offer.status} />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {lst.status !== 'SOLD' && offer.status === 'PENDING' ? (
                                      <div className="inline-flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setConfirmState({
                                              open: true,
                                              title: 'Accept Vendor Offer',
                                              message: `Sell ${lst.productName} to ${
                                                offer.vendorName
                                              } for ${formatCurrency(
                                                offer.offeredPrice
                                              )}? Competing offers will be rejected and the listing marked SOLD.`,
                                              confirmLabel: 'Confirm Sale',
                                              action: async () => {
                                                await acceptVendorOffer({
                                                  listing: lst,
                                                  selectedOffer: offer,
                                                  allOffersForListing: listingOffers,
                                                });
                                                setSuccessMsg(
                                                  `Sold ${lst.productName} to ${offer.vendorName}.`
                                                );
                                              },
                                            })
                                          }
                                          className="px-2.5 py-1 text-xs font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-700"
                                        >
                                          Accept
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setConfirmState({
                                              open: true,
                                              title: 'Reject Vendor Offer',
                                              message: `Decline ${offer.vendorName}'s offer of ${formatCurrency(
                                                offer.offeredPrice
                                              )}?`,
                                              confirmLabel: 'Reject Offer',
                                              destructive: true,
                                              action: async () => {
                                                await rejectVendorOffer(offer.id);
                                                setSuccessMsg('Vendor offer rejected.');
                                              },
                                            })
                                          }
                                          className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'decision' && (
        <DecisionEngineView
          requests={requests}
          onSellDevice={(req) => {
            if (req) {
              setResaleForm((prev) => ({
                ...prev,
                productName: req.productName,
                category: req.category,
                brand: req.brand,
                model: req.modelNumber,
                ageYears: req.productAgeYears,
                expectedPrice: Math.max(50, Math.round(req.replacementPrice * 0.3)),
                location: req.location || profile.location || '',
                description: `Selling ${req.brand} ${req.productName} (${req.modelNumber}). Prior issue: ${req.problemDescription}`,
                imageUrl: req.imageUrl || prev.imageUrl,
              }));
            }
            onTabChange('resale');
            setShowResaleForm(true);
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(confirmState?.open)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        destructive={confirmState?.destructive}
        loading={confirmLoading}
        onConfirm={() => void runConfirmedAction()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
