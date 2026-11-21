import React from 'react';
import { AlertCircle, CheckCircle2, Clock, XCircle, Wrench, ArrowRight } from 'lucide-react';
import { RepairStatus } from '../../types/domain';

export const PRODUCT_CATEGORIES = [
  'Laptops & Computers',
  'Smartphones & Tablets',
  'Kitchen Appliances',
  'Laundry & Cooling',
  'Audio & TV',
  'Other Electronics',
];

export function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusText({ status }: { status: string }) {
  const upper = status.toUpperCase();
  let colorClass = 'text-slate-700 bg-slate-100 border-slate-200';
  let Icon = Clock;

  if (
    upper === 'REPAIR_COMPLETED' ||
    upper === 'ACCEPTED' ||
    upper === 'ACTIVE' ||
    upper === 'SOLD' ||
    upper === 'COMPLETED' ||
    upper === 'REPAIR'
  ) {
    colorClass = 'text-emerald-800 bg-emerald-50 border-emerald-200';
    Icon = CheckCircle2;
  } else if (
    upper === 'REPAIR_IN_PROGRESS' ||
    upper === 'QUOTATION_ACCEPTED' ||
    upper === 'QUOTATION_RECEIVED' ||
    upper === 'OFFER_RECEIVED' ||
    upper === 'PICKUP_SCHEDULED' ||
    upper === 'CONFIRMED' ||
    upper === 'EXPIRING_SOON'
  ) {
    colorClass = 'text-amber-800 bg-amber-50 border-amber-200';
    Icon = Clock;
  } else if (
    upper === 'CANCELLED' ||
    upper === 'REJECTED' ||
    upper === 'EXPIRED' ||
    upper === 'REPLACE'
  ) {
    colorClass = 'text-red-800 bg-red-50 border-red-200';
    Icon = XCircle;
  } else if (upper === 'AVAILABLE' || upper === 'PENDING') {
    colorClass = 'text-teal-800 bg-teal-50 border-teal-200';
    Icon = Wrench;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border rounded-md whitespace-nowrap shrink-0 ${colorClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{formatStatusLabel(status)}</span>
    </span>
  );
}

const TIMELINE_STEPS: { key: RepairStatus; label: string }[] = [
  { key: 'PENDING', label: 'Request Submitted' },
  { key: 'QUOTATION_RECEIVED', label: 'Quotations Received' },
  { key: 'QUOTATION_ACCEPTED', label: 'Provider Selected' },
  { key: 'REPAIR_IN_PROGRESS', label: 'Repair In Progress' },
  { key: 'REPAIR_COMPLETED', label: 'Repair Completed' },
];

export function RepairTimeline({ status }: { status: RepairStatus }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
        <XCircle className="w-4 h-4 shrink-0" />
        <span>This repair request was cancelled before a provider was selected.</span>
      </div>
    );
  }

  const activeIdx = Math.max(
    0,
    TIMELINE_STEPS.findIndex((s) => s.key === status)
  );

  return (
    <div className="w-full py-2">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {TIMELINE_STEPS.map((step, idx) => {
          const isCompleted = idx < activeIdx || status === 'REPAIR_COMPLETED';
          const isCurrent = idx === activeIdx && status !== 'REPAIR_COMPLETED';
          return (
            <div key={step.key} className="flex sm:flex-col items-center sm:items-start gap-2">
              <div className="flex items-center w-full gap-1.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-semibold shrink-0 border ${
                    isCompleted
                      ? 'bg-teal-600 text-white border-teal-600'
                      : isCurrent
                        ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                        : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`hidden sm:block h-0.5 flex-1 ${
                      idx < activeIdx ? 'bg-teal-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
              <span
                className={`text-xs leading-tight ${
                  isCompleted
                    ? 'text-teal-800 font-medium'
                    : isCurrent
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-white border border-slate-200 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-medium text-red-700 hover:text-red-900 shrink-0"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
