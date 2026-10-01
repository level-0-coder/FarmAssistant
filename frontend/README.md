# Farm Assistant — Smart Solar Irrigation Frontend

A modern, responsive, and intuitive web application for smallholder farmers across India using solar-powered irrigation systems. "Farm Assistant" helps farmers determine optimal irrigation timing by fusing real-time weather forecasts, soil depletion modeling, and solar panel power curves.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.0 or later
- **npm**: v9.0 or later

### 2. Installation
Navigate into the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
```

### 3. Environment Setup
Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to configure your keys and API URLs:

```env
# Point to your FastAPI backend (used when VITE_USE_MOCKS=false)
VITE_API_BASE_URL=http://localhost:8000

# Set to 'true' for standalone demo / offline mode with realistic mock data
VITE_USE_MOCKS=true

# Google Gemini API key for AI assistant features (Sidebar & Farm Summary)
# Get a key at: https://aistudio.google.com
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Gemini model identifier (never hardcoded in application logic)
VITE_GEMINI_MODEL=gemini-2.5-flash
```

### 4. Running the Development Server

```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌾 Key Features & Routes

- **`/` — Marketing Landing Page & Auth Modal**:
  - Introduction to the solar irrigation advisory system.
  - "Instant Demo Login" button bypasses authentication for testing with preset mock credentials.
- **`/profile` — Farmer Profile & Onboarding**:
  - Step-by-step onboarding for first-time users.
  - Profile edit mode for existing users (Farmer type, Primary crop, Land area, Language, WhatsApp/SMS notification preferences).
  - Uses HTTP `PATCH /api/v1/profile` sending merged nested groups.
- **`/dashboard` — Farm Portfolio Overview**:
  - Farm cards displaying quick status chips, condition gauge, crop, pump details, and irrigation readiness.
  - Cached analytics fetching with smooth loading skeletons.
- **`/farms/new` — Guided Farm Creation**:
  - 7 logical sections (Basic Info, Water Source, Solar Setup, Pump, Soil, Irrigation Method, Review).
  - Satellite map boundary drawing with Leaflet, Esri World Imagery, Turf.js area calculation, pin dragging, and self-intersection warnings.
  - Live animated SVG schematic diagrams for Water Sources, Solar Tilt & Azimuth, Pump Head/Flow, Soil Moisture thresholds ($\theta_{fc}$ and $\theta_{wp}$), and Irrigation Methods (Drip, Sprinkler, Furrow).
  - **Embedded AI Assistant Sidebar**: Voice-dictation (MediaRecorder) and text chat powered by Google Gemini SDK (`@google/genai`). Directly autofills form inputs with high-contrast yellow pulse highlights and an "Undo" stack.
- **`/farms/:farmId` — Farm Detail & Irrigation Analytics**:
  - Summary KPI strip showing Total Available Water (TAW), Readily Available Water (RAW), and current Root Zone Depletion ($D_{current}$).
  - Recommended Solar Irrigation Window highlighted across all time axes.
  - 4 interconnected interactive charts (Recharts):
    1. **Root Zone Soil Water Depletion ($D_r$)**: Actual measurements scatter, polynomial trendline, linear projection, RAW threshold, and Root Zone Stress band.
    2. **Available Water ($AW = TAW - D_r$)**: Inverted representation with stress threshold.
    3. **Solar Radiation & Rain Forecast**: Solar flux bell curve with optional precipitation bar overlay toggle.
    4. **Pumpable Water Forecast**: Hourly bar chart colored by solar pump kW output with total window volume caption.
  - **AI Farm Advisory Summary**: Generates practical, human-friendly Hindi/Hinglish/English operational advice with status chips, priority actions, and watch-outs.
  - **Record Irrigation Dialog**: Log actual irrigation events (with clear disclaimer that this records data and does not physically turn on or control pumps).
  - **Assign Units Dialog**: Manage sensors and pump flow meters.

---

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + custom SVG animations & glassmorphism
- **Routing**: React Router v6
- **Charts**: Recharts (with custom SVG shapes, reference areas, and dual axes)
- **Maps & Geospatial**: Leaflet, React-Leaflet, and `@turf/turf`
- **Generative AI**: Official Google Gen AI SDK (`@google/genai` v0.2.x)
- **Icons**: Lucide React

---

## 📋 Backend Contract & Assumptions Reference

This application adheres strictly to the backend specifications defined in the Farm Assistant API:

| Topic | Specification / Assumption |
| :--- | :--- |
| **Auth Token** | Saved in `localStorage` under `fa_jwt_token`. Sent as `Authorization: Bearer <token>` in all API calls. |
| **Profile Response** | `GET /api/v1/profile` returns `{ profile: {...}, farms: [...] }`. The UI defensively checks `response.farms ?? response.profile?.farms ?? []`. |
| **Profile Updates** | `PATCH /api/v1/profile` requires entire nested sections to be sent if modified. The frontend merges existing profile groups before dispatching. |
| **Area Units** | Standardized to: `acre`, `hectare`, `m2`, `bigha`, `guntha`. Converted cleanly for Turf.js geometry calculations. |
| **Growth Stage Field** | Analytics records flexibly read `growth_stage`, `stage`, or `crop_stage` from the backend telemetry payload. |
| **Solar Power** | Power source is strictly assumed to be `"solar"` (no grid/diesel selections). |
| **TAW / RAW Units** | Displayed and labeled strictly in **mm of depth** (never as days or percentage). |
| **Pump Control Disclaimer** | The app explicitly clarifies across all irrigation dialogs that it provides **advisory recommendations only** and does not actuate physical pump hardware. |
| **Timezone & Offsets** | Weather forecast charts use Indian Standard Time (`+05:30` UTC offset). |

---

## 🧪 Testing with Mock Mode

When `VITE_USE_MOCKS=true`:
- No backend server is required.
- You can log in using the "Instant Demo Login" button on the home screen.
- Pre-populated farms include realistic soil depletion trends, solar radiation curves, and next-day irrigation windows.
- Creating a farm, recording irrigation, or assigning units updates the in-memory mock store for the duration of the session.
