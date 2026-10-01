// Single Source of Truth Types for Farm Assistant

export interface LocationData {
  state?: string;
  district?: string;
  village?: string;
  pincode?: string;
}

export interface FarmingData {
  experience_years?: number;
  farmer_type?: string;
  farming_type?: string;
  total_area?: number;
  area_unit?: string;
}

export interface PreferencesData {
  language?: string;
  notification?: string;
}

export interface Profile {
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  location?: LocationData;
  farming?: FarmingData;
  preferences?: PreferencesData;
}

export interface ProfileCreateRequest {
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  location?: LocationData;
  farming?: FarmingData;
  preferences?: PreferencesData;
}

export interface ProfileUpdateRequest {
  name?: string;
  age?: number;
  gender?: string;
  phone?: string;
  location?: LocationData;
  farming?: FarmingData;
  preferences?: PreferencesData;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface SolarPowerData {
  type: 'solar';
  solar_capacity: number;
  panel_tilt?: number;
  panel_direction?: number;
}

export interface PumpData {
  rated_power_hp: number;
  rated_flow_lpm: number;
  rated_head_m?: number;
}

export interface SoilData {
  type?: string;
  ph?: number;
  theta_fc?: number;
  theta_wp?: number;
}

export interface Farm {
  farm_id: string;
  name: string;
  crop: string;
  area: number;
  area_unit: string;
  location: LocationCoords;
  water_source: string;
  power_source: SolarPowerData;
  pump: PumpData;
  soil?: SoilData;
  irrigation_method?: string;
  units: string[];
  irrigation_history?: string[];
}

export interface FarmCreateRequest {
  name: string;
  crop: string;
  area: number;
  area_unit: string;
  location: LocationCoords;
  water_source: string;
  power_source: SolarPowerData;
  pump: PumpData;
  soil?: SoilData;
  irrigation_method?: string;
}

export interface FarmCreateResponse {
  message: string;
  farm_id: string;
}

export interface ProfileResponse {
  profile?: Profile;
  farms?: Farm[];
}

export interface AssignUnitsRequest {
  unit_ids: string[];
}

export interface AssignUnitsResponse {
  message: string;
  farm_id: string;
  unit_ids: string[];
}

export interface IrrigateResponse {
  message: string;
  farm_id: string;
  irrigated_at: string;
}

// Analytics Types
export interface CurrentAnalytics {
  TAW: number;
  RAW: number;
  ET_c: number;
  D_current: number;
  timestamp: string;
}

export interface ActualRecord {
  timestamp: string;
  D_current: number;
  TAW: number;
  RAW: number;
  ET_c: number;
  growth_stage?: string;
  stage?: string;
  crop_stage?: string;
  [key: string]: any;
}

export interface DepletionPoint {
  timestamp: string;
  D_current: number;
}

export interface DepletionPrediction {
  polynomial: DepletionPoint[];
  linear: DepletionPoint[];
  hours_till_TAW: number;
}

export interface WaterCapacityPrediction {
  time: string;
  available_power_kw: number;
  water_capacity_l: number;
}

export interface ForecastRecord {
  time: string;
  rain_mm: number;
  rain_probability: number;
  solar_radiation: number;
}

export interface IrrigationWindow {
  start_time: string | null;
  end_time: string | null;
}

export interface AnalyticsResponse {
  farm_id: string;
  last_irrigation: string | null;
  current: CurrentAnalytics;
  actual_records: ActualRecord[];
  depletion_prediction: DepletionPrediction;
  water_capacity_prediction: WaterCapacityPrediction[];
  forecast_data: ForecastRecord[];
  irrigation_window: IrrigationWindow;
}

// AI Help Sidebar Form Types
export interface FormHelperFields {
  name?: string;
  crop?: string;
  area?: number;
  area_unit?: string;
  water_source?: string;
  solar_capacity_kw?: number;
  panel_tilt_deg?: number;
  panel_direction_deg?: number;
  pump_rated_power_hp?: number;
  pump_rated_flow_lpm?: number;
  pump_rated_head_m?: number;
  soil_type?: string;
  soil_ph?: number;
  theta_fc?: number;
  theta_wp?: number;
  irrigation_method?: string;
  location_query?: string;
}

export interface FormHelperResponse {
  transcript?: string;
  reply: string;
  fields: FormHelperFields;
  missing_required: string[];
}

export interface AISummaryAction {
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

export interface FarmSummaryResponse {
  status: 'healthy' | 'irrigate_soon' | 'irrigate_now' | 'insufficient_data';
  headline: string;
  summary: string;
  actions: AISummaryAction[];
  watch_outs: string[];
  window_note?: string;
}
