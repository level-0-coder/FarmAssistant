# FarmAssistant 🌾

An AI-powered smart agriculture and precision irrigation management platform. FarmAssistant integrates real-time IoT soil sensors, satellite soil data (SoilGrids WCS), weather forecasts (Open-Meteo), deep-learning-based crop growth stage classification (PyTorch / MobileNetV3), and physics-based FAO-56 evapotranspiration models to predict optimal irrigation schedules and conserve water.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Seeding Sample Data](#3-seeding-sample-data)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [License](#-license)

---

## 🌟 Overview

Modern farming faces critical challenges regarding water scarcity, fluctuating weather, and energy costs. **FarmAssistant** bridges hardware IoT telemetry with advanced machine learning and agro-meteorological models to provide actionable irrigation recommendations.

The system continuously evaluates:
- **Crop Growth Stage:** Computer vision (MobileNetV3) models detect phenological stages from camera telemetry.
- **Evapotranspiration ($ET_0$ & $ET_c$):** Real-time FAO-56 Penman-Monteith calculations driven by local weather forecasts.
- **Root-Zone Soil Moisture:** Soil moisture balance combined with depth-stratified SoilGrids WCS layers.
- **Smart Scheduling:** Automated background job runs periodic predictions and flags optimal irrigation windows based on moisture depletion thresholds, weather, and solar energy availability.

---

## ✨ Key Features

- **Dynamic Irrigation Recommendation:** Computes water depletion and pinpoints precise irrigation volume ($m^3$ or liters) and timing.
- **Interactive Farm Mapping:** Geospatial polygon drawing with Leaflet and Turf.js for field boundaries and area calculation.
- **Crop Growth Stage Detection:** PyTorch-powered inference identifying crop stages (e.g. Seedling, Flowering, Fruit, Seed) to dynamically adjust crop coefficient ($K_c$).
- **IoT Unit & Sensor Integration:** Support for moisture sensors, temperature probes, and field camera feeds.
- **Farmer Profile & Onboarding:** Tailored farmer settings including soil characteristics, pump horsepower, and power sources (grid / solar).
- **Background Automation:** APScheduler-driven worker that recalculates farm water analytics and depletion alerts at regular intervals.

---

## 🛠 Architecture & Tech Stack

### Backend & ML / Scientific Computing
- **Language & Runtime:** Python 3.10+
- **API Framework:** FastAPI, Uvicorn, Starlette
- **Database:** MongoDB via PyMongo
- **Scheduling:** APScheduler
- **Machine Learning & CV:** PyTorch, TorchVision, Pillow, Scikit-Learn, NumPy, SciPy
- **Geospatial & Remote Sensing:** OWSLib (Web Coverage Service / SoilGrids), Rasterio
- **Security & Auth:** Argon2 password hashing (`pwdlib`), JWT authentication (`PyJWT`)

### Frontend
- **Framework:** React 18 with TypeScript & Vite
- **Styling:** Tailwind CSS, PostCSS, Lucide React icons
- **Maps & Geo:** Leaflet, React-Leaflet, Turf.js
- **Charts & Data Visualization:** Recharts
- **Routing & State:** React Router DOM v6, React Context API

---

## 📁 Project Structure

```text
FarmAssistant/
├── package.json               # Root scripts for frontend dev/build
├── frontend/                  # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── api/               # API clients (auth, farms, profile, sensors)
│   │   ├── components/        # Reusable UI components & map tools
│   │   ├── pages/             # Landing, Dashboard, Farm Details, Profile
│   │   ├── state/             # Context state providers (ProfileProvider)
│   │   ├── App.tsx            # Routes and layout guards
│   │   └── main.tsx           # Vite entrypoint
│   ├── package.json
│   └── vite.config.ts
├── python/                    # Python Backend & ML Inference Engine
│   ├── requirements.txt       # Python dependencies
│   ├── backend/               # FastAPI application
│   │   ├── auth/              # JWT auth & security helpers
│   │   ├── farms/             # Farm CRUD and irrigation analytics routes
│   │   ├── profile/           # Farmer onboarding & profile management
│   │   ├── sensors/           # IoT unit registration & telemetry endpoints
│   │   ├── storage/           # Local storage for camera image uploads
│   │   ├── database.py        # MongoDB connection & indexes
│   │   ├── scheduler.py       # Background irrigation analytics scheduler
│   │   ├── seed_data.py       # Demo database seeder
│   │   └── main.py            # FastAPI entry point & CORS configuration
│   └── inference/             # Agronomic & ML models
│       ├── wheat_stage_model.pth # Trained MobileNetV3 weights
│       ├── predict.py         # Image classification for crop stages
│       ├── calc.py            # FAO-56 crop water demand & ET calculations
│       ├── open_meteo.py      # Weather forecast ingestion
│       ├── soil_grids_2.py    # ISRIC SoilGrids WCS soil moisture data fetcher
│       ├── predict_water.py   # Soil water balance and depletion models
│       └── simulation.py      # Irrigation scheduling simulation
└── README.md                  # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or later and `npm`
- **Python**: v3.10 or later
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster URI

---

### 1. Backend Setup

1. Open a terminal and navigate to the `python` directory:
   ```bash
   cd python
   ```

2. Create and activate a Python virtual environment:
   - **Windows:**
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure the environment variables in `python/backend/.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=farm_assistant
   JWT_SECRET_KEY=your-secure-random-jwt-secret-key
   ```

5. Run the FastAPI development server from the `python` directory:
   ```bash
   uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
   ```
   *The API will be available at `http://127.0.0.1:8000`, and interactive Swagger docs at `http://127.0.0.1:8000/docs`.*

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory (or use the root shortcuts):
   ```bash
   cd frontend
   npm install
   ```

2. (Optional) Create `frontend/.env` if you need custom API URLs:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   *Alternatively, from the project root directory, run `npm run dev`.*

4. Access the web application at `http://localhost:5173`.

---

### 3. Seeding Sample Data

To populate sample users, farms, sensor products, units, and telemetry data for demonstration:

```bash
cd python
python -m backend.seed_data
```

**Default Test Credentials:**
- **Email:** `farmer@test.com`
- **Password:** `password123`

---

## 📡 API Documentation

Interactive OpenAPI documentation is generated automatically by FastAPI:
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Key Endpoints

| Category | Endpoint | Method | Description |
|---|---|---|---|
| **Auth** | `/api/v1/auth/register` | `POST` | Register a new user |
| **Auth** | `/api/v1/auth/login` | `POST` | Authenticate and obtain JWT token |
| **Profile** | `/api/v1/profile` | `GET` / `PATCH` | Get or update farmer profile & onboarding info |
| **Farms** | `/api/v1/farms` | `GET` / `POST` | List user farms or register a new farm |
| **Farms** | `/api/v1/farms/{farm_id}` | `GET` / `PATCH` / `DELETE` | Farm details and management |
| **Irrigation** | `/api/v1/farms/{farm_id}/irrigate` | `GET` / `POST` | Fetch or trigger irrigation analytics & recommendations |
| **Sensors** | `/api/v1/sensor-products` | `GET` / `POST` | Manage sensor catalog specifications |
| **Sensors** | `/api/v1/units` | `GET` / `POST` | Register and list physical IoT units |
| **Sensors** | `/api/v1/sensor-readings` | `POST` / `GET` | Ingest sensor data (soil moisture, telemetry, images) |

---

## 🔐 Environment Variables

### Backend (`python/backend/.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | MongoDB database name | `farm_assistant` |
| `JWT_SECRET_KEY` | Secret key for signing authentication tokens | Long secure string |

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
