import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useProfile } from '../state/ProfileProvider';
import { Farm, AnalyticsResponse } from '../types';
import { getFarmAnalytics } from '../api/farms';
import { Plus, Droplet, Sun, Cpu, Clock, TrendingUp, AlertTriangle, Info, Wheat } from 'lucide-react';

// --- Skeleton Cards ---
const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card animate-pulse space-y-4">
    <div className="h-5 bg-slate-200 rounded-lg w-2/3" />
    <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
    <div className="h-16 bg-slate-100 rounded-2xl w-full" />
    <div className="h-4 bg-slate-100 rounded-lg w-1/3" />
  </div>
);

// Per-card analytics state
interface FarmCardAnalytics {
  data: AnalyticsResponse | null;
  loading: boolean;
  error: string | null;
}

// --- Condition Block ---
const ConditionBlock: React.FC<{ analytics: FarmCardAnalytics }> = ({ analytics }) => {
  if (analytics.loading) {
    return (
      <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
      </div>
    );
  }

  if (analytics.error) {
    return (
      <div className="mt-3 rounded-2xl bg-amber-50/80 border border-amber-200 p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-800">Not enough data yet</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Assign sensor units and wait for a few readings.</p>
        </div>
      </div>
    );
  }

  if (!analytics.data) return null;

  const { current, irrigation_window } = analytics.data;
  const { TAW, RAW, D_current } = current;
  const availableWater = Math.max(0, TAW - D_current);
  const awPercent = TAW > 0 ? Math.round((availableWater / TAW) * 100) : 0;
  const deplPercent = TAW > 0 ? Math.min(100, Math.round((D_current / TAW) * 100)) : 0;
  const rawPercent = TAW > 0 ? Math.round((RAW / TAW) * 100) : 50;

  let statusLabel = 'Healthy';
  let statusColor = 'bg-leaf-100 text-forest border-leaf-200';
  let chipColor = 'text-forest';
  if (D_current >= TAW) {
    statusLabel = 'Critical';
    statusColor = 'bg-red-100 text-critical border-red-200';
    chipColor = 'text-critical';
  } else if (D_current >= RAW) {
    statusLabel = 'Irrigate Soon';
    statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
    chipColor = 'text-amber-700';
  }

  const winStart = irrigation_window?.start_time;
  const winEnd = irrigation_window?.end_time;
  const hasWindow = winStart && winEnd;

  const fmt = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    } catch { return '--:--'; }
  };

  return (
    <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2">
      {/* Status Chip */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-[11px] text-slate-500">AW: {availableWater.toFixed(1)} mm ({awPercent}%)</span>
      </div>

      {/* Gauge */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
          <span>Depletion: {D_current.toFixed(1)} mm</span>
          <span>TAW: {TAW.toFixed(1)} mm</span>
        </div>
        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all ${D_current >= TAW ? 'bg-critical' : D_current >= RAW ? 'bg-amber-500' : 'bg-leaf-500'}`}
            style={{ width: `${deplPercent}%` }}
          />
          {/* RAW Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-forest opacity-60"
            style={{ left: `${rawPercent}%` }}
            title={`RAW: ${RAW.toFixed(1)} mm`}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
          <span>0 mm</span>
          <span className="text-forest font-semibold">RAW: {RAW.toFixed(1)}</span>
          <span>{TAW.toFixed(1)} mm</span>
        </div>
      </div>

      {hasWindow && (
        <div className="flex items-center gap-1.5 text-[11px] text-leaf-700 font-semibold">
          <Clock className="w-3.5 h-3.5" />
          Best window: {fmt(winStart)} – {fmt(winEnd)}
        </div>
      )}
    </div>
  );
};

// --- Individual Farm Card ---
const FarmCard: React.FC<{ farm: Farm; onClick: () => void }> = ({ farm, onClick }) => {
  const lastIrrigated = farm.irrigation_history && farm.irrigation_history.length > 0
    ? new Date(Math.max(...farm.irrigation_history.map(d => new Date(d).getTime()))).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Never recorded';

  const [analytics, setAnalytics] = useState<FarmCardAnalytics>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    // Check session cache
    const cacheKey = `analytics_${farm.farm_id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setAnalytics({ data: JSON.parse(cached), loading: false, error: null });
        return;
      } catch { /* invalid cache, fetch fresh */ }
    }

    getFarmAnalytics(farm.farm_id)
      .then(data => {
        if (!cancelled) {
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
          setAnalytics({ data, loading: false, error: null });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setAnalytics({ data: null, loading: false, error: err?.message || 'Analytics unavailable' });
        }
      });

    return () => { cancelled = true; };
  }, [farm.farm_id]);

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-3xl p-5 border border-slate-100/80 shadow-card hover:shadow-hover hover:-translate-y-1 transition-all duration-200 text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 focus-visible:ring-offset-2"
    >
      {/* Top */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-bold font-heading text-forest text-base truncate">{farm.name}</h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-mint border border-leaf-200 text-forest">
              <Wheat className="w-3 h-3" />
              {farm.crop}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800">
              {farm.area} {farm.area_unit}
            </span>
          </div>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-mint flex items-center justify-center flex-shrink-0">
          <Droplet className="w-5 h-5 text-forest" />
        </div>
      </div>

      {/* Meta Row */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-1">
        <div className="flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5" />
          {farm.units.length} sensor unit{farm.units.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Last: {lastIrrigated}
        </div>
        <div className="flex items-center gap-1">
          <Sun className="w-3.5 h-3.5 text-sun" />
          {farm.power_source.solar_capacity} kW solar
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
          {farm.pump.rated_power_hp} HP pump
        </div>
      </div>

      {/* Condition Block */}
      <ConditionBlock analytics={analytics} />
    </button>
  );
};

// --- Create Farm Card ---
const CreateFarmCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-3xl p-5 border-2 border-dashed border-leaf-300 hover:border-leaf-500 hover:shadow-hover hover:-translate-y-1 transition-all duration-200 min-h-[180px] flex flex-col items-center justify-center gap-3 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 focus-visible:ring-offset-2 group"
    aria-label="Create a new farm"
  >
    <div className="w-14 h-14 rounded-2xl bg-mint border border-leaf-200 flex items-center justify-center group-hover:bg-leaf-100 transition-colors">
      <Plus className="w-7 h-7 text-leaf-600" />
    </div>
    <div className="text-center">
      <p className="font-bold font-heading text-forest text-base">Create a farm</p>
      <p className="text-xs text-slate-500 mt-1 max-w-[18ch] leading-snug">Map your field and add your pump and solar details.</p>
    </div>
  </button>
);

