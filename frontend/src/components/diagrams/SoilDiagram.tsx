import React from 'react';

interface Props {
  soilType?: string;
  thetaFc?: number;
  thetaWp?: number;
}

export const SoilDiagram: React.FC<Props> = ({
  soilType = 'Loam',
  thetaFc = 0.28,
  thetaWp = 0.12,
}) => {
  const currentFc = thetaFc !== undefined && thetaFc > 0 ? thetaFc : 0.28;
  const currentWp = thetaWp !== undefined && thetaWp > 0 ? thetaWp : 0.12;
  const tawFrac = Math.max(0, currentFc - currentWp);

  return (
    <div className="bg-gradient-to-b from-stone-50 to-amber-50/50 rounded-2xl p-4 border border-amber-200/60 flex flex-col items-center justify-center text-slate-700 min-h-[200px]">
      <div className="text-xs font-semibold uppercase tracking-wider text-forest/70 mb-2">
        Soil Moisture Capacity Profile ({soilType || 'Soil'})
      </div>

      <svg viewBox="0 0 360 160" className="w-full max-h-[160px] drop-shadow-sm select-none">
        <defs>
          <linearGradient id="soilTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="soilSub" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>

        {/* Soil Column */}
        <rect x="50" y="20" width="80" height="40" fill="url(#soilTop)" rx="2" />
        <rect x="50" y="60" width="80" height="70" fill="url(#soilSub)" rx="2" />
        <text x="90" y="44" fill="#FEF3C7" fontSize="9" fontWeight="bold" textAnchor="middle">Topsoil (A)</text>
        <text x="90" y="95" fill="#FEF3C7" fontSize="9" fontWeight="bold" textAnchor="middle">Subsoil (B)</text>

        {/* Water Retention Depth Gauge */}
        <g transform="translate(160, 20)">
          {/* Total Height = 110px */}
          {/* Gravitational Water (Above FC) */}
          <rect x="0" y="0" width="45" height="25" fill="#BAE6FD" />
          <text x="55" y="16" fill="#0369A1" fontSize="9" fontWeight="bold">Gravitational (Drainage)</text>

          {/* Available Water Band (FC to WP) */}
          <rect x="0" y="25" width="45" height="55" fill="#2E9E4F" opacity="0.85" />
          <text x="55" y="45" fill="#14532D" fontSize="10" fontWeight="bold">Plant Available Water</text>
          <text x="55" y="60" fill="#166534" fontSize="9">TAW = θfc - θwp ({(tawFrac * 100).toFixed(1)}%)</text>

          {/* Unavailable Water Band (Below WP) */}
          <rect x="0" y="80" width="45" height="30" fill="#FCA5A5" opacity="0.85" />
          <text x="55" y="100" fill="#991B1B" fontSize="9" fontWeight="bold">Hygroscopic (Unavailable)</text>

          {/* FC Line */}
          <line x1="-10" y1="25" x2="45" y2="25" stroke="#15803D" strokeWidth="2.5" />
          <text x="-15" y="28" fill="#15803D" fontSize="9" fontWeight="bold" textAnchor="end">
            θfc: {currentFc.toFixed(2)}
          </text>

          {/* WP Line */}
          <line x1="-10" y1="80" x2="45" y2="80" stroke="#DC2626" strokeWidth="2.5" />
          <text x="-15" y="83" fill="#DC2626" fontSize="9" fontWeight="bold" textAnchor="end">
            θwp: {currentWp.toFixed(2)}
          </text>
        </g>
      </svg>

      <p className="text-xs text-slate-500 mt-1 text-center">
        Water between Field Capacity ({currentFc.toFixed(2)}) and Wilting Point ({currentWp.toFixed(2)}) is readily consumed by crop roots.
      </p>
    </div>
  );
};
