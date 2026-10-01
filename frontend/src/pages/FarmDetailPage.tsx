import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useProfile } from '../state/ProfileProvider';
import { getFarmAnalytics, irrigateFarm, assignUnits } from '../api/farms';
import { AnalyticsResponse, Farm, FarmSummaryResponse } from '../types';
import { callFarmSummary } from '../ai/gemini';
import { DepletionChart } from '../components/charts/DepletionChart';
import { AvailableWaterChart } from '../components/charts/AvailableWaterChart';
import { SolarRadiationChart } from '../components/charts/SolarRadiationChart';
import { PumpableWaterChart } from '../components/charts/PumpableWaterChart';
import { parseBackendTime, formatTime } from '../components/charts/timeHelper';
import {
  Droplet, Sun, Cpu, Wheat, MapPin, Clock, AlertTriangle, CheckCircle2,
  Info, Loader2, RefreshCw, Sparkles, Plus, X, ArrowLeft,
} from 'lucide-react';

// ---- KPI Chip ----
const KPICard: React.FC<{ label: string; value: string; unit?: string; highlight?: string }> = ({
  label, value, unit, highlight
}) => (
  <div className={`bg-white rounded-2xl p-4 border shadow-sm ${highlight === 'warn' ? 'border-amber-200 bg-amber-50/40' : highlight === 'crit' ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-2xl font-extrabold font-heading leading-tight ${highlight === 'crit' ? 'text-critical' : highlight === 'warn' ? 'text-amber-700' : 'text-forest'}`}>
      {value}
    </p>
    {unit && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{unit}</p>}
  </div>
);

