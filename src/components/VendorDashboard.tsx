import React, { useMemo, useState } from 'react';
import { CheckCircle2, Recycle, ShoppingBag } from 'lucide-react';
import { submitVendorOffer } from '../services/repairLoopService';
import { ResaleListing, UserProfile, VendorOffer } from '../types/domain';
import { formatCurrency } from '../utils/warranty';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  StatusText,
} from './ui/CommonUI';

export type VendorTab =
  | 'overview'
  | 'marketplace'
  | 'offers'
  | 'purchased';

interface VendorDashboardProps {
  profile: UserProfile;
  activeTab: VendorTab;
  onTabChange: (tab: VendorTab) => void;
  availableListings: ResaleListing[];
  purchasedListings: ResaleListing[];
  myOffers: VendorOffer[];
  loading: boolean;
}

export function VendorDashboard({
  profile,
  activeTab,
  onTabChange,
  availableListings,
  purchasedListings,
  myOffers,
  loading,
}: VendorDashboardProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<ResaleListing | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [offerForm, setOfferForm] = useState({
    offeredPrice: 300,
    message: '',
  });

  const myOfferedListingIds = useMemo(
    () => new Set(myOffers.map((o) => o.listingId)),
    [myOffers]
  );

  const stats = useMemo(() => {
    const availableCount = availableListings.length;
    const submittedOffers = myOffers.length;
    const acceptedOffers = myOffers.filter((o) => o.status === 'ACCEPTED').length;
    const purchasedCount = purchasedListings.length;
    return { availableCount, submittedOffers, acceptedOffers, purchasedCount };
  }, [availableListings, myOffers, purchasedListings]);

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    if (offerForm.message.trim().length < 2) {
      setErrorMsg('Please include a brief note with your offer.');
      return;
    }
    setSubmitting(true);
    try {
      await submitVendorOffer({
        listing: selectedListing,
        vendorId: profile.uid,
        vendorName: profile.fullName,
        offeredPrice: offerForm.offeredPrice,
        message: offerForm.message,
      });
      setSuccessMsg(`Confidential offer submitted for ${selectedListing.listingCode}.`);
      setSelectedListing(null);
      setOfferForm({ offeredPrice: 300, message: '' });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit offer.');
    } finally {
      setSubmitting(false);
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
              <h2 className="text-2xl font-bold text-[#0F1E36]">Vendor Acquisition Overview</h2>
              <p className="mt-1 text-sm text-slate-600">
                Inspect available resale devices, submit private buyout offers, and track won acquisitions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTabChange('marketplace')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap shrink-0"
            >
              <Recycle className="w-4 h-4" />
              <span>Browse Marketplace</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Available Products</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-[#0F1E36]">
                {stats.availableCount}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Submitted Offers</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-800">
                {stats.submittedOffers}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Accepted Offers</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-teal-700">
                {stats.acceptedOffers}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Purchased Products</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-emerald-700">
                {stats.purchasedCount}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0F1E36]">Recent Purchased Inventory</h3>
              <button
                type="button"
                onClick={() => onTabChange('purchased')}
                className="text-xs font-medium text-teal-700 hover:underline"
              >
                View All Purchases
              </button>
            </div>
            {purchasedListings.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No completed purchases yet. Browse available listings and submit an offer.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {purchasedListings.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{item.listingCode}</span> · Seller:{' '}
                        {item.sellerName} · Purchase Price: {formatCurrency(item.soldPrice)}
                      </p>
                    </div>
                    <StatusText status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MARKETPLACE TAB */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F1E36]">Resale Marketplace</h2>
            <p className="mt-1 text-sm text-slate-600">
              Your submitted offers are confidential and cannot be viewed by competing vendors.
            </p>
          </div>

          {selectedListing && (
            <form
              onSubmit={handleSubmitOffer}
              className="bg-white border border-teal-500 rounded-xl p-6 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-[#0F1E36]">
                    Submit Buyout Offer for {selectedListing.productName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    <span className="font-mono">{selectedListing.listingCode}</span> · Seller asking{' '}
                    {formatCurrency(selectedListing.expectedPrice)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Offered Price ($) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={offerForm.offeredPrice}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, offeredPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pickup / Terms Message *
                  </label>
                  <input
                    type="text"
                    required
                    value={offerForm.message}
                    onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                    placeholder="e.g. Same-day pickup and instant payout on inspection."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Confidential Offer'}
                </button>
              </div>
            </form>
          )}

          {availableListings.length === 0 ? (
            <EmptyState
              title="No products currently listed"
              description="Available resale devices from customers will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {availableListings.map((item) => {
                const alreadyOffered = myOfferedListingIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-3">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          referrerPolicy="no-referrer"
                          className="w-full h-44 object-cover rounded-lg border border-slate-200"
                        />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-[#0F1E36]">{item.productName}</h3>
                          <p className="text-xs text-slate-500">
                            <span className="font-mono">{item.listingCode}</span> · {item.brand}{' '}
                            {item.model} · {item.condition.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <StatusText status={item.status} />
                      </div>
                      <p className="text-sm text-slate-700">{item.description}</p>
                      <p className="text-xs text-slate-500">
                        Age: {item.ageYears} yrs · Location: {item.location} · Seller:{' '}
                        {item.sellerName}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">Expected Price</p>
                        <p className="text-lg font-bold font-mono tabular-nums text-[#0F1E36]">
                          {formatCurrency(item.expectedPrice)}
                        </p>
                      </div>
                      {alreadyOffered ? (
                        <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
                          Offer Submitted
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedListing(item);
                            setOfferForm({
                              offeredPrice: Math.round(item.expectedPrice * 0.92),
                              message: '',
                            });
                          }}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#0F1E36] rounded-lg hover:bg-slate-800 whitespace-nowrap"
                        >
                          Submit Offer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MY OFFERS TAB */}
      {activeTab === 'offers' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F1E36]">My Submitted Offers</h2>
            <p className="mt-1 text-sm text-slate-600">
              Track your confidential buyout proposals and acceptance outcomes.
            </p>
          </div>

          {myOffers.length === 0 ? (
            <EmptyState
              title="No offers submitted yet"
              description="Browse the resale marketplace and submit your first offer."
              actionLabel="Browse Marketplace"
              onAction={() => onTabChange('marketplace')}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-5">Product</th>
                      <th className="py-3 px-5 text-right">Offered Price</th>
                      <th className="py-3 px-5">Message</th>
                      <th className="py-3 px-5">Date</th>
                      <th className="py-3 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {myOffers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-slate-900">{offer.productName}</p>
                          <p className="text-xs font-mono text-slate-500">{offer.listingCode}</p>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums font-bold text-[#0F1E36]">
                          {formatCurrency(offer.offeredPrice)}
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-600 max-w-xs">
                          {offer.message}
                        </td>
                        <td className="py-3.5 px-5 font-mono tabular-nums text-xs text-slate-500">
                          {offer.createdAt?.toDate
                            ? offer.createdAt.toDate().toLocaleDateString()
                            : 'Just now'}
                        </td>
                        <td className="py-3.5 px-5">
                          <StatusText status={offer.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PURCHASED PRODUCTS TAB */}
      {activeTab === 'purchased' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F1E36]">Purchased Products</h2>
            <p className="mt-1 text-sm text-slate-600">
              Completed acquisitions won from customer resale listings.
            </p>
          </div>

          {purchasedListings.length === 0 ? (
            <EmptyState
              title="No purchased items yet"
              description="When a seller accepts one of your offers, the confirmed purchase receipt appears here."
              actionLabel="Browse Marketplace"
              onAction={() => onTabChange('marketplace')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {purchasedListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#0F1E36]">{item.productName}</h3>
                        <p className="text-xs font-mono text-slate-500">{item.listingCode}</p>
                      </div>
                    </div>
                    <StatusText status={item.status} />
                  </div>
                  <p className="text-xs text-slate-600">
                    {item.brand} {item.model} · {item.condition.replace(/_/g, ' ')} ·{' '}
                    {item.location}
                  </p>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Seller: {item.sellerName}</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-700 text-sm">
                      Purchased: {formatCurrency(item.soldPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
