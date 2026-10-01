import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useProfile } from '../state/ProfileProvider';
import { createProfile, updateProfile } from '../api/profile';
import { clearToken } from '../api/auth';
import { ApiError } from '../api/client';
import {
  INDIAN_STATES,
  GENDER_OPTIONS,
  FARMER_TYPES,
  FARMING_TYPES,
  NOTIFICATION_CHANNELS,
  LANGUAGES,
  AREA_UNITS,
} from '../config/options';
import { ProfileCreateRequest, ProfileUpdateRequest, LocationData, FarmingData, PreferencesData } from '../types';
import { User, MapPin, Wheat, Bell, Save, LogOut, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

type Mode = 'onboarding' | 'edit';

interface FormState {
  name: string;
  age: string;
  gender: string;
  phone: string;
  location_state: string;
  location_district: string;
  location_village: string;
  location_pincode: string;
  farming_experience_years: string;
  farming_farmer_type: string;
  farming_farming_type: string;
  farming_total_area: string;
  farming_area_unit: string;
  pref_language: string;
  pref_notification: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  age: '',
  gender: '',
  phone: '',
  location_state: '',
  location_district: '',
  location_village: '',
  location_pincode: '',
  farming_experience_years: '',
  farming_farmer_type: '',
  farming_farming_type: '',
  farming_total_area: '',
  farming_area_unit: '',
  pref_language: '',
  pref_notification: '',
};

function profileToForm(profile: any): FormState {
  return {
    name: profile?.name || '',
    age: profile?.age !== undefined ? String(profile.age) : '',
    gender: profile?.gender || '',
    phone: profile?.phone || '',
    location_state: profile?.location?.state || '',
    location_district: profile?.location?.district || '',
    location_village: profile?.location?.village || '',
    location_pincode: profile?.location?.pincode || '',
    farming_experience_years: profile?.farming?.experience_years !== undefined ? String(profile.farming.experience_years) : '',
    farming_farmer_type: profile?.farming?.farmer_type || '',
    farming_farming_type: profile?.farming?.farming_type || '',
    farming_total_area: profile?.farming?.total_area !== undefined ? String(profile.farming.total_area) : '',
    farming_area_unit: profile?.farming?.area_unit || '',
    pref_language: profile?.preferences?.language || '',
    pref_notification: profile?.preferences?.notification || '',
  };
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  prefix?: string;
}

const FormInput: React.FC<InputProps> = ({ label, error, required, optional, prefix, id, ...rest }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id} className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
      {label}
      {required && <span className="text-critical text-sm leading-none">*</span>}
      {optional && <span className="text-[10px] font-normal text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">Optional</span>}
    </label>
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-sm font-bold text-slate-500 select-none pointer-events-none">{prefix}</span>
      )}
      <input
        id={id}
        className={`w-full h-11 ${prefix ? 'pl-10' : 'px-3.5'} pr-3.5 rounded-xl border ${error ? 'border-critical ring-1 ring-critical/20' : 'border-slate-200 focus:border-forest focus:ring-1 focus:ring-forest/20'} bg-warm focus:bg-white outline-none transition-all text-sm text-slate-800 placeholder:text-slate-300`}
        {...rest}
      />
    </div>
    {error && <p className="text-xs text-critical font-medium">{error}</p>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  options: readonly string[];
}

const FormSelect: React.FC<SelectProps> = ({ label, error, required, optional, options, id, ...rest }) => (
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
      <option value="">Select...</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    {error && <p className="text-xs text-critical font-medium">{error}</p>}
  </div>
);

interface CardProps { title: string; icon: React.ReactNode; children: React.ReactNode; }
const FormCard: React.FC<CardProps> = ({ title, icon, children }) => (
  <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100/80">
    <h3 className="flex items-center gap-2 text-base font-bold font-heading text-forest mb-5 pb-3 border-b border-slate-100">
      <span className="p-1.5 rounded-lg bg-mint text-forest">{icon}</span>
      {title}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">{children}</div>
  </div>
);

