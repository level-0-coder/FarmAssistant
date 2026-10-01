import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { FarmMap } from '../components/FarmMap';
import { AIHelpSidebar, AIMessage } from '../components/AIHelpSidebar';
import { WaterSourceDiagram } from '../components/diagrams/WaterSourceDiagram';
import { SolarDiagram } from '../components/diagrams/SolarDiagram';
import { PumpDiagram } from '../components/diagrams/PumpDiagram';
import { SoilDiagram } from '../components/diagrams/SoilDiagram';
import { IrrigationMethodDiagram } from '../components/diagrams/IrrigationMethodDiagram';
import { useProfile } from '../state/ProfileProvider';
import { createFarm } from '../api/farms';
import { FarmCreateRequest, FormHelperFields } from '../types';
import { CROPS, WATER_SOURCES, SOIL_TYPES, IRRIGATION_METHODS, AREA_UNITS } from '../config/options';
import { ApiError } from '../api/client';
import {
  Sparkles, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Loader2, X, Info, Wheat
} from 'lucide-react';
import { useBeforeUnload } from '../hooks/useBeforeUnload';

type PumpFocusField = 'hp' | 'flow' | 'head' | null;

// --- Field Highlight wrapper (AI filled glow) ---
interface HighlightProps {
  highlighted?: boolean;
  children: React.ReactNode;
}
const AIHighlight: React.FC<HighlightProps> = ({ highlighted, children }) => (
  <div className={`relative transition-all duration-300 ${highlighted ? 'ring-2 ring-sun rounded-xl shadow-highlight animate-pulse-glow' : ''}`}>
    {highlighted && (
      <div className="absolute -top-2.5 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sun text-slate-900 text-[9px] font-bold shadow-sm">
        <Sparkles className="w-2.5 h-2.5" />
        Filled by assistant
      </div>
    )}
    {children}
  </div>
);

interface LabeledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  optional?: boolean;
  unit?: string;
  error?: string;
  highlighted?: boolean;
}

const LabeledInput: React.FC<LabeledInputProps> = ({
  label, required, optional, unit, error, highlighted, id, ...rest
}) => (
  <AIHighlight highlighted={highlighted}>
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold text-slate-700 flex items-center gap-1.5 flex-wrap">
        {label}
        {required && <span className="text-critical text-sm leading-none">*</span>}
        {optional && <span className="text-[10px] font-normal text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">Optional</span>}
        {unit && <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full">{unit}</span>}
      </label>
      <input
        id={id}
        className={`w-full h-11 px-3.5 rounded-xl border ${error ? 'border-critical ring-1 ring-critical/20' : 'border-slate-200 focus:border-forest focus:ring-1 focus:ring-forest/20'} bg-warm focus:bg-white outline-none transition-all text-sm text-slate-800 placeholder:text-slate-300`}
        {...rest}
      />
      {error && <p className="text-xs text-critical font-medium">{error}</p>}
    </div>
  </AIHighlight>
);

interface LabeledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  highlighted?: boolean;
  options: readonly string[];
}

const LabeledSelect: React.FC<LabeledSelectProps> = ({
  label, required, optional, error, highlighted, options, id, ...rest
}) => (
  <AIHighlight highlighted={highlighted}>
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        {label}
        {required && <span className="text-critical text-sm leading-none">*</span>}
        {optional && <span className="text-[10px] font-normal text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">Optional</span>}
      </label>
      <select
        id={id}
        className={`w-full h-11 px-3.5 rounded-xl border ${error ? 'border-critical ring-1 ring-critical/20' : 'border-slate-200 focus:border-forest focus:ring-1 focus:ring-forest/20'} bg-warm focus:bg-white outline-none transition-all text-sm text-slate-800 appearance-none`}
        {...rest}
      >
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="text-xs text-critical font-medium">{error}</p>}
    </div>
  </AIHighlight>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
  diagram?: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}
const FormSection: React.FC<SectionProps> = ({ title, children, diagram, defaultOpen = true, collapsible = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-3xl shadow-card border border-slate-100/80 overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(!open)}
        className={`w-full flex items-center justify-between px-6 py-4 ${collapsible ? 'cursor-pointer hover:bg-slate-50 transition-colors' : 'cursor-default'}`}
      >
        <h3 className="text-base font-bold font-heading text-forest">{title}</h3>
        {collapsible && (open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />)}
      </button>

      {open && (
        <div className="px-6 pb-6">
          {diagram ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">{children}</div>
              <div className="order-first lg:order-last">{diagram}</div>
            </div>
          ) : (
            <div className="space-y-4">{children}</div>
          )}
        </div>
      )}
    </div>
  );
};

