// Realistic Mock Data Layer for Farm Assistant
import { 
  Profile, 
  Farm, 
  AnalyticsResponse, 
  ActualRecord, 
  DepletionPoint, 
  WaterCapacityPrediction, 
  ForecastRecord 
} from '../types';

// In-memory mock store that persists during session
let mockProfile: Profile = {
  name: 'Ramesh Patel',
  age: 46,
  gender: 'Male',
  phone: '9876543210',
  location: {
    state: 'Gujarat',
    district: 'Mehsana',
    village: 'Kadi',
    pincode: '382715',
  },
  farming: {
    experience_years: 18,
    farmer_type: 'Semi-medium (2-4 ha)',
    farming_type: 'Conventional',
    total_area: 5.5,
    area_unit: 'acre',
  },
  preferences: {
    language: 'English',
    notification: 'WhatsApp',
  },
};

const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();

let mockFarms: Farm[] = [
  {
    farm_id: 'farm_saraswati_01',
    name: 'Saraswati Wheat Field',
    crop: 'Wheat',
    area: 3.5,
    area_unit: 'acre',
    location: {
      latitude: 23.5880,
      longitude: 72.3693,
    },
    water_source: 'Borewell',
    power_source: {
      type: 'solar',
      solar_capacity: 5.0,
      panel_tilt: 23,
      panel_direction: 180,
    },
    pump: {
      rated_power_hp: 5.0,
      rated_flow_lpm: 450,
      rated_head_m: 35,
    },
    soil: {
      type: 'Sandy loam',
      ph: 7.2,
      theta_fc: 0.28,
      theta_wp: 0.12,
    },
    irrigation_method: 'Drip',
    units: ['SN-MEH-01', 'SN-MEH-02'],
    irrigation_history: [fourDaysAgo],
  },
  {
    farm_id: 'farm_narmada_02',
    name: 'Narmada Canal Plot',
    crop: 'Wheat',
    area: 2.0,
    area_unit: 'acre',
    location: {
      latitude: 23.6120,
      longitude: 72.4100,
    },
    water_source: 'Canal',
    power_source: {
      type: 'solar',
      solar_capacity: 3.0,
      panel_tilt: 20,
      panel_direction: 180,
    },
    pump: {
      rated_power_hp: 3.0,
      rated_flow_lpm: 300,
      rated_head_m: 20,
    },
    soil: {
      type: 'Loam',
      ph: 7.0,
      theta_fc: 0.32,
      theta_wp: 0.14,
    },
    irrigation_method: 'Sprinkler',
    units: [],
    irrigation_history: [],
  },
];

export function getMockProfileData() {
  return {
    profile: { ...mockProfile },
    farms: [...mockFarms],
  };
}

export function saveMockProfile(data: Profile) {
  mockProfile = { ...mockProfile, ...data };
  return { message: 'Profile saved successfully' };
}

export function addMockFarm(farmData: Omit<Farm, 'farm_id' | 'units' | 'irrigation_history'>) {
  const farm_id = `farm_${Math.random().toString(36).substring(2, 10)}`;
  const newFarm: Farm = {
    ...farmData,
    farm_id,
    units: [],
    irrigation_history: [],
  };
  mockFarms.push(newFarm);
  return { message: 'Farm added successfully', farm_id };
}

export function assignMockUnits(farmId: string, unitIds: string[]) {
  const farm = mockFarms.find(f => f.farm_id === farmId);
  if (!farm) throw new Error('Farm not found');
  farm.units = Array.from(new Set([...farm.units, ...unitIds]));
  return { message: 'Units assigned successfully', farm_id: farmId, unit_ids: farm.units };
}

export function irrigateMockFarm(farmId: string) {
  const farm = mockFarms.find(f => f.farm_id === farmId);
  if (!farm) throw new Error('Farm not found');
  const nowIso = new Date().toISOString();
  if (!farm.irrigation_history) farm.irrigation_history = [];
  farm.irrigation_history.push(nowIso);
  return { message: 'Irrigation recorded successfully', farm_id: farmId, irrigated_at: nowIso };
}