export const ProfilePage: React.FC<{ mode?: Mode }> = ({ mode: propMode }) => {
  const navigate = useNavigate();
  const { profile, isOnboarding, refreshProfile } = useProfile();

  const mode = propMode || (isOnboarding ? 'onboarding' : 'edit');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prefill from provider in edit mode
  useEffect(() => {
    if (profile && mode === 'edit') {
      const prefilled = profileToForm(profile);
      setForm(prefilled);
      setSavedForm(prefilled);
    }
  }, [profile, mode]);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const set = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Full name is required.';
    if (form.age && (isNaN(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 120)) {
      newErrors.age = 'Age must be between 0 and 120.';
    }
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      newErrors.phone = 'Enter a valid 10-digit mobile number.';
    }
    if (form.location_pincode && !/^\d{6}$/.test(form.location_pincode)) {
      newErrors.location_pincode = 'Pincode must be exactly 6 digits.';
    }
    if (form.farming_total_area && (isNaN(Number(form.farming_total_area)) || Number(form.farming_total_area) <= 0)) {
      newErrors.farming_total_area = 'Enter a valid area greater than 0.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Build clean location group
      const locationObj: LocationData = {};
      if (form.location_state) locationObj.state = form.location_state;
      if (form.location_district) locationObj.district = form.location_district;
      if (form.location_village) locationObj.village = form.location_village;
      if (form.location_pincode) locationObj.pincode = form.location_pincode;
      const hasLocation = Object.keys(locationObj).length > 0;

      // Build farming group
      const farmingObj: FarmingData = {};
      if (form.farming_experience_years) farmingObj.experience_years = Number(form.farming_experience_years);
      if (form.farming_farmer_type) farmingObj.farmer_type = form.farming_farmer_type;
      if (form.farming_farming_type) farmingObj.farming_type = form.farming_farming_type;
      if (form.farming_total_area) farmingObj.total_area = parseFloat(form.farming_total_area);
      if (form.farming_area_unit) farmingObj.area_unit = form.farming_area_unit;
      const hasFarming = Object.keys(farmingObj).length > 0;

      // Build preferences group
      const prefObj: PreferencesData = {};
      if (form.pref_language) prefObj.language = form.pref_language;
      if (form.pref_notification) prefObj.notification = form.pref_notification;
      const hasPrefs = Object.keys(prefObj).length > 0;

      if (mode === 'onboarding') {
        const payload: ProfileCreateRequest = { name: form.name.trim() };
        if (form.age) payload.age = Number(form.age);
        if (form.gender) payload.gender = form.gender;
        if (form.phone) payload.phone = form.phone;
        if (hasLocation) payload.location = locationObj;
        if (hasFarming) payload.farming = farmingObj;
        if (hasPrefs) payload.preferences = prefObj;

        await createProfile(payload);
        showToast('success', 'Profile created! Welcome to Farm Assistant.');
        await refreshProfile();
        navigate('/dashboard');

      } else {
        // PATCH mode: only send changed top-level fields and whole groups that changed
        const savedProfile = profileToForm(profile);
        const patchPayload: ProfileUpdateRequest = {};

        if (form.name !== savedProfile.name) patchPayload.name = form.name.trim();
        if (form.age !== savedProfile.age) patchPayload.age = form.age ? Number(form.age) : undefined;
        if (form.gender !== savedProfile.gender) patchPayload.gender = form.gender || undefined;
        if (form.phone !== savedProfile.phone) patchPayload.phone = form.phone || undefined;

        const locationChanged = ['location_state','location_district','location_village','location_pincode'].some(k =>
          form[k as keyof FormState] !== savedProfile[k as keyof FormState]
        );
        if (locationChanged && hasLocation) patchPayload.location = locationObj;

        const farmingChanged = ['farming_experience_years','farming_farmer_type','farming_farming_type','farming_total_area','farming_area_unit'].some(k =>
          form[k as keyof FormState] !== savedProfile[k as keyof FormState]
        );
        if (farmingChanged && hasFarming) {
          // Send FULL existing farming merged with edits
          const existingFarming: FarmingData = profile?.farming ? { ...profile.farming } : {};
          patchPayload.farming = { ...existingFarming, ...farmingObj };
        }

        const prefChanged = ['pref_language','pref_notification'].some(k =>
          form[k as keyof FormState] !== savedProfile[k as keyof FormState]
        );
        if (prefChanged && hasPrefs) {
          const existingPrefs: PreferencesData = profile?.preferences ? { ...profile.preferences } : {};
          patchPayload.preferences = { ...existingPrefs, ...prefObj };
        }

        if (Object.keys(patchPayload).length === 0) {
          showToast('error', 'No changes to save.');
          return;
        }

        await updateProfile(patchPayload);
        showToast('success', 'Profile updated successfully.');
        await refreshProfile();
        setSavedForm({ ...form });
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        // Profile already exists - refresh and switch to edit mode
        await refreshProfile();
        showToast('error', 'Profile already exists. Switched to edit mode.');
      } else {
        showToast('error', err?.message || 'Failed to save profile. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    navigate('/');
  };

  const breadcrumbs = mode === 'edit'
    ? [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Your Profile' }]
    : [{ label: 'Setup' }, { label: 'Tell us about yourself' }];

  return (
    <AppShell breadcrumbs={breadcrumbs}>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-hover text-white text-sm font-semibold transition-all animate-in ${toast.type === 'success' ? 'bg-leaf-600' : 'bg-critical'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : null}
          {toast.message}
        </div>
      )}

      <div className="py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold font-heading text-forest">
            {mode === 'onboarding' ? 'Tell us about yourself' : 'Your Profile'}
          </h1>
          {mode === 'onboarding' && (
            <p className="text-slate-500 mt-1.5 text-sm">
              This helps us personalise your farm setup. Only your name is required — fill in the rest whenever you like.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <FormCard title="Personal Details" icon={<User className="w-4 h-4" />}>
                <div className="sm:col-span-2">
                  <FormInput
                    id="pf-name"
                    label="Full Name"
                    required
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    error={errors.name}
                  />
                </div>
                <FormInput
                  id="pf-age"
                  label="Age"
                  optional
                  type="number"
                  min={0}
                  max={120}
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                  placeholder="e.g. 45"
                  error={errors.age}
                />
                <FormSelect
                  id="pf-gender"
                  label="Gender"
                  optional
                  value={form.gender}
                  onChange={e => set('gender', e.target.value)}
                  options={GENDER_OPTIONS}
                />
                <div className="sm:col-span-2">
                  <FormInput
                    id="pf-phone"
                    label="Mobile Number"
                    optional
                    type="tel"
                    prefix="+91"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    error={errors.phone}
                  />
                </div>
              </FormCard>

              <FormCard title="Location" icon={<MapPin className="w-4 h-4" />}>
                <div className="sm:col-span-2">
                  <FormSelect
                    id="pf-state"
                    label="State / UT"
                    optional
                    value={form.location_state}
                    onChange={e => set('location_state', e.target.value)}
                    options={INDIAN_STATES as any}
                  />
                </div>
                <FormInput
                  id="pf-district"
                  label="District"
                  optional
                  value={form.location_district}
                  onChange={e => set('location_district', e.target.value)}
                  placeholder="e.g. Mehsana"
                />
                <FormInput
                  id="pf-village"
                  label="Village"
                  optional
                  value={form.location_village}
                  onChange={e => set('location_village', e.target.value)}
                  placeholder="e.g. Kadi"
                />
                <div className="sm:col-span-2">
                  <FormInput
                    id="pf-pincode"
                    label="Pincode"
                    optional
                    type="text"
                    value={form.location_pincode}
                    onChange={e => set('location_pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit pincode"
                    maxLength={6}
                    error={errors.location_pincode}
                  />
                </div>
              </FormCard>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <FormCard title="Farming Details" icon={<Wheat className="w-4 h-4" />}>
                <FormInput
                  id="pf-exp"
                  label="Years of Experience"
                  optional
                  type="number"
                  min={0}
                  value={form.farming_experience_years}
                  onChange={e => set('farming_experience_years', e.target.value)}
                  placeholder="e.g. 15"
                />
                <FormSelect
                  id="pf-farmer-type"
                  label="Farmer Type"
                  optional
                  value={form.farming_farmer_type}
                  onChange={e => set('farming_farmer_type', e.target.value)}
                  options={FARMER_TYPES}
                />
                <FormSelect
                  id="pf-farming-type"
                  label="Farming Type"
                  optional
                  value={form.farming_farming_type}
                  onChange={e => set('farming_farming_type', e.target.value)}
                  options={FARMING_TYPES}
                />
                <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                  <FormInput
                    id="pf-area"
                    label="Total Farm Area"
                    optional
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.farming_total_area}
                    onChange={e => set('farming_total_area', e.target.value)}
                    placeholder="e.g. 4.5"
                    error={errors.farming_total_area}
                  />
                  <FormSelect
                    id="pf-area-unit"
                    label="Area Unit"
                    optional
                    value={form.farming_area_unit}
                    onChange={e => set('farming_area_unit', e.target.value)}
                    options={AREA_UNITS.map(u => u.value)}
                  />
                </div>
              </FormCard>

              <FormCard title="Preferences" icon={<Bell className="w-4 h-4" />}>
                <FormSelect
                  id="pf-language"
                  label="Preferred Language"
                  optional
                  value={form.pref_language}
                  onChange={e => set('pref_language', e.target.value)}
                  options={LANGUAGES}
                />
                <FormSelect
                  id="pf-notification"
                  label="Notification Channel"
                  optional
                  value={form.pref_notification}
                  onChange={e => set('pref_notification', e.target.value)}
                  options={NOTIFICATION_CHANNELS}
                />
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <strong>Note:</strong> Your preferred language is used in AI features and voice input. Notification settings are saved to your profile.
                  </p>
                </div>
              </FormCard>
            </div>
          </div>

          {/* STICKY BOTTOM ACTION BAR */}
          <div className="sticky bottom-0 z-30 mt-8 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex items-center justify-between gap-4 shadow-[0_-2px_12px_rgba(20,83,45,0.08)]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-critical hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-critical"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || (mode === 'edit' && !isDirty)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-forest text-white text-sm font-bold shadow-sm hover:bg-forest/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> {mode === 'onboarding' ? 'Save & Continue' : 'Save Changes'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};
