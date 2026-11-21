import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Calculator, Cpu, Info, RefreshCw } from 'lucide-react';
import { DecisionInput, DecisionResult, RepairRequest } from '../types/domain';
import { evaluateRepairDecisionLocal, evaluateViaJavaHttpBridge } from '../utils/decisionEngine';
import { formatCurrency } from '../utils/warranty';
import { StatusText } from './ui/CommonUI';

interface DecisionEngineViewProps {
  requests?: RepairRequest[];
  onSellDevice?: (request?: RepairRequest) => void;
}

export function DecisionEngineView({ requests = [], onSellDevice }: DecisionEngineViewProps) {
  const [input, setInput] = useState<DecisionInput>({
    originalPrice: 1250,
    productAgeYears: 3,
    repairCost: 260,
    replacementCost: 1150,
    estimatedAdditionalLifespanYears: 3.5,
    previousRepairCount: 1,
    previousRepairCost: 85,
    recurringFault: false,
  });

  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [useJavaBridge, setUseJavaBridge] = useState(true);
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<DecisionResult>(() => evaluateRepairDecisionLocal(input));
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runEvaluation = async (nextInput: DecisionInput, bridgeEnabled: boolean) => {
    if (!bridgeEnabled) {
      setResult(evaluateRepairDecisionLocal(nextInput));
      setBridgeStatus('Using local FixFlip browser calculation mode.');
      return;
    }
    setEvaluating(true);
    const response = await evaluateViaJavaHttpBridge(nextInput);
    setResult(response.result);
    if (response.bridgeConnected) {
      setBridgeStatus('Connected to local FixFlip Java 21 Decision Service (RepairDecisionEngine.java).');
    } else {
      setBridgeStatus(
        response.bridgeError ||
          'Local Java 21 server unavailable; evaluated with mirrored FixFlip browser logic.'
      );
    }
    setEvaluating(false);
  };

  useEffect(() => {
    void runEvaluation(input, true);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // Initial auto-probe of Java 21 bridge on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldChange = <K extends keyof DecisionInput>(key: K, value: DecisionInput[K]) => {
    const next = { ...input, [key]: value };
    setInput(next);
    setResult(evaluateRepairDecisionLocal(next));
    if (useJavaBridge) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void runEvaluation(next, true);
      }, 350);
    }
  };

  const handleLoadFromRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;
    const next: DecisionInput = {
      originalPrice: req.originalPrice,
      productAgeYears: req.productAgeYears,
      repairCost: req.acceptedQuoteCost || Math.round(req.replacementPrice * 0.25),
      replacementCost: req.replacementPrice,
      estimatedAdditionalLifespanYears: 3,
      previousRepairCount: req.previousRepairCount,
      previousRepairCost: req.previousRepairCost,
      recurringFault: req.recurringFault,
    };
    setInput(next);
    void runEvaluation(next, useJavaBridge);
  };

  const selectedRequest = requests.find((r) => r.id === selectedRequestId);

  const factorRows = [
    { label: 'Repair-to-Replacement Cost Ratio', score: result.factorBreakdown.costRatioPoints, max: 35 },
    { label: 'Expected Additional Lifespan', score: result.factorBreakdown.lifespanPoints, max: 25 },
    { label: 'Current Product Age', score: result.factorBreakdown.productAgePoints, max: 15 },
    { label: 'Prior Repair History & Spend', score: result.factorBreakdown.repairHistoryPoints, max: 15 },
    { label: 'Recurring Fault Reliability', score: result.factorBreakdown.faultReliabilityPoints, max: 10 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F1E36]">Repair-vs-Replace Decision Engine</h2>
          <p className="mt-1 text-sm text-slate-600">
            Transparent 100-point weighted evaluation aligned with FixFlip&apos;s Java 21 decision service.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {requests.length > 0 && (
            <select
              aria-label="Load parameters from repair request"
              value={selectedRequestId}
              onChange={(e) => handleLoadFromRequest(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="" disabled>
                Load from Request...
              </option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.requestCode} — {r.productName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Execution Mode Banner (Honest Java integration status) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0F1E36] flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">
              Active Engine:{' '}
              <span className="font-mono text-teal-700">
                {result.engine === 'Java21-RepairLoopCore'
                  ? 'FixFlip Java 21 Engine (RepairDecisionEngine.java)'
                  : 'FixFlip Local Browser Engine (mirrors RepairDecisionEngine.java)'}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {bridgeStatus ||
                'Auto-connects to the local FixFlip Java 21 HTTP service when available, with seamless browser fallback.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const nextBridge = !useJavaBridge;
              setUseJavaBridge(nextBridge);
              void runEvaluation(input, nextBridge);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              useJavaBridge
                ? 'bg-[#0F1E36] text-white border-[#0F1E36]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {useJavaBridge ? 'Java HTTP Bridge: On' : 'Java HTTP Bridge: Off'}
          </button>
          <button
            type="button"
            disabled={evaluating}
            onClick={() => void runEvaluation(input, useJavaBridge)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inputs Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calculator className="w-4 h-4 text-teal-600" />
            <h3 className="text-base font-semibold text-[#0F1E36]">Device & Cost Parameters</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Original Price ($)
              </label>
              <input
                type="number"
                min={1}
                step="1"
                value={input.originalPrice}
                onChange={(e) => handleFieldChange('originalPrice', Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Product Age (Years)
              </label>
              <input
                type="number"
                min={0}
                max={40}
                step="0.5"
                value={input.productAgeYears}
                onChange={(e) => handleFieldChange('productAgeYears', Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Estimated Repair Cost ($)
              </label>
              <input
                type="number"
                min={0}
                step="5"
                value={input.repairCost}
                onChange={(e) => handleFieldChange('repairCost', Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Replacement Cost ($)
              </label>
              <input
                type="number"
                min={1}
                step="10"
                value={input.replacementCost}
                onChange={(e) => handleFieldChange('replacementCost', Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Additional Lifespan (Yrs)
              </label>
              <input
                type="number"
                min={0}
                max={20}
                step="0.5"
                value={input.estimatedAdditionalLifespanYears}
                onChange={(e) =>
                  handleFieldChange('estimatedAdditionalLifespanYears', Math.max(0, Number(e.target.value)))
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Previous Repair Count
              </label>
              <input
                type="number"
                min={0}
                max={50}
                step="1"
                value={input.previousRepairCount}
                onChange={(e) =>
                  handleFieldChange('previousRepairCount', Math.max(0, Math.round(Number(e.target.value))))
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Previous Cumulative Repair Cost ($)
              </label>
              <input
                type="number"
                min={0}
                step="5"
                value={input.previousRepairCost}
                onChange={(e) => handleFieldChange('previousRepairCost', Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={input.recurringFault}
              onChange={(e) => handleFieldChange('recurringFault', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">Recurring fault (same failure happened previously)</span>
          </label>
        </div>

        {/* Results & Breakdown Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-medium text-slate-500">Advisory Recommendation</p>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-2xl font-bold text-[#0F1E36]">
                  {result.recommendation === 'REPAIR' ? 'Repair Device' : 'Replace Device'}
                </span>
                <StatusText status={result.recommendation} />
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500">Estimated Additional Life</p>
              <p className="text-lg font-bold font-mono tabular-nums text-teal-700">
                +{result.additionalLifespanYears.toFixed(1)} yrs
              </p>
            </div>
          </div>

          {/* 4-Column Quantitative Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Repair Score</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-teal-700">
                {result.repairScore}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Replacement Score</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0F1E36]">
                {result.replacementScore}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Repair Cost %</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900">
                {result.repairCostPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">Est. Savings</p>
              <p
                className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                  result.estimatedSavings >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatCurrency(result.estimatedSavings)}
              </p>
            </div>
          </div>

          {/* Comparative Score Bar */}
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
              <span>Repair Favorability ({result.repairScore}%)</span>
              <span>Replacement Favorability ({result.replacementScore}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
              <div
                className="bg-teal-600 h-full transition-all duration-200"
                style={{ width: `${result.repairScore}%` }}
              />
              <div
                className="bg-[#0F1E36] h-full transition-all duration-200"
                style={{ width: `${result.replacementScore}%` }}
              />
            </div>
          </div>

          {/* Transparent Weighted Factor Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Weighted Scoring Breakdown (100 Points Total)
            </h4>
            <div className="space-y-2.5">
              {factorRows.map((row) => {
                const pct = Math.round((row.score / row.max) * 100);
                return (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-700">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-900 font-medium">
                        {row.score.toFixed(1)} / {row.max} pts
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-200"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation & Disclaimer */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">{result.explanation}</p>
            {result.recommendation === 'REPLACE' && onSellDevice && (
              <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-600">
                  Prefer to recover residual value instead of repairing?
                </span>
                <button
                  type="button"
                  onClick={() => onSellDevice(selectedRequest)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F1E36] rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <span>Sell Device on FixFlip Resale</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Decision Engine results are advisory estimates based on user-supplied costs and
                expected lifespan; actual repair outcomes depend on physical technician inspection.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