// --- Dashboard Page ---
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { farms, status, error, refreshProfile } = useProfile();

  // Profile status loading skeleton
  if (status === 'loading') {
    return (
      <AppShell breadcrumbs={[{ label: 'Dashboard' }]}>
        <div className="py-6">
          <div className="h-8 bg-slate-200 rounded-lg w-64 mb-8 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        </div>
      </AppShell>
    );
  }

  if (status === 'error') {
    return (
      <AppShell breadcrumbs={[{ label: 'Dashboard' }]}>
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-critical mb-4" />
          <h2 className="text-xl font-bold font-heading text-forest mb-2">Could not load dashboard</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">{error || 'An error occurred loading your farm data.'}</p>
          <button
            onClick={refreshProfile}
            className="px-6 py-2.5 rounded-xl bg-leaf-500 text-white font-bold text-sm hover:bg-leaf-600 transition-all"
          >
            Retry
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold font-heading text-forest">Your Farms</h1>
            <p className="text-slate-500 text-sm mt-1">
              {farms.length === 0 ? 'No farms yet. Create your first farm to see its condition here.' : `${farms.length} farm${farms.length !== 1 ? 's' : ''} registered.`}
            </p>
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* Create Farm Card always first */}
          <CreateFarmCard onClick={() => navigate('/farms/new')} />

          {/* Farm Cards */}
          {farms.map(farm => (
            <FarmCard
              key={farm.farm_id}
              farm={farm}
              onClick={() => navigate(`/farms/${farm.farm_id}`)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
};
