import React from 'react';

interface Props {
  capacityKw: number;
  tiltDeg?: number;
  directionDeg?: number; // 0-360, 180 = south
}

export const SolarDiagram: React.FC<Props> = ({
  capacityKw = 3,
  tiltDeg = 20,
  directionDeg = 180,
}) => {
  const displayTilt = Math.min(90, Math.max(0, tiltDeg || 20));
  const displayDirection = Math.min(360, Math.max(0, directionDeg !== undefined ? directionDeg : 180));
  const displayKw = capacityKw > 0 ? capacityKw : 3.0;

  // Direction cardinal label
  const getCardinal = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) return 'N (North)';
    if (deg >= 22.5 && deg < 67.5) return 'NE';
    if (deg >= 67.5 && deg < 112.5) return 'E (East)';
    if (deg >= 112.5 && deg < 157.5) return 'SE';
    if (deg >= 157.5 && deg < 202.5) return 'S (South - Optimal in India)';
    if (deg >= 202.5 && deg < 247.5) return 'SW';
    if (deg >= 247.5 && deg < 292.5) return 'W (West)';
    return 'NW';
  };

  return (
    <div className="bg-gradient-to-b from-amber-50/70 to-emerald-50/40 rounded-2xl p-4 border border-amber-200/70 flex flex-col items-center justify-center text-slate-700 min-h-[200px]">
      <div className="flex items-center justify-between w-full px-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-forest/70">
          Solar Array Live Model
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sun text-slate-900 shadow-sm">
          {displayKw} kW Array
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full items-center">
        {/* PANEL TILT ANGLE VISUALIZATION */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 180 140" className="w-full max-w-[170px] h-auto drop-shadow-sm select-none">
            {/* Ground */}
            <line x1="10" y1="120" x2="170" y2="120" stroke="#64748B" strokeWidth="2.5" />
            
            {/* Vertical mounting post */}
            <rect x="75" y="65" width="8" height="55" fill="#475569" rx="2" />
            <circle cx="79" cy="65" r="5" fill="#1E293B" />

            {/* Rotatable Solar Panel */}
            <g transform={`rotate(${-displayTilt}, 79, 65)`}>
              {/* Panel body */}
              <rect x="29" y="59" width="100" height="12" fill="#0284C7" rx="3" stroke="#0369A1" strokeWidth="1.5" />
              {/* Grid cell lines */}
              <line x1="54" y1="59" x2="54" y2="71" stroke="#BAE6FD" strokeWidth="1" />
              <line x1="79" y1="59" x2="79" y2="71" stroke="#BAE6FD" strokeWidth="1" />
              <line x1="104" y1="59" x2="104" y2="71" stroke="#BAE6FD" strokeWidth="1" />
            </g>

            {/* Tilt Arc */}
            <path
              d="M 125 120 A 45 45 0 0 0 120 90"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <text x="135" y="105" fill="#D97706" fontSize="10" fontWeight="bold">
              {displayTilt}° Tilt
            </text>
          </svg>
          <span className="text-[11px] font-medium text-slate-600 mt-1">
            Tilt: <b>{displayTilt}°</b> (from horizontal)
          </span>
        </div>

        {/* COMPASS AZIMUTH VISUALIZATION */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 140 140" className="w-full max-w-[130px] h-auto drop-shadow-sm select-none">
            {/* Compass Outer Dial */}
            <circle cx="70" cy="70" r="56" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
            <circle cx="70" cy="70" r="50" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />

            {/* Cardinal Letters */}
            <text x="70" y="27" fill="#EF4444" fontSize="11" fontWeight="bold" textAnchor="middle">N</text>
            <text x="113" y="74" fill="#64748B" fontSize="10" fontWeight="bold" textAnchor="middle">E</text>
            <text x="70" y="118" fill="#15803D" fontSize="11" fontWeight="bold" textAnchor="middle">S</text>
            <text x="27" y="74" fill="#64748B" fontSize="10" fontWeight="bold" textAnchor="middle">W</text>

            {/* Ticks */}
            <line x1="70" y1="31" x2="70" y2="35" stroke="#94A3B8" strokeWidth="1.5" />
            <line x1="70" y1="105" x2="70" y2="109" stroke="#94A3B8" strokeWidth="1.5" />
            <line x1="31" y1="70" x2="35" y2="70" stroke="#94A3B8" strokeWidth="1.5" />
            <line x1="105" y1="70" x2="109" y2="70" stroke="#94A3B8" strokeWidth="1.5" />

            {/* Needle pointing to directionDeg */}
            <g transform={`rotate(${displayDirection}, 70, 70)`}>
              {/* North tip (Red) */}
              <polygon points="70,28 66,70 74,70" fill="#EF4444" />
              {/* South tip (Slate) */}
              <polygon points="70,112 66,70 74,70" fill="#475569" />
              <circle cx="70" cy="70" r="4" fill="#1E293B" />
            </g>
          </svg>
          <span className="text-[11px] font-medium text-slate-600 mt-1">
            Azimuth: <b>{displayDirection}°</b> ({getCardinal(displayDirection)})
          </span>
        </div>
      </div>
    </div>
  );
};
