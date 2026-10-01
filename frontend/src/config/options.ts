// Application Configuration and Dropdown Options

export const FORECAST_UTC_OFFSET = '+05:30'; // India standard time offset

export interface AreaUnitConfig {
  value: string;
  label: string;
  sqMeters: number; // 1 unit in square meters
}

export const AREA_UNITS: AreaUnitConfig[] = [
  { value: 'acre', label: 'Acre', sqMeters: 4046.8564224 },
  { value: 'hectare', label: 'Hectare', sqMeters: 10000 },
  { value: 'm2', label: 'Square Metres (m²)', sqMeters: 1 },
  { value: 'bigha', label: 'Bigha (~0.62 acre)', sqMeters: 2500 },
  { value: 'guntha', label: 'Guntha (~101 m²)', sqMeters: 101.17 },
];

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say'
] as const;

export const FARMER_TYPES = [
  'Marginal (under 1 ha)',
  'Small (1-2 ha)',
  'Semi-medium (2-4 ha)',
  'Medium (4-10 ha)',
  'Large (10+ ha)'
] as const;

export const FARMING_TYPES = [
  'Conventional',
  'Organic',
  'Natural',
  'Mixed'
] as const;

export const NOTIFICATION_CHANNELS = [
  'None',
  'SMS',
  'WhatsApp',
  'Email'
] as const;

export const LANGUAGES = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Punjabi',
  'Odia'
] as const;

export const LANGUAGE_MAP: Record<string, { label: string; native: string }> = {
  English: { label: 'English', native: 'English' },
  Hindi: { label: 'Hindi', native: 'हिन्दी' },
  Tamil: { label: 'Tamil', native: 'தமிழ்' },
  Telugu: { label: 'Telugu', native: 'తెలుగు' },
  Kannada: { label: 'Kannada', native: 'ಕನ್ನಡ' },
  Malayalam: { label: 'Malayalam', native: 'മലയാളം' },
  Marathi: { label: 'Marathi', native: 'मराठी' },
  Bengali: { label: 'Bengali', native: 'বাংলা' },
  Gujarati: { label: 'Gujarati', native: 'ગુજરાતી' },
  Punjabi: { label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  Odia: { label: 'Odia', native: 'ଓଡ଼ିଆ' }
};

// Wheat is first and default per requirements (crop-stage model is wheat-only)
export const CROPS = [
  'Wheat',
  'Rice (Paddy)',
  'Cotton',
  'Sugarcane',
  'Maize',
  'Soybean',
  'Mustard',
  'Gram (Chickpea)',
  'Tomato',
  'Potato',
  'Onion',
  'Groundnut'
] as const;

export const WATER_SOURCES = [
  'Borewell',
  'Open well',
  'Canal',
  'Pond / farm pond',
  'River / stream',
  'Tank / reservoir'
] as const;

export const SOIL_TYPES = [
  'Sandy',
  'Sandy loam',
  'Loam',
  'Clay loam',
  'Clay',
  'Silt loam'
] as const;

export const IRRIGATION_METHODS = [
  'Drip',
  'Sprinkler',
  'Flood / surface',
  'Furrow',
  'Other'
] as const;

export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  GEMINI_MODEL: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash',
  USE_MOCKS: import.meta.env.VITE_USE_MOCKS === 'true' || !import.meta.env.VITE_API_BASE_URL,
};
