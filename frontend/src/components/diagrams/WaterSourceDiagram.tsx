import React from 'react';

interface Props {
  source: string;
}

export const WaterSourceDiagram: React.FC<Props> = ({ source }) => {
  const currentSource = source || 'Borewell';

  return (
    <div className="bg-gradient-to-b from-sky-50 to-emerald-50 rounded-2xl p-4 border border-emerald-100 flex flex-col items-center justify-center text-slate-700 min-h-[200px]">
      <div className="text-xs font-semibold uppercase tracking-wider text-forest/70 mb-2">
        Water Source Schematic: <span className="text-leaf-600 font-bold">{currentSource}</span>
      </div>
      
      <svg viewBox="0 0 400 200" className="w-full h-auto max-h-[180px] drop-shadow-sm select-none">
        <defs>
          <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.1" />
            <stop offset="30%" stopColor="#D97706" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#78350F" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#0284C7" />
          </marker>
        </defs>

        {/* Sky / Top surface */}
        <rect x="0" y="0" width="400" height="75" fill="#F0F9FF" opacity="0.6" />
        
        {/* Ground level line */}
        <line x1="0" y1="75" x2="400" y2="75" stroke="#15803D" strokeWidth="3" />
        
        {/* Ground sub-layer */}
        <rect x="0" y="75" width="400" height="125" fill="url(#groundGrad)" />

        {/* Water Table dotted line */}
        <line x1="0" y1="140" x2="400" y2="140" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x="310" y="135" fill="#0369A1" fontSize="10" fontWeight="600">Water Table</text>

        {/* DYNAMIC WATER SOURCE RENDERING */}
        {currentSource === 'Borewell' && (
          <g>
            {/* Deep casing pipe */}
            <rect x="75" y="60" width="24" height="120" fill="#94A3B8" rx="2" stroke="#475569" strokeWidth="1.5" />
            <rect x="78" y="110" width="18" height="66" fill="url(#waterGrad)" />
            {/* Submersible pump in well */}
            <rect x="79" y="130" width="16" height="36" fill="#1E293B" rx="3" />
            <text x="87" y="152" fill="#FFFFFF" fontSize="8" textAnchor="middle" fontWeight="bold">PUMP</text>
            <text x="87" y="192" fill="#475569" fontSize="10" textAnchor="middle" fontWeight="bold">Deep Borewell</text>
          </g>
        )}

        {currentSource === 'Open well' && (
          <g>
            {/* Wide well structure */}
            <rect x="50" y="55" width="70" height="105" fill="#CBD5E1" stroke="#475569" strokeWidth="2" />
            <rect x="54" y="90" width="62" height="68" fill="url(#waterGrad)" />
            {/* Pulley stand */}
            <path d="M 55 55 L 85 25 L 115 55" stroke="#475569" strokeWidth="3" fill="none" />
            <circle cx="85" cy="30" r="6" fill="#F59E0B" />
            <text x="85" y="180" fill="#475569" fontSize="10" textAnchor="middle" fontWeight="bold">Open Dug Well</text>
          </g>
        )}

        {(currentSource.includes('Pond') || currentSource.includes('Tank')) && (
          <g>
            {/* Pond basin */}
            <path d="M 20 75 Q 85 150 150 75 Z" fill="url(#waterGrad)" stroke="#0284C7" strokeWidth="2" />
            <text x="85" y="110" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="bold">
              {currentSource.includes('Pond') ? 'Farm Pond' : 'Reservoir Tank'}
            </text>
          </g>
        )}

        {(currentSource.includes('Canal') || currentSource.includes('River')) && (
          <g>
            {/* Flowing canal channel */}
            <polygon points="30,75 140,75 125,135 45,135" fill="url(#waterGrad)" stroke="#0284C7" strokeWidth="2" />
            <path d="M 50 100 Q 85 92 120 100" stroke="#E0F2FE" strokeWidth="2" fill="none" strokeDasharray="6 3" />
            <text x="85" y="120" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="bold">
              {currentSource.includes('Canal') ? 'Canal Flow' : 'River Flow'}
            </text>
          </g>
        )}

        {/* SURFACE PUMP / DISTRIBUTION UNIT */}
        <g transform="translate(190, 45)">
          <rect x="0" y="10" width="36" height="24" rx="4" fill="#047857" stroke="#065F46" strokeWidth="1.5" />
          <circle cx="18" cy="22" r="7" fill="#FBBF24" />
          <text x="18" y="2" fill="#065F46" fontSize="9" textAnchor="middle" fontWeight="bold">Surface Pump</text>
        </g>

        {/* SUCTION & DELIVERY PIPING WITH FLOW ARROWS */}
        {/* Suction pipe from source to pump */}
        <path d="M 90 130 L 90 60 L 190 60" fill="none" stroke="#0284C7" strokeWidth="3" markerEnd="url(#arrow)" />
        <text x="135" y="52" fill="#0369A1" fontSize="9" fontWeight="bold">Suction</text>

        {/* Delivery pipe from pump to crop field */}
        <path d="M 226 60 L 290 60 L 290 75 L 370 75" fill="none" stroke="#0284C7" strokeWidth="3" markerEnd="url(#arrow)" />
        <text x="250" y="52" fill="#0369A1" fontSize="9" fontWeight="bold">Delivery</text>

        {/* CROP FIELD ON RIGHT */}
        <g transform="translate(300, 48)">
          {/* Plants */}
          <path d="M 20 27 Q 15 10 20 0 Q 25 10 20 27" fill="#22C55E" />
          <path d="M 40 27 Q 35 8 40 0 Q 45 8 40 27" fill="#22C55E" />
          <path d="M 60 27 Q 55 12 60 0 Q 65 12 60 27" fill="#22C55E" />
          <line x1="10" y1="27" x2="70" y2="27" stroke="#16A34A" strokeWidth="2" />
          <text x="40" y="42" fill="#14532D" fontSize="10" textAnchor="middle" fontWeight="bold">Crop Field</text>
        </g>
      </svg>
      
      <p className="text-xs text-slate-500 mt-1 text-center">
        Water flows from {currentSource} through solar pump to the root zone.
      </p>
    </div>
  );
};