export function generateMockAnalytics(farmId: string): AnalyticsResponse {
  const farm = mockFarms.find(f => f.farm_id === farmId);
  if (!farm) {
    throw new Error('Farm not found');
  }

  // If farm has 0 units (like Farm 2), simulate the backend error for insufficient data
  if (farm.units.length === 0) {
    throw new Error('Insufficient sensor records to compute analytics. Assign units and wait for readings.');
  }

  const TAW = 52.0; // mm
  const RAW = 26.0; // mm
  const ET_c = 4.3; // mm/day
  const now = Date.now();
  const oneHour = 3600 * 1000;

  // Generate 48 hours of past actual records
  const actual_records: ActualRecord[] = [];
  const startHoursAgo = 48;
  let startDepletion = 12.0;

  for (let i = startHoursAgo; i >= 0; i--) {
    const time = new Date(now - i * oneHour).toISOString();
    // Depletion increases each hour with small variation
    const growth = (startHoursAgo - i) * (16.5 / startHoursAgo);
    const noise = Math.sin(i / 3) * 0.4;
    const currentDepletion = Math.min(TAW, Math.max(0, startDepletion + growth + noise));

    actual_records.push({
      timestamp: time,
      D_current: parseFloat(currentDepletion.toFixed(2)),
      TAW,
      RAW,
      ET_c,
      stage: 'Tillering',
      crop_stage: 'Tillering (Vegetative)',
    });
  }

  const latestRecord = actual_records[actual_records.length - 1];
  const D_current = latestRecord.D_current; // approx 28.5 mm (in stress zone > RAW)

  // Prediction curves for next 48 hours
  const poly_predictions: DepletionPoint[] = [];
  const linear_predictions: DepletionPoint[] = [];
  const hours_till_TAW = Math.max(8, Math.round((TAW - D_current) / (ET_c / 24)));

  for (let h = 0; h <= 48; h++) {
    const futureTime = new Date(now + h * oneHour).toISOString();
    
    // Polynomial prediction: accelerating upward curve
    const polyDep = D_current + (h * 0.42) + (Math.pow(h, 2) * 0.004);
    poly_predictions.push({
      timestamp: futureTime,
      D_current: parseFloat(Math.min(TAW * 1.15, polyDep).toFixed(2)),
    });

    // Linear prediction: straight line from ETc
    const linDep = D_current + (h * (ET_c / 24));
    linear_predictions.push({
      timestamp: futureTime,
      D_current: parseFloat(Math.min(TAW * 1.15, linDep).toFixed(2)),
    });
  }

  // 72 hours forecast data (Open-Meteo local format YYYY-MM-DDTHH:00)
  const forecast_data: ForecastRecord[] = [];
  const water_capacity_prediction: WaterCapacityPrediction[] = [];

  // Next day's optimal solar window: e.g. 10:00 to 14:00
  const tomorrow = new Date(now + 24 * oneHour);
  const winStart = new Date(tomorrow);
  winStart.setHours(10, 0, 0, 0);
  const winEnd = new Date(tomorrow);
  winEnd.setHours(14, 0, 0, 0);

  const formatLocalHour = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  };

  for (let h = 0; h < 72; h++) {
    const d = new Date(now + h * oneHour);
    const localHourString = formatLocalHour(d);
    const hourOfDay = d.getHours();

    // Solar radiation: bell curve between 06:00 and 18:00
    let solar_rad = 0;
    if (hourOfDay >= 6 && hourOfDay <= 18) {
      const peak = 880; // W/m2
      const x = (hourOfDay - 6) / 12; // 0 to 1
      solar_rad = peak * Math.sin(Math.PI * x);
    }
    solar_rad = Math.max(0, Math.round(solar_rad));

    const rain_prob = hourOfDay >= 15 && hourOfDay <= 17 ? 12 : 0;
    const rain_mm = 0;

    forecast_data.push({
      time: localHourString,
      solar_radiation: solar_rad,
      rain_probability: rain_prob,
      rain_mm,
    });

    // Water capacity from pump (5HP = 3.73kW, flow = 450 L/min = 27,000 L/hr max)
    let available_power_kw = (solar_rad / 1000) * farm.power_source.solar_capacity;
    available_power_kw = Math.min(farm.power_source.solar_capacity, parseFloat(available_power_kw.toFixed(2)));
    
    let water_capacity_l = 0;
    if (available_power_kw > 1.2) {
      const ratio = Math.min(1.0, available_power_kw / (farm.pump.rated_power_hp * 0.746));
      water_capacity_l = Math.round(farm.pump.rated_flow_lpm * 60 * ratio);
    }

    water_capacity_prediction.push({
      time: localHourString,
      available_power_kw,
      water_capacity_l,
    });
  }

  return {
    farm_id: farm.farm_id,
    last_irrigation: farm.irrigation_history?.[farm.irrigation_history.length - 1] || null,
    current: {
      TAW,
      RAW,
      ET_c,
      D_current: parseFloat(D_current.toFixed(2)),
      timestamp: latestRecord.timestamp,
    },
    actual_records,
    depletion_prediction: {
      polynomial: poly_predictions,
      linear: linear_predictions,
      hours_till_TAW,
    },
    water_capacity_prediction,
    forecast_data,
    irrigation_window: {
      start_time: winStart.toISOString(),
      end_time: winEnd.toISOString(),
    },
  };
}