// AI-highlighted fields state
type HighlightedFields = Record<string, boolean>;

export const CreateFarmPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useProfile();
  const { profile } = useProfile();

  // ---- Form State ----
  const [farmName, setFarmName] = useState('');
  const [crop, setCrop] = useState('Wheat');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [area, setArea] = useState<number | null>(null);
  const [areaUnit, setAreaUnit] = useState<string>('acre');
  const [areaManual, setAreaManual] = useState(false);
  const [waterSource, setWaterSource] = useState('');
  const [solarCapacity, setSolarCapacity] = useState('');
  const [panelTilt, setPanelTilt] = useState('');
  const [panelDirection, setPanelDirection] = useState('');
  const [pumpHp, setPumpHp] = useState('');
  const [pumpFlow, setPumpFlow] = useState('');
  const [pumpHead, setPumpHead] = useState('');
  const [soilType, setSoilType] = useState('');
  const [soilPh, setSoilPh] = useState('');
  const [thetaFc, setThetaFc] = useState('');
  const [thetaWp, setThetaWp] = useState('');
  const [irrigationMethod, setIrrigationMethod] = useState('');
  const [pumpFocus, setPumpFocus] = useState<PumpFocusField>(null);

  // AI highlighted fields
  const [highlighted, setHighlighted] = useState<HighlightedFields>({});
  // Maps from AI message id -> what fields were set in that message (for undo)
  const undoStackRef = useRef<Map<string, Record<string, any>>>(new Map());

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState<string | undefined>(undefined);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dirty check for page leave warning
  const isDirty = Boolean(farmName || crop !== 'Wheat' || area || waterSource || solarCapacity || pumpHp || pumpFlow);
  useBeforeUnload(isDirty);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // Build current form state for AI
  const currentFormState = {
    name: farmName,
    crop,
    area,
    area_unit: areaUnit,
    latitude,
    longitude,
    water_source: waterSource,
    solar_capacity: solarCapacity ? parseFloat(solarCapacity) : undefined,
    panel_tilt: panelTilt ? parseFloat(panelTilt) : undefined,
    panel_direction: panelDirection ? parseFloat(panelDirection) : undefined,
    pump_rated_power_hp: pumpHp ? parseFloat(pumpHp) : undefined,
    pump_rated_flow_lpm: pumpFlow ? parseFloat(pumpFlow) : undefined,
    pump_rated_head_m: pumpHead ? parseFloat(pumpHead) : undefined,
    soil_type: soilType,
    soil_ph: soilPh ? parseFloat(soilPh) : undefined,
    theta_fc: thetaFc ? parseFloat(thetaFc) : undefined,
    theta_wp: thetaWp ? parseFloat(thetaWp) : undefined,
    irrigation_method: irrigationMethod,
  };

  const missingRequired = [
    ...(farmName ? [] : ['name']),
    ...(crop ? [] : ['crop']),
    ...(!area || area <= 0 ? ['area'] : []),
    ...(!latitude || !longitude ? ['location'] : []),
    ...(waterSource ? [] : ['water_source']),
    ...(solarCapacity && parseFloat(solarCapacity) > 0 ? [] : ['solar_capacity']),
    ...(pumpHp && parseFloat(pumpHp) > 0 ? [] : ['rated_power_hp']),
    ...(pumpFlow && parseFloat(pumpFlow) > 0 ? [] : ['rated_flow_lpm']),
  ];
  const isFormValid = missingRequired.length === 0;

  // Handle AI field fills
  const handleFieldsFilled = useCallback((fields: FormHelperFields) => {
    const prevValues: Record<string, any> = {};
    const newHighlights: HighlightedFields = {};

    if (fields.name !== undefined) { prevValues.name = farmName; setFarmName(fields.name); newHighlights.name = true; }
    if (fields.crop !== undefined) { prevValues.crop = crop; setCrop(fields.crop); newHighlights.crop = true; }
    if (fields.area !== undefined) { prevValues.area = area; setArea(fields.area); setAreaManual(false); newHighlights.area = true; }
    if (fields.area_unit !== undefined) { prevValues.area_unit = areaUnit; setAreaUnit(fields.area_unit); newHighlights.area_unit = true; }
    if (fields.water_source !== undefined) { prevValues.water_source = waterSource; setWaterSource(fields.water_source); newHighlights.water_source = true; }
    if (fields.solar_capacity_kw !== undefined) { prevValues.solar_capacity = solarCapacity; setSolarCapacity(String(fields.solar_capacity_kw)); newHighlights.solar_capacity = true; }
    if (fields.panel_tilt_deg !== undefined) { prevValues.panel_tilt = panelTilt; setPanelTilt(String(fields.panel_tilt_deg)); newHighlights.panel_tilt = true; }
    if (fields.panel_direction_deg !== undefined) { prevValues.panel_direction = panelDirection; setPanelDirection(String(fields.panel_direction_deg)); newHighlights.panel_direction = true; }
    if (fields.pump_rated_power_hp !== undefined) { prevValues.pump_hp = pumpHp; setPumpHp(String(fields.pump_rated_power_hp)); newHighlights.pump_hp = true; }
    if (fields.pump_rated_flow_lpm !== undefined) { prevValues.pump_flow = pumpFlow; setPumpFlow(String(fields.pump_rated_flow_lpm)); newHighlights.pump_flow = true; }
    if (fields.pump_rated_head_m !== undefined) { prevValues.pump_head = pumpHead; setPumpHead(String(fields.pump_rated_head_m)); newHighlights.pump_head = true; }
    if (fields.soil_type !== undefined) { prevValues.soil_type = soilType; setSoilType(fields.soil_type); newHighlights.soil_type = true; }
    if (fields.soil_ph !== undefined) { prevValues.soil_ph = soilPh; setSoilPh(String(fields.soil_ph)); newHighlights.soil_ph = true; }
    if (fields.theta_fc !== undefined) { prevValues.theta_fc = thetaFc; setThetaFc(String(fields.theta_fc)); newHighlights.theta_fc = true; }
    if (fields.theta_wp !== undefined) { prevValues.theta_wp = thetaWp; setThetaWp(String(fields.theta_wp)); newHighlights.theta_wp = true; }
    if (fields.irrigation_method !== undefined) { prevValues.irrigation_method = irrigationMethod; setIrrigationMethod(fields.irrigation_method); newHighlights.irrigation_method = true; }

    // Return prev values for undo
    return prevValues;
  }, [farmName, crop, area, areaUnit, waterSource, solarCapacity, panelTilt, panelDirection, pumpHp, pumpFlow, pumpHead, soilType, soilPh, thetaFc, thetaWp, irrigationMethod]);

  // Actually handle with highlights + undo stack
  const handleAIFill = useCallback((fields: FormHelperFields, messageId?: string) => {
    const prevValues = handleFieldsFilled(fields);
    const newHighlights: HighlightedFields = {};
    Object.keys(prevValues).forEach(k => { newHighlights[k] = true; });

    setHighlighted(prev => ({ ...prev, ...newHighlights }));

    if (messageId) {
      undoStackRef.current.set(messageId, prevValues);
    }

    // Remove highlight after 3 seconds
    setTimeout(() => {
      setHighlighted(prev => {
        const next = { ...prev };
        Object.keys(newHighlights).forEach(k => { next[k] = false; });
        return next;
      });
    }, 3000);
  }, [handleFieldsFilled]);

  const handleUndo = (messageId: string) => {
    const prev = undoStackRef.current.get(messageId);
    if (!prev) return;

    if (prev.name !== undefined) setFarmName(prev.name);
    if (prev.crop !== undefined) setCrop(prev.crop);
    if (prev.area !== undefined) setArea(prev.area);
    if (prev.area_unit !== undefined) setAreaUnit(prev.area_unit);
    if (prev.water_source !== undefined) setWaterSource(prev.water_source);
    if (prev.solar_capacity !== undefined) setSolarCapacity(prev.solar_capacity);
    if (prev.panel_tilt !== undefined) setPanelTilt(prev.panel_tilt);
    if (prev.panel_direction !== undefined) setPanelDirection(prev.panel_direction);
    if (prev.pump_hp !== undefined) setPumpHp(prev.pump_hp);
    if (prev.pump_flow !== undefined) setPumpFlow(prev.pump_flow);
    if (prev.pump_head !== undefined) setPumpHead(prev.pump_head);
    if (prev.soil_type !== undefined) setSoilType(prev.soil_type);
    if (prev.soil_ph !== undefined) setSoilPh(prev.soil_ph);
    if (prev.theta_fc !== undefined) setThetaFc(prev.theta_fc);
    if (prev.theta_wp !== undefined) setThetaWp(prev.theta_wp);
    if (prev.irrigation_method !== undefined) setIrrigationMethod(prev.irrigation_method);

    undoStackRef.current.delete(messageId);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!farmName.trim()) newErrors.farmName = 'Farm name is required.';
    if (!crop) newErrors.crop = 'Crop is required.';
    if (!area || area <= 0) newErrors.area = 'Field area is required (draw on the map).';
    if (!latitude || !longitude) newErrors.location = 'Mark your field location on the map.';
    if (!waterSource) newErrors.waterSource = 'Water source is required.';
    if (!solarCapacity || parseFloat(solarCapacity) <= 0) newErrors.solarCapacity = 'Solar capacity is required (kW > 0).';
    if (!pumpHp || parseFloat(pumpHp) <= 0) newErrors.pumpHp = 'Pump rated power is required (HP > 0).';
    if (!pumpFlow || parseFloat(pumpFlow) <= 0) newErrors.pumpFlow = 'Rated flow rate is required. This is needed to estimate water delivery.';
    if (thetaFc && thetaWp && parseFloat(thetaFc) <= parseFloat(thetaWp)) {
      newErrors.thetaFc = 'Field capacity must be greater than wilting point.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const firstError = document.querySelector('[data-error-field]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: FarmCreateRequest = {
        name: farmName.trim(),
        crop,
        area: parseFloat(String(area)),
        area_unit: areaUnit,
        location: { latitude: latitude!, longitude: longitude! },
        water_source: waterSource,
        power_source: {
          type: 'solar',
          solar_capacity: parseFloat(solarCapacity),
          ...(panelTilt ? { panel_tilt: parseFloat(panelTilt) } : {}),
          ...(panelDirection ? { panel_direction: parseFloat(panelDirection) } : {}),
        },
        pump: {
          rated_power_hp: parseFloat(pumpHp),
          rated_flow_lpm: parseFloat(pumpFlow),
          ...(pumpHead ? { rated_head_m: parseFloat(pumpHead) } : {}),
        },
      };

      // Only add soil if at least one field is present
      const hasSoil = soilType || soilPh || thetaFc || thetaWp;
      if (hasSoil) {
        payload.soil = {
          ...(soilType ? { type: soilType } : {}),
          ...(soilPh ? { ph: parseFloat(soilPh) } : {}),
          ...(thetaFc ? { theta_fc: parseFloat(thetaFc) } : {}),
          ...(thetaWp ? { theta_wp: parseFloat(thetaWp) } : {}),
        };
      }

      if (irrigationMethod) payload.irrigation_method = irrigationMethod;

      const response = await createFarm(payload);
      showToast('success', `Farm "${farmName}" created!`);

      // Wait for profile refresh before navigating
      await refreshProfile();
      navigate(`/farms/${response.farm_id}`);

    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404 && err.message.includes('Profile')) {
        showToast('error', 'Please complete your profile first.');
        navigate('/profile');
      } else {
        showToast('error', err?.message || 'Failed to create farm. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell breadcrumbs={[
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Create Farm' }
    ]}>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-28 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-hover text-white text-sm font-semibold ${toast.type === 'success' ? 'bg-leaf-600' : 'bg-critical'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* STICKY PAGE HEADER */}
        <div className="sticky top-16 z-20 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between shadow-[0_2px_8px_rgba(20,83,45,0.05)]">
          <div>
            <h1 className="text-2xl font-extrabold font-heading text-forest leading-tight">
              {farmName ? `"${farmName}"` : 'New Farm'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Fill out the farm details below. Use the AI helper for assistance.</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center gap-2 h-11 px-4 rounded-xl font-bold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
              sidebarOpen
                ? 'bg-forest text-white shadow-sm hover:bg-forest/90'
                : 'bg-sun/90 text-slate-900 border border-sun hover:bg-sun shadow-sm'
            }`}
            aria-label={sidebarOpen ? 'Hide AI help' : 'Ask help'}
          >
            <Sparkles className="w-4 h-4" />
            {sidebarOpen ? 'Hide help' : 'Ask help'}
          </button>
        </div>

        {/* MAIN BODY with optional sidebar */}
        <div className={`flex gap-6 pt-6 ${sidebarOpen ? 'flex-col lg:flex-row' : ''}`}>
          {/* FORM COLUMN */}
          <div className={`flex-1 min-w-0 space-y-6 transition-all ${sidebarOpen ? 'lg:max-w-[calc(100%-420px)]' : 'w-full'}`}>

            {/* SECTION A: Basics */}
            <FormSection title="A. Farm Basics">
              <AIHighlight highlighted={highlighted.name}>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cf-name" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Farm Name <span className="text-critical text-sm">*</span>
                  </label>
                  <input
                    id="cf-name"
                    type="text"
                    value={farmName}
                    onChange={e => { setFarmName(e.target.value); if (errors.farmName) setErrors(p => ({...p, farmName: ''})); }}
                    placeholder="e.g. Saraswati Wheat Field"
                    className={`w-full h-11 px-3.5 rounded-xl border ${errors.farmName ? 'border-critical' : 'border-slate-200 focus:border-forest focus:ring-1 focus:ring-forest/20'} bg-warm focus:bg-white outline-none transition-all text-sm`}
                  />
                  {errors.farmName && <p className="text-xs text-critical font-medium">{errors.farmName}</p>}
                </div>
              </AIHighlight>

              <AIHighlight highlighted={highlighted.crop}>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cf-crop" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Crop <span className="text-critical text-sm">*</span>
                  </label>
                  <select
                    id="cf-crop"
                    value={crop}
                    onChange={e => { setCrop(e.target.value); if (errors.crop) setErrors(p => ({...p, crop: ''})); }}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-forest focus:ring-1 focus:ring-forest/20 bg-warm focus:bg-white outline-none text-sm appearance-none"
                  >
                    {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </AIHighlight>
            </FormSection>

            {/* SECTION B: Location & Area (map) */}
            <FormSection title="B. Field Location &amp; Area">
              <FarmMap
                unit={areaUnit}
                onUnitChange={(u) => setAreaUnit(u)}
                onAreaChange={(lat, lng, computedArea) => {
                  setLatitude(lat || null);
                  setLongitude(lng || null);
                  if (computedArea > 0) {
                    setArea(parseFloat(computedArea.toFixed(4)));
                    setAreaManual(false);
                    if (errors.area) setErrors(p => ({...p, area: ''}));
                    if (errors.location) setErrors(p => ({...p, location: ''}));
                  }
                }}
                searchQuery={mapSearchQuery}
                onSearchQueryConsumed={() => setMapSearchQuery(undefined)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Latitude <span className="text-critical">*</span></label>
                  <input
                    readOnly
                    value={latitude !== null ? latitude.toFixed(6) : ''}
                    placeholder="Draw shape on map"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 outline-none cursor-default"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Longitude <span className="text-critical">*</span></label>
                  <input
                    readOnly
                    value={longitude !== null ? longitude.toFixed(6) : ''}
                    placeholder="Draw shape on map"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 outline-none cursor-default"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    Area <span className="text-critical">*</span>
                    {areaManual && <span className="text-[10px] text-amber-600 border border-amber-200 px-1 py-0.5 rounded-full">Manually entered</span>}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={area !== null ? area : ''}
                    onChange={e => {
                      setArea(parseFloat(e.target.value) || null);
                      setAreaManual(true);
                      if (errors.area) setErrors(p => ({...p, area: ''}));
                    }}
                    placeholder="Auto-filled from map"
                    className={`w-full h-11 px-3.5 rounded-xl border ${errors.area ? 'border-critical' : 'border-slate-200 focus:border-forest focus:ring-1 focus:ring-forest/20'} bg-warm text-sm outline-none`}
                  />
                  {errors.area && <p className="text-xs text-critical font-medium">{errors.area}</p>}
                  {errors.location && <p className="text-xs text-critical font-medium">{errors.location}</p>}
                </div>
              </div>
            </FormSection>

            {/* SECTION C: Water Source */}
            <FormSection
              title="C. Water Source"
              diagram={<WaterSourceDiagram source={waterSource} />}
            >
              <LabeledSelect
                id="cf-water"
                label="Water source"
                required
                options={WATER_SOURCES}
                value={waterSource}
                onChange={e => { setWaterSource(e.target.value); if (errors.waterSource) setErrors(p => ({...p, waterSource: ''})); }}
                error={errors.waterSource}
                highlighted={highlighted.water_source}
              />
            </FormSection>

            {/* SECTION D: Energy Source (Solar) */}
            <FormSection
              title="D. Solar Energy Source"
              diagram={
                <SolarDiagram
                  capacityKw={parseFloat(solarCapacity) || 3}
                  tiltDeg={parseFloat(panelTilt) || 20}
                  directionDeg={parseFloat(panelDirection) || 180}
                />
              }
            >
              <div className="sm:col-span-1 flex items-center gap-2 py-2 px-3.5 rounded-xl bg-mint border border-leaf-200 text-sm font-bold text-forest mb-2">
                <span className="w-5 h-5 rounded-full bg-leaf-500 flex items-center justify-center text-white text-xs">☀</span>
                Solar (Fixed)
              </div>

              <LabeledInput
                id="cf-solar-cap"
                label="Solar Array Capacity"
                required
                unit="kW"
                type="number"
                min={0}
                step={0.1}
                value={solarCapacity}
                onChange={e => { setSolarCapacity(e.target.value); if (errors.solarCapacity) setErrors(p => ({...p, solarCapacity: ''})); }}
                placeholder="e.g. 5.0"
                error={errors.solarCapacity}
                highlighted={highlighted.solar_capacity}
              />
              <LabeledInput
                id="cf-panel-tilt"
                label="Panel Tilt Angle"
                optional
                unit="degrees (0–90°)"
                type="number"
                min={0}
                max={90}
                value={panelTilt}
                onChange={e => setPanelTilt(e.target.value)}
                placeholder="e.g. 23"
                highlighted={highlighted.panel_tilt}
              />
              <LabeledInput
                id="cf-panel-dir"
                label="Panel Direction (Azimuth)"
                optional
                unit="degrees from N (180=South)"
                type="number"
                min={0}
                max={360}
                value={panelDirection}
                onChange={e => setPanelDirection(e.target.value)}
                placeholder="180 = facing South (optimal)"
                highlighted={highlighted.panel_direction}
              />
            </FormSection>

            {/* SECTION E: Pump */}
            <FormSection
              title="E. Pump Specifications"
              diagram={
                <PumpDiagram
                  hp={parseFloat(pumpHp) || 5}
                  flowLpm={parseFloat(pumpFlow) || 450}
                  headM={parseFloat(pumpHead) || 30}
                  focusedField={pumpFocus}
                />
              }
            >
              <LabeledInput
                id="cf-pump-hp"
                label="Rated Pump Power"
                required
                unit="HP"
                type="number"
                min={0}
                step={0.5}
                value={pumpHp}
                onChange={e => { setPumpHp(e.target.value); if (errors.pumpHp) setErrors(p => ({...p, pumpHp: ''})); }}
                onFocus={() => setPumpFocus('hp')}
                onBlur={() => setPumpFocus(null)}
                placeholder="e.g. 5"
                error={errors.pumpHp}
                highlighted={highlighted.pump_hp}
              />
              <div className="flex flex-col gap-1">
                <LabeledInput
                  id="cf-pump-flow"
                  label="Rated Flow Rate"
                  required
                  unit="L/min"
                  type="number"
                  min={0}
                  value={pumpFlow}
                  onChange={e => { setPumpFlow(e.target.value); if (errors.pumpFlow) setErrors(p => ({...p, pumpFlow: ''})); }}
                  onFocus={() => setPumpFocus('flow')}
                  onBlur={() => setPumpFocus(null)}
                  placeholder="e.g. 450"
                  error={errors.pumpFlow}
                  highlighted={highlighted.pump_flow}
                />
                <p className="text-[11px] text-sky-600 font-medium flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Needed to estimate how much water your pump can deliver.
                </p>
              </div>
              <LabeledInput
                id="cf-pump-head"
                label="Rated Head"
                optional
                unit="m"
                type="number"
                min={0}
                value={pumpHead}
                onChange={e => setPumpHead(e.target.value)}
                onFocus={() => setPumpFocus('head')}
                onBlur={() => setPumpFocus(null)}
                placeholder="e.g. 35"
                highlighted={highlighted.pump_head}
              />
            </FormSection>

            {/* SECTION F: Soil (collapsible, collapsed by default) */}
            <FormSection
              title="F. Soil Properties (Optional)"
              collapsible
              defaultOpen={false}
              diagram={
                <SoilDiagram
                  soilType={soilType}
                  thetaFc={parseFloat(thetaFc) || 0.28}
                  thetaWp={parseFloat(thetaWp) || 0.12}
                />
              }
            >
              <LabeledSelect
                id="cf-soil-type"
                label="Soil Type"
                optional
                options={SOIL_TYPES}
                value={soilType}
                onChange={e => setSoilType(e.target.value)}
                highlighted={highlighted.soil_type}
              />
              <LabeledInput
                id="cf-soil-ph"
                label="Soil pH"
                optional
                unit="0–14"
                type="number"
                min={0}
                max={14}
                step={0.1}
                value={soilPh}
                onChange={e => setSoilPh(e.target.value)}
                placeholder="e.g. 7.2"
                highlighted={highlighted.soil_ph}
              />
              <LabeledInput
                id="cf-theta-fc"
                label="Field Capacity (θ_fc)"
                optional
                unit="m³/m³ (0–1)"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={thetaFc}
                onChange={e => { setThetaFc(e.target.value); if (errors.thetaFc) setErrors(p => ({...p, thetaFc: ''})); }}
                placeholder="e.g. 0.28"
                error={errors.thetaFc}
                highlighted={highlighted.theta_fc}
              />
              <LabeledInput
                id="cf-theta-wp"
                label="Wilting Point (θ_wp)"
                optional
                unit="m³/m³ (0–1)"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={thetaWp}
                onChange={e => setThetaWp(e.target.value)}
                placeholder="e.g. 0.12"
                highlighted={highlighted.theta_wp}
              />
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  Optional. Leave blank if you don't know — you can update them anytime.
                </p>
              </div>
            </FormSection>

            {/* SECTION G: Irrigation Method */}
            <FormSection
              title="G. Irrigation Method (Optional)"
              diagram={<IrrigationMethodDiagram method={irrigationMethod || 'Drip'} />}
            >
              <LabeledSelect
                id="cf-irrigation-method"
                label="Irrigation method"
                optional
                options={IRRIGATION_METHODS}
                value={irrigationMethod}
                onChange={e => setIrrigationMethod(e.target.value)}
                highlighted={highlighted.irrigation_method}
              />
            </FormSection>

            {/* Bottom spacer to clear sticky footer */}
            <div className="h-24" />
          </div>

          {/* AI SIDEBAR (DOCKED, NOT FLOATING) */}
          {sidebarOpen && (
            <div className="hidden lg:flex w-[400px] flex-shrink-0 sticky top-[128px] self-start h-[calc(100vh-160px)] rounded-3xl overflow-hidden shadow-hover border border-slate-100">
              <AIHelpSidebar
                formState={currentFormState}
                missingRequired={missingRequired}
                onFieldsFilled={(fields) => handleAIFill(fields)}
                onUndo={handleUndo}
                onLocationQuery={(q) => setMapSearchQuery(q)}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          )}
        </div>

        {/* MOBILE SIDEBAR: Full-width slide-up sheet */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-white rounded-t-3xl flex flex-col h-[85vh]">
              <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100">
                <span className="font-bold text-forest font-heading">Farm Helper (AI)</span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100"
                  aria-label="Back to form"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AIHelpSidebar
                  formState={currentFormState}
                  missingRequired={missingRequired}
                  onFieldsFilled={(fields) => handleAIFill(fields)}
                  onUndo={handleUndo}
                  onLocationQuery={(q) => { setMapSearchQuery(q); setSidebarOpen(false); }}
                  onClose={() => setSidebarOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STICKY FOOTER */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between gap-4 shadow-[0_-4px_12px_rgba(20,83,45,0.06)]">
          <div className="text-xs text-slate-500 font-medium">
            {missingRequired.length > 0 ? (
              <span className="flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5" />
                {missingRequired.length} required field{missingRequired.length !== 1 ? 's' : ''} remaining
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-forest font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All required fields complete
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-forest text-white font-bold text-sm shadow-sm hover:bg-forest/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wheat className="w-4 h-4" />}
            {submitting ? 'Creating farm...' : 'Create Farm'}
          </button>
        </div>
      </form>
    </AppShell>
  );
};