// ---- Assign Units Dialog ----
const AssignUnitsDialog: React.FC<{ farmId: string; existing: string[]; onClose: () => void; onSuccess: () => void }> = ({
  farmId, existing, onClose, onSuccess
}) => {
  const [input, setInput] = useState('');
  const [chips, setChips] = useState<string[]>([...existing]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addChip = () => {
    const val = input.trim().toUpperCase();
    if (val && !chips.includes(val)) setChips(prev => [...prev, val]);
    setInput('');
  };

  const removeChip = (c: string) => setChips(prev => prev.filter(x => x !== c));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChip(); }
    if (e.key === 'Backspace' && !input && chips.length > 0) removeChip(chips[chips.length - 1]);
  };

  const handleSubmit = async () => {
    if (chips.length === 0) { setError('Enter at least one unit ID.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await assignUnits(farmId, { unit_ids: chips });
      onSuccess();
      onClose();
    } catch (err: any) {
      const errData = err?.data;
      if (errData?.detail?.unit_ids) {
        setError(`Unit IDs not found: ${errData.detail.unit_ids.join(', ')}`);
      } else {
        setError(err?.message || 'Failed to assign units.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold font-heading text-forest text-lg">Assign Sensor Units</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Enter sensor unit IDs (e.g. SN-MEH-01). Press Enter or comma to add each one.
        </p>

        <div
          className="flex flex-wrap gap-1.5 min-h-[44px] p-2 rounded-xl border border-slate-200 focus-within:border-forest focus-within:ring-1 focus-within:ring-forest/20 bg-warm transition-all"
          onClick={() => document.getElementById('unit-input')?.focus()}
        >
          {chips.map(c => (
            <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-mint border border-leaf-200 text-xs font-bold text-forest">
              {c}
              <button type="button" onClick={() => removeChip(c)} className="text-leaf-700 hover:text-critical transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            id="unit-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addChip}
            placeholder={chips.length === 0 ? 'Type unit ID and press Enter...' : ''}
            className="flex-1 min-w-[8rem] bg-transparent text-xs outline-none text-slate-800 placeholder:text-slate-300"
          />
        </div>

        {error && (
          <p className="text-xs text-critical font-medium mt-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || chips.length === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-forest text-white shadow-sm hover:bg-forest/90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {submitting ? 'Assigning...' : 'Assign Units'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Irrigate Confirm Dialog ----
const IrrigateDialog: React.FC<{ farm: Farm; onClose: () => void; onSuccess: (irrigatedAt: string) => void }> = ({
  farm, onClose, onSuccess
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await irrigateFarm(farm.farm_id);
      onSuccess(res.irrigated_at);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record irrigation.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold font-heading text-forest text-lg">Record Irrigation</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-5">
          <p className="text-sm font-semibold text-sky-900 mb-1 flex items-center gap-2">
            <Info className="w-4 h-4" />
            What this does
          </p>
          <p className="text-xs text-sky-700">
            This records that you irrigated <strong>{farm.name}</strong> at this moment.
            It does not switch your pump on or off. Your pump is controlled manually.
          </p>
        </div>

        {error && (
          <p className="text-xs text-critical font-medium mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-leaf-500 text-white shadow hover:bg-leaf-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Droplet className="w-4 h-4" />}
            {submitting ? 'Recording...' : 'Confirm Irrigation'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- AI Summary Section ----
const AISummarySection: React.FC<{ analytics: AnalyticsResponse; farm: Farm; language: string; onHighlightIrrigate: (val: boolean) => void }> = ({
  analytics, farm, language, onHighlightIrrigate
}) => {
  const [summary, setSummary] = useState<FarmSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = `ai_summary_${farm.farm_id}_${analytics.current.timestamp}`;

  const generateSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check session cache
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        setSummary(data);
        if (data.status === 'irrigate_now' || data.status === 'irrigate_soon') {
          onHighlightIrrigate(true);
        }
        setLoading(false);
        return;
      }

      // Build compact payload
      const polyPredicted = analytics.depletion_prediction?.polynomial?.filter((_, i) => i % 6 === 0) ?? [];
      const linearPredicted = analytics.depletion_prediction?.linear?.filter((_, i) => i % 6 === 0) ?? [];
      const last24Actuals = analytics.actual_records?.slice(-24) ?? [];
      const next24Forecast = analytics.forecast_data?.slice(0, 24) ?? [];
      const windowLitres = analytics.water_capacity_prediction
        ?.filter(w => {
          const t = parseBackendTime(w.time, true);
          const ws = analytics.irrigation_window?.start_time ? parseBackendTime(analytics.irrigation_window.start_time) : 0;
          const we = analytics.irrigation_window?.end_time ? parseBackendTime(analytics.irrigation_window.end_time) : 0;
          return t >= ws && t <= we;
        })
        .reduce((s, w) => s + w.water_capacity_l, 0) ?? 0;

      const compactPayload = {
        farm: {
          crop: farm.crop,
          area: farm.area,
          area_unit: farm.area_unit,
          pump: farm.pump,
          solar_capacity: farm.power_source.solar_capacity,
          irrigation_method: farm.irrigation_method,
        },
        current: analytics.current,
        hours_till_TAW: analytics.depletion_prediction?.hours_till_TAW,
        last_irrigation: analytics.last_irrigation,
        irrigation_window: analytics.irrigation_window,
        actual_records: last24Actuals,
        poly_predictions: polyPredicted,
        linear_predictions: linearPredicted,
        forecast: next24Forecast,
        window_litres: windowLitres,
        next24h_litres: analytics.water_capacity_prediction?.slice(0, 24).reduce((s, w) => s + w.water_capacity_l, 0) ?? 0,
      };

      const result = await callFarmSummary(compactPayload, language);
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      setSummary(result);

      if (result.status === 'irrigate_now' || result.status === 'irrigate_soon') {
        onHighlightIrrigate(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not generate AI summary. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [analytics, farm, language, cacheKey, onHighlightIrrigate]);

  useEffect(() => {
    generateSummary();
  }, []);

  const statusColors: Record<string, string> = {
    healthy: 'bg-mint border-leaf-200 text-forest',
    irrigate_soon: 'bg-amber-50 border-amber-200 text-amber-800',
    irrigate_now: 'bg-red-50 border-red-200 text-critical',
    insufficient_data: 'bg-slate-50 border-slate-200 text-slate-600',
  };

  const priorityIcons = {
    high: <span className="w-1.5 h-1.5 rounded-full bg-critical flex-shrink-0 mt-1.5" />,
    medium: <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />,
    low: <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />,
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sun flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-heading text-forest">AI Summary &amp; Actions</h3>
            <p className="text-xs text-slate-500">Analysis based on your current farm data</p>
          </div>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(cacheKey); generateSummary(); }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-leaf-500" />
          <span className="text-sm text-slate-500">Generating AI guidance…</span>
        </div>
      )}

      {error && (
        <div className="py-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 mb-1">Could not generate summary</p>
          <p className="text-xs text-slate-500 mb-3">{error}</p>
          <button
            onClick={generateSummary}
            className="px-4 py-2 rounded-xl bg-leaf-500 text-white text-xs font-bold hover:bg-leaf-600 transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {summary && !loading && (
        <div className="mt-4 space-y-4">
          {/* Status Chip + Headline */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${statusColors[summary.status] || statusColors.healthy}`}>
              {summary.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            <h4 className="font-bold font-heading text-forest text-base">{summary.headline}</h4>
          </div>

          {/* Summary */}
          <p className="text-sm text-slate-600 leading-relaxed">{summary.summary}</p>

          {/* Actions */}
          {summary.actions && summary.actions.length > 0 && (
            <div>
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Recommended Actions</h5>
              <div className="space-y-2">
                {summary.actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    {priorityIcons[action.priority]}
                    <div>
                      <p className="text-xs font-bold text-slate-800">{action.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{action.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Watch-outs */}
          {summary.watch_outs && summary.watch_outs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Watch Out
              </h5>
              <ul className="space-y-1">
                {summary.watch_outs.map((w, i) => (
                  <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.window_note && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-leaf-200 rounded-2xl p-3">
              <Info className="w-4 h-4 text-leaf-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-forest">{summary.window_note}</p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[11px] text-slate-400 italic">
            AI-generated guidance based on your farm data. Please use your own judgement.
          </p>
        </div>
      )}
    </div>
  );
};

// ---- Main Farm Detail Page ----
export const FarmDetailPage: React.FC = () => {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const { farms, status: profileStatus, refreshProfile } = useProfile();
  const { profile } = useProfile();
  const language = profile?.preferences?.language || 'English';

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [showAssignUnits, setShowAssignUnits] = useState(false);
  const [showIrrigate, setShowIrrigate] = useState(false);
  const [irrigateDisabled, setIrrigateDisabled] = useState(false);
  const [highlightIrrigate, setHighlightIrrigate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Find farm from provider
  const farm = farms.find(f => f.farm_id === farmId);

  const fetchAnalytics = useCallback(async (id: string) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    const cacheKey = `analytics_${id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setAnalytics(JSON.parse(cached));
        setAnalyticsLoading(false);
        return;
      } catch { /* fetch fresh */ }
    }

    try {
      const data = await getFarmAnalytics(id);
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      setAnalytics(data);
    } catch (err: any) {
      setAnalyticsError(err?.message || 'Could not load analytics for this farm.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (farmId) fetchAnalytics(farmId);
  }, [farmId]);

  // Show skeleton while profile loads (e.g., page refresh)
  if (profileStatus === 'loading' || (profileStatus !== 'success' && profileStatus !== 'onboarding' && !farm)) {
    return (
      <AppShell breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Farm' }]}>
        <div className="py-6 space-y-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg w-64" />
          <div className="h-64 bg-slate-100 rounded-3xl w-full" />
        </div>
      </AppShell>
    );
  }

  if (!farm) {
    return (
      <AppShell breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Farm not found' }]}>
        <div className="py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-heading text-forest mb-2">Farm not found</h2>
          <p className="text-slate-500 mb-6">This farm may have been removed or does not belong to your account.</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-leaf-500 text-white font-bold text-sm hover:bg-leaf-600 transition-all">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const handleIrrigateSuccess = (irrigatedAt: string) => {
    const ts = new Date(irrigatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    setToast(`Irrigation recorded at ${ts}. Farm data will refresh.`);
    setIrrigateDisabled(true);
    setTimeout(() => setIrrigateDisabled(false), 4000);

    // Refresh profile + analytics
    refreshProfile();
    sessionStorage.removeItem(`analytics_${farm.farm_id}`);
    fetchAnalytics(farm.farm_id);

    setTimeout(() => setToast(null), 5000);
  };

  // Compute stage from analytics
  const latestRecord = analytics?.actual_records?.[analytics.actual_records.length - 1];
  const cropStage = latestRecord?.growth_stage || latestRecord?.stage || latestRecord?.crop_stage || null;

  const fmt = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const winStart = analytics?.irrigation_window?.start_time;
  const winEnd = analytics?.irrigation_window?.end_time;
  const hasWindow = winStart && winEnd;
  const fmtWindow = hasWindow
    ? `${formatTime(parseBackendTime(winStart))} – ${formatTime(parseBackendTime(winEnd))}`
    : 'No suitable window';

  return (
    <AppShell breadcrumbs={[
      { label: 'Dashboard', href: '/dashboard' },
      { label: farm.name }
    ]}>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-hover bg-forest text-white text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}

      {showAssignUnits && (
        <AssignUnitsDialog
          farmId={farm.farm_id}
          existing={farm.units}
          onClose={() => setShowAssignUnits(false)}
          onSuccess={() => { refreshProfile(); }}
        />
      )}

      {showIrrigate && (
        <IrrigateDialog
          farm={farm}
          onClose={() => setShowIrrigate(false)}
          onSuccess={handleIrrigateSuccess}
        />
      )}

      <div className="py-6 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link to="/dashboard" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-forest mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              All Farms
            </Link>
            <h1 className="text-3xl font-extrabold font-heading text-forest">{farm.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint border border-leaf-200 text-xs font-bold text-forest">
                <Wheat className="w-3 h-3" />
                {farm.crop}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-800">
                {farm.area} {farm.area_unit}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAssignUnits(true)}
              className="flex items-center gap-2 h-11 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              <Cpu className="w-4 h-4" />
              Assign Sensor Units
            </button>
            <button
              onClick={() => setShowIrrigate(true)}
              disabled={irrigateDisabled}
              className={`flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-forest disabled:opacity-50 ${
                highlightIrrigate
                  ? 'bg-leaf-500 text-white animate-pulse-subtle shadow-md hover:bg-leaf-600'
                  : 'bg-leaf-500 text-white hover:bg-leaf-600'
              }`}
            >
              <Droplet className="w-4 h-4" />
              Irrigate Now
            </button>
          </div>
        </div>

        {/* BASIC INFO GRID */}
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Farm Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { label: 'Crop', value: farm.crop, icon: <Wheat className="w-4 h-4 text-forest" /> },
              { label: 'Area', value: `${farm.area} ${farm.area_unit}`, icon: <MapPin className="w-4 h-4 text-sky-500" /> },
              { label: 'Current Stage', value: cropStage || 'Not available yet', icon: <Info className="w-4 h-4 text-amber-500" /> },
              { label: 'Water Source', value: farm.water_source, icon: <Droplet className="w-4 h-4 text-sky-500" /> },
              { label: 'Solar Capacity', value: `${farm.power_source.solar_capacity} kW`, icon: <Sun className="w-4 h-4 text-sun" /> },
              { label: 'Panel Tilt / Direction', value: `${farm.power_source.panel_tilt ?? '—'}° / ${farm.power_source.panel_direction ?? '—'}°`, icon: <Sun className="w-4 h-4 text-amber-400" /> },
              { label: 'Pump Rating', value: `${farm.pump.rated_power_hp} HP`, icon: <Cpu className="w-4 h-4 text-forest" /> },
              { label: 'Pump Flow', value: farm.pump.rated_flow_lpm ? `${farm.pump.rated_flow_lpm} L/min` : '—', icon: <Droplet className="w-4 h-4 text-sky-400" /> },
              { label: 'Pump Head', value: farm.pump.rated_head_m ? `${farm.pump.rated_head_m} m` : '—', icon: <Info className="w-4 h-4 text-slate-400" /> },
              { label: 'Soil Type', value: farm.soil?.type || 'Not provided', icon: <Info className="w-4 h-4 text-amber-700" /> },
              { label: 'Soil pH / θfc / θwp', value: farm.soil ? `${farm.soil.ph ?? '—'} / ${farm.soil.theta_fc ?? '—'} / ${farm.soil.theta_wp ?? '—'}` : 'Not provided', icon: <Info className="w-4 h-4 text-amber-600" /> },
              { label: 'Irrigation Method', value: farm.irrigation_method || '—', icon: <Droplet className="w-4 h-4 text-leaf-600" /> },
              { label: 'Sensor Units', value: farm.units.length > 0 ? `${farm.units.length} assigned` : 'None assigned', icon: <Cpu className="w-4 h-4 text-slate-500" /> },
              { label: 'Last Irrigation', value: fmt(analytics?.last_irrigation ?? farm.irrigation_history?.[farm.irrigation_history.length - 1]), icon: <Clock className="w-4 h-4 text-leaf-500" /> },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">{item.icon}</div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}

            {/* Coordinates mini card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100"><MapPin className="w-4 h-4 text-sky-600" /></div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Location</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  {farm.location.latitude.toFixed(5)}, {farm.location.longitude.toFixed(5)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ANALYTICS SECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Soil Water Analytics</h2>
            <button
              onClick={() => { sessionStorage.removeItem(`analytics_${farm.farm_id}`); fetchAnalytics(farm.farm_id); }}
              disabled={analyticsLoading}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-forest border border-slate-200 px-2.5 py-1.5 rounded-xl hover:bg-slate-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {analyticsLoading ? (
            <div className="space-y-4">
              <div className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
              <div className="h-96 bg-slate-100 rounded-3xl animate-pulse" />
            </div>
          ) : analyticsError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center">
              <Info className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="font-bold text-amber-900 mb-1">Analytics unavailable</p>
              <p className="text-sm text-amber-700 mb-4">{analyticsError}</p>
              <p className="text-xs text-amber-600 mb-4">
                This usually happens when a farm has too few sensor readings. Assign sensor units and wait for a few hourly readings.
              </p>
              <button
                onClick={() => fetchAnalytics(farm.farm_id)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-all"
              >
                Retry
              </button>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                <KPICard
                  label="Depletion D"
                  value={`${analytics.current.D_current.toFixed(1)}`}
                  unit="mm"
                  highlight={analytics.current.D_current >= analytics.current.TAW ? 'crit' : analytics.current.D_current >= analytics.current.RAW ? 'warn' : undefined}
                />
                <KPICard label="TAW" value={`${analytics.current.TAW.toFixed(1)}`} unit="mm total avail. water" />
                <KPICard label="RAW" value={`${analytics.current.RAW.toFixed(1)}`} unit="mm readily avail." />
                <KPICard label="ETc" value={`${analytics.current.ET_c.toFixed(2)}`} unit="mm/day" />
                <KPICard
                  label="Est. Hours to TAW"
                  value={analytics.depletion_prediction.hours_till_TAW >= 999 ? '999+' : String(analytics.depletion_prediction.hours_till_TAW)}
                  unit="estimate"
                  highlight={analytics.depletion_prediction.hours_till_TAW < 12 ? 'crit' : analytics.depletion_prediction.hours_till_TAW < 24 ? 'warn' : undefined}
                />
                <KPICard
                  label="Irrigation Window"
                  value={hasWindow ? `${formatTime(parseBackendTime(winStart!))} – ${formatTime(parseBackendTime(winEnd!))}` : 'None found'}
                  unit={hasWindow ? 'tomorrow (local)' : 'No suitable window'}
                />
                <KPICard
                  label="Last Irrigation"
                  value={analytics.last_irrigation ? fmt(analytics.last_irrigation).split(',')[0] : 'Never'}
                  unit={analytics.last_irrigation ? fmt(analytics.last_irrigation).split(',').slice(1).join(',') : '—'}
                />
              </div>

              {/* Chart 1: Depletion (full width, tall) */}
              <DepletionChart
                actualRecords={analytics.actual_records}
                depletionPrediction={analytics.depletion_prediction}
                irrigationWindow={analytics.irrigation_window}
                TAW={analytics.current.TAW}
                RAW={analytics.current.RAW}
                lastIrrigation={analytics.last_irrigation}
              />

              {/* Charts 2 + 3: Available Water + Solar (side by side on desktop) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AvailableWaterChart
                  actualRecords={analytics.actual_records}
                  depletionPrediction={analytics.depletion_prediction}
                  irrigationWindow={analytics.irrigation_window}
                  TAW={analytics.current.TAW}
                  RAW={analytics.current.RAW}
                />
                <SolarRadiationChart
                  forecastData={analytics.forecast_data}
                  irrigationWindow={analytics.irrigation_window}
                />
              </div>

              {/* Chart 4: Pumpable Water Histogram (full width) */}
              <PumpableWaterChart
                waterCapacityPrediction={analytics.water_capacity_prediction}
                irrigationWindow={analytics.irrigation_window}
              />

              {/* AI Summary Section */}
              <AISummarySection
                analytics={analytics}
                farm={farm}
                language={language}
                onHighlightIrrigate={setHighlightIrrigate}
              />
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
};
