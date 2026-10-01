import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import { AREA_UNITS } from '../config/options';
import { Search, LocateFixed, Undo2, X, Check, AlertTriangle } from 'lucide-react';

// Fix Leaflet default icon issue in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PIN_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LatLng { lat: number; lng: number; }

interface MapFieldProps {
  onAreaChange: (lat: number, lng: number, area: number) => void;
  onUnitChange: (unit: string) => void;
  unit: string;
  searchQuery?: string;
  onSearchQueryConsumed?: () => void;
}

// Inner component that can useMap
function MapClickHandler({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng);
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [map, onMapClick]);
  return null;
}

function FlyToController({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 15, { duration: 1.2 });
    }
  }, [map, target]);
  return null;
}

function convertArea(sqM: number, unit: string): number {
  const cfg = AREA_UNITS.find(u => u.value === unit);
  if (!cfg) return sqM;
  return sqM / cfg.sqMeters;
}

export const FarmMap: React.FC<MapFieldProps> = ({
  onAreaChange,
  onUnitChange,
  unit,
  searchQuery,
  onSearchQueryConsumed,
}) => {
  const [pins, setPins] = useState<LatLng[]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [flyTarget, setFlyTarget] = useState<LatLng | null>(null);
  const [selfKink, setSelfKink] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [manualArea, setManualArea] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Process external searchQuery from AI sidebar
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      setSearchText(searchQuery.trim());
      triggerSearch(searchQuery.trim());
      onSearchQueryConsumed?.();
    }
  }, [searchQuery]);

  const triggerSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=5&countrycodes=in`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'FarmAssistant/1.0' },
      });
      const results = await response.json();
      setSearchResults(Array.isArray(results) ? results : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchInput = (val: string) => {
    setSearchText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerSearch(val);
    }, 600);
  };

  const handleSelectResult = (r: { display_name: string; lat: string; lon: string }) => {
    setSearchText(r.display_name.split(',')[0]);
    setSearchResults([]);
    setFlyTarget({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setFlyTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => alert(`Could not get your location: ${err.message}`)
    );
  };

  const computeFromPins = useCallback((currentPins: LatLng[], closed: boolean) => {
    if (currentPins.length < 2) {
      onAreaChange(0, 0, 0);
      setSelfKink(false);
      return;
    }

    // Mean lat/lng (as specified - plain average of pin coordinates)
    const avgLat = currentPins.reduce((s, p) => s + p.lat, 0) / currentPins.length;
    const avgLng = currentPins.reduce((s, p) => s + p.lng, 0) / currentPins.length;

    if (!closed || currentPins.length < 3) {
      onAreaChange(avgLat, avgLng, 0);
      return;
    }

    // Compute geodesic area
    const coords = [...currentPins.map(p => [p.lng, p.lat] as [number, number])];
    coords.push(coords[0]); // close ring
    const polygon = turf.polygon([coords]);

    // Check self-intersection
    try {
      const kinks = turf.kinks(polygon);
      setSelfKink(kinks.features.length > 0);
    } catch { setSelfKink(false); }

    const sqMeters = Math.abs(turf.area(polygon));
    const convertedArea = convertArea(sqMeters, unit);
    onAreaChange(avgLat, avgLng, parseFloat(convertedArea.toFixed(4)));
    setManualArea(false);
  }, [unit, onAreaChange]);

  const handleMapClick = useCallback((latlng: LatLng) => {
    if (isClosed) return;

    setPins(prev => {
      // Check if clicking near first pin to close shape
      if (prev.length >= 3) {
        const first = prev[0];
        const dist = Math.sqrt(Math.pow(latlng.lat - first.lat, 2) + Math.pow(latlng.lng - first.lng, 2));
        if (dist < 0.0002) {
          setIsClosed(true);
          setTimeout(() => computeFromPins(prev, true), 0);
          return prev;
        }
      }
      const newPins = [...prev, latlng];
      setTimeout(() => computeFromPins(newPins, false), 0);
      return newPins;
    });
  }, [isClosed, computeFromPins]);

  const handleClose = () => {
    if (pins.length < 3) return;
    setIsClosed(true);
    computeFromPins(pins, true);
  };

  const handleUndo = () => {
    if (isClosed) {
      setIsClosed(false);
      computeFromPins(pins, false);
    } else {
      const newPins = pins.slice(0, -1);
      setPins(newPins);
      computeFromPins(newPins, false);
    }
  };

  const handleClear = () => {
    setPins([]);
    setIsClosed(false);
    setSelfKink(false);
    onAreaChange(0, 0, 0);
    setManualArea(false);
  };

  // Re-compute area when unit changes
  useEffect(() => {
    if (isClosed && pins.length >= 3) {
      computeFromPins(pins, true);
    }
  }, [unit]);

  const polygonPositions = pins.map(p => [p.lat, p.lng] as [number, number]);
  const linePositions = pins.map(p => [p.lat, p.lng] as [number, number]);

  // Draggable pin positions via Marker drag
  const handleMarkerDrag = (idx: number, latlng: LatLng) => {
    const newPins = [...pins];
    newPins[idx] = latlng;
    setPins(newPins);
    computeFromPins(newPins, isClosed);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search Box */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchText}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Search village, district or place in India..."
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-warm focus:bg-white focus:border-forest focus:ring-1 focus:ring-forest/20 text-sm outline-none transition-all"
          />
          {searching && (
            <div className="absolute right-3 top-3 w-5 h-5 border-2 border-leaf-400 border-t-transparent rounded-full animate-spin" />
          )}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-hover z-50 mt-1 overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left px-3 py-2.5 text-xs text-slate-700 hover:bg-mint hover:text-forest transition-colors border-b border-slate-100 last:border-0"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleUseMyLocation}
          title="Use my location"
          className="h-11 w-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-forest hover:bg-mint transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      {/* Map Controls Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleUndo}
          disabled={pins.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Undo last pin
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={pins.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-critical"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
        {!isClosed && pins.length >= 3 && (
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-leaf-300 bg-mint hover:bg-leaf-100 text-forest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-forest animate-pulse-subtle"
          >
            <Check className="w-3.5 h-3.5" />
            Close shape
          </button>
        )}
        {selfKink && (
          <span className="flex items-center gap-1 text-xs text-amber-700 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            Polygon may cross itself — accuracy affected.
          </span>
        )}
        {!isClosed && pins.length < 3 && (
          <span className="text-xs text-slate-400 italic">
            Click on the map to add pins. Need at least 3 to close the shape.
          </span>
        )}
      </div>

      {/* Unit Selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Area unit:</label>
        <select
          value={unit}
          onChange={e => onUnitChange(e.target.value)}
          className="h-9 px-3 rounded-xl border border-slate-200 bg-warm focus:border-forest text-xs font-semibold outline-none text-forest"
        >
          {AREA_UNITS.map(u => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </div>

      {/* Map Canvas */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 relative" style={{ height: '400px' }}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          {/* Satellite Layer (Esri World Imagery) */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            maxZoom={19}
          />
          {/* Esri Reference Labels Overlay */}
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            maxZoom={19}
            opacity={0.7}
          />

          <MapClickHandler onMapClick={handleMapClick} />
          <FlyToController target={flyTarget} />

          {/* Draw Polyline (open path) */}
          {!isClosed && pins.length > 1 && (
            <Polyline positions={linePositions} color="#2E9E4F" weight={2} dashArray="4 4" />
          )}

          {/* Draw closed Polygon */}
          {isClosed && pins.length >= 3 && (
            <Polygon
              positions={polygonPositions}
              color="#2E9E4F"
              fillColor="#2E9E4F"
              fillOpacity={0.25}
              weight={2.5}
            />
          )}

          {/* Draggable Pin Markers */}
          {pins.map((pin, idx) => (
            <Marker
              key={idx}
              position={[pin.lat, pin.lng]}
              icon={PIN_ICON}
              draggable={true}
              eventHandlers={{
                dragend: (e: any) => {
                  const latlng = e.target.getLatLng();
                  handleMarkerDrag(idx, { lat: latlng.lat, lng: latlng.lng });
                },
              }}
            />
          ))}
        </MapContainer>

        {/* FLOATING AREA BADGE */}
        {manualArea && (
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm border border-leaf-200 rounded-2xl px-4 py-2 shadow-hover z-10">
            <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Manually entered area
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Click to place pins. Click the first pin or press "Close shape" to finish. Drag pins to adjust.
        The field boundary is used only for area calculation and is not stored.
      </p>
    </div>
  );
};
