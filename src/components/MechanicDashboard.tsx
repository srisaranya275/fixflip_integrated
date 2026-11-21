import React, { useMemo, useState } from 'react';
import { CheckCircle2, Play, Wrench } from 'lucide-react';
import { advanceRepairStatus, submitQuotation } from '../services/repairLoopService';
import { Quotation, RepairRequest, UserProfile } from '../types/domain';
import { formatCurrency } from '../utils/warranty';
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  RepairTimeline,
  StatusText,
} from './ui/CommonUI';

export type MechanicTab =
  | 'overview'
  | 'open'
  | 'quotations'
  | 'active';

interface MechanicDashboardProps {
  profile: UserProfile;
  activeTab: MechanicTab;
  onTabChange: (tab: MechanicTab) => void;
  openRequests: RepairRequest[];
  assignedRequests: RepairRequest[];
  myQuotations: Quotation[];
  loading: boolean;
}

export function MechanicDashboard({
  profile,
  activeTab,
  onTabChange,
  openRequests,
  assignedRequests,
  myQuotations,
  loading,
}: MechanicDashboardProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [quoteForm, setQuoteForm] = useState({
    estimatedCost: 180,
    spareParts: '',
    completionTimeDays: 3,
    additionalLifespanYears: 3,
    repairDescription: '',
    notes: '',
  });

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const myQuotedRequestIds = useMemo(
    () => new Set(myQuotations.map((q) => q.requestId)),
    [myQuotations]
  );

  const stats = useMemo(() => {
    const openCount = openRequests.length;
    const submittedCount = myQuotations.length;
    const acceptedCount = myQuotations.filter((q) => q.status === 'ACCEPTED').length;
    const inProgressCount = assignedRequests.filter(
      (r) => r.status === 'REPAIR_IN_PROGRESS' || r.status === 'QUOTATION_ACCEPTED'
    ).length;
    const completedCount = assignedRequests.filter((r) => r.status === 'REPAIR_COMPLETED').length;
    return { openCount, submittedCount, acceptedCount, inProgressCount, completedCount };
  }, [openRequests, myQuotations, assignedRequests]);

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    if (quoteForm.spareParts.trim().length < 2 || quoteForm.repairDescription.trim().length < 5) {
      setErrorMsg('Please specify required spare parts and a clear repair plan.');
      return;
    }
    setSubmitting(true);
    try {
      await submitQuotation({
        request: selectedRequest,
        mechanicId: profile.uid,
        mechanicName: profile.fullName,
        ...quoteForm,
      });
      setSuccessMsg(`Confidential quotation submitted for ${selectedRequest.requestCode}.`);
      setSelectedRequest(null);
      setQuoteForm({
        estimatedCost: 180,
        spareParts: '',
        completionTimeDays: 3,
        additionalLifespanYears: 3,
        repairDescription: '',
        notes: '',
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit quotation.');
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
              <h2 className="text-2xl font-bold text-[#0F1E36]">Mechanic Bench Overview</h2>
              <p className="mt-1 text-sm text-slate-600">
                Review open repair requests, manage confidential quotations, and update active repairs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTabChange('open')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 whitespace-nowrap shrink-0"
            >
              <Wrench className="w-4 h-4" />
              <span>Browse Open Requests</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Open Repair Requests</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-[#0F1E36]">
                {stats.openCount}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Submitted Quotations</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-800">
                {stats.submittedCount}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Accepted Quotations</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-teal-700">
                {stats.acceptedCount}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Repairs In Progress</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-amber-700">
                {stats.inProgressCount}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Completed Repairs</p>
              <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-emerald-700">
                {stats.completedCount}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0F1E36]">Active Assigned Jobs</h3>
              <button
                type="button"
                onClick={() => onTabChange('active')}
                className="text-xs font-medium text-teal-700 hover:underline"
              >
                Manage All Jobs
              </button>
            </div>
            {assignedRequests.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No accepted repairs assigned yet. Submit quotations on open requests to win repair jobs.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {assignedRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{req.productName}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{req.requestCode}</span> · Customer:{' '}
                        {req.customerName} · Approved Quote: {formatCurrency(req.acceptedQuoteCost)}
                      </p>
                    </div>
                    <StatusText status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OPEN REQUESTS TAB */}
      {activeTab === 'open' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F1E36]">Open Repair Requests</h2>
            <p className="mt-1 text-sm text-slate-600">
              Your submitted quotations are strictly confidential and hidden from competing mechanics.
            </p>
          </div>

          {selectedRequest && (
            <form
              onSubmit={handleSubmitQuote}
              className="bg-white border border-teal-500 rounded-xl p-6 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-[#0F1E36]">
                    Submit Quotation for {selectedRequest.productName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedRequest.requestCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Estimated Repair Cost ($) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quoteForm.estimatedCost}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, estimatedCost: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Completion Time (Days) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    required
                    value={quoteForm.completionTimeDays}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, completionTimeDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Est. Additional Lifespan (Yrs) *
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    max={30}
                    step="0.5"
                    required
                    value={quoteForm.additionalLifespanYears}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        additionalLifespanYears: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Spare Parts Required *
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteForm.spareParts}
                    onChange={(e) => setQuoteForm({ ...quoteForm, spareParts: e.target.value })}
                    placeholder="e.g. OEM Battery + Power IC"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Repair Description *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={quoteForm.repairDescription}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, repairDescription: e.target.value })
                    }
                    placeholder="Outline diagnostic and repair steps..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notes / Workmanship Warranty (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    placeholder="e.g. Includes 90-day parts and labor coverage."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Confidential Quote'}
                </button>
              </div>
            </form>
          )}

          {openRequests.length === 0 ? (
            <EmptyState
              title="No open repair requests"
              description="New customer repair requests will appear here automatically."
            />
          ) : (
            <div className="space-y-4">
              {openRequests.map((req) => {
                const alreadyQuoted = myQuotedRequestIds.has(req.id);
                return (
                  <div
                    key={req.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row justify-between gap-5"
                  >
                    <div className="flex flex-col sm:flex-row gap-5">
                      {req.imageUrl && (
                        <img
                          src={req.imageUrl}
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
                          <span className="font-mono font-medium text-slate-700">
                            {req.requestCode}
                          </span>
                          {' · '}
                          {req.brand} {req.modelNumber}
                          {' · '}
                          {req.category}
                          {' · '}
                          {req.location}
                        </p>
                        <p className="text-sm text-slate-700 pt-1">{req.problemDescription}</p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums pt-1">
                          Age: {req.productAgeYears} yrs · Replacement:{' '}
                          {formatCurrency(req.replacementPrice)} · Prior repairs:{' '}
                          {req.previousRepairCount} ({req.recurringFault ? 'Recurring' : 'First-time'})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center lg:items-end justify-end shrink-0">
                      {alreadyQuoted ? (
                        <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
                          Quote Submitted
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(req)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#0F1E36] rounded-lg hover:bg-slate-800 whitespace-nowrap"
                        >
                          Submit Quotation
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

      {/* MY QUOTATIONS TAB */}
      {activeTab === 'quotations' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F1E36]">My Submitted Quotations</h2>
            <p className="mt-1 text-sm text-slate-600">
              Only quotations you submitted are visible here; competing mechanic bids remain private.
            </p>
          </div>

          {myQuotations.length === 0 ? (
            <EmptyState
              title="No quotations submitted yet"
              description="Browse open repair requests and submit your first quotation."
              actionLabel="Browse Open Requests"
              onAction={() => onTabChange('open')}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-5">Request</th>
                      <th className="py-3 px-5">Spare Parts</th>
                      <th className="py-3 px-5 text-right">Estimated Cost</th>
                      <th className="py-3 px-5 text-right">Turnaround</th>
                      <th className="py-3 px-5 text-right">+Lifespan</th>
                      <th className="py-3 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {myQuotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-slate-900">{q.productName}</p>
                          <p className="text-xs font-mono text-slate-500">{q.requestCode}</p>
                        </td>
                        <td className="py-3.5 px-5 text-xs text-slate-700 max-w-xs">
                          {q.spareParts}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums font-bold text-[#0F1E36]">
                          {formatCurrency(q.estimatedCost)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums text-xs text-slate-700">
                          {q.completionTimeDays} days
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono tabular-nums text-xs text-teal-700">
                          +{q.additionalLifespanYears} yrs
                        </td>
                        <td className="py-3.5 px-5">
                          <StatusText status={q.status} />
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

      {/* ACTIVE REPAIRS TAB */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#0F1E36]">Active & Completed Repairs</h2>
            <p className="mt-1 text-sm text-slate-600">
              Advance accepted jobs along the verified repair workflow timeline.
            </p>
          </div>

          {assignedRequests.length === 0 ? (
            <EmptyState
              title="No assigned repair jobs"
              description="Once a customer accepts one of your quotations, the repair job appears here."
              actionLabel="View Open Requests"
              onAction={() => onTabChange('open')}
            />
          ) : (
            <div className="space-y-4">
              {assignedRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-[#0F1E36]">{req.productName}</h3>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{req.requestCode}</span> · Customer:{' '}
                        {req.customerName} · Approved Quote:{' '}
                        <span className="font-mono font-semibold text-slate-800">
                          {formatCurrency(req.acceptedQuoteCost)}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusText status={req.status} />
                      {req.status === 'QUOTATION_ACCEPTED' && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              title: 'Start Repair Work',
                              message: `Mark ${req.requestCode} (${req.productName}) as Repair In Progress?`,
                              confirmLabel: 'Start Repair',
                              action: async () => {
                                await advanceRepairStatus(req, 'REPAIR_IN_PROGRESS');
                                setSuccessMsg(`Repair started for ${req.requestCode}.`);
                              },
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F1E36] rounded-lg hover:bg-slate-800"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Repair</span>
                        </button>
                      )}
                      {req.status === 'REPAIR_IN_PROGRESS' && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              title: 'Complete Repair Work',
                              message: `Mark ${req.requestCode} (${req.productName}) as Repair Completed? This finalizes the ticket.`,
                              confirmLabel: 'Mark Completed',
                              action: async () => {
                                await advanceRepairStatus(req, 'REPAIR_COMPLETED');
                                setSuccessMsg(`Repair completed for ${req.requestCode}.`);
                              },
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <RepairTimeline status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmState?.open)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel}
        loading={confirmLoading}
        onConfirm={async () => {
          if (!confirmState) return;
          setConfirmLoading(true);
          try {
            await confirmState.action();
            setConfirmState(null);
          } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Status update failed.');
            setConfirmState(null);
          } finally {
            setConfirmLoading(false);
          }
        }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
