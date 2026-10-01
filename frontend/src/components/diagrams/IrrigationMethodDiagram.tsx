import React from 'react';

interface Props {
  method?: string;
}

export const IrrigationMethodDiagram: React.FC<Props> = ({ method = 'Drip' }) => {
  const currentMethod = method || 'Drip';

  return (
    <div className="bg-gradient-to-b from-emerald-50/50 to-sky-50/50 rounded-2xl p-4 border border-emerald-200/60 flex flex-col items-center justify-center text-slate-700 min-h-[190px]">
      <div className="text-xs font-semibold uppercase tracking-wider text-forest/70 mb-2">
        Application Method: <span className="text-leaf-600 font-bold">{currentMethod}</span>
      </div>

      <svg viewBox="0 0 340 140" className="w-full max-h-[140px] drop-shadow-sm select-none">
        {/* Soil Base */}
        <rect x="20" y="80" width="300" height="50" fill="#92400E" rx="3" />
        <line x1="20" y1="80" x2="320" y2="80" stroke="#15803D" strokeWidth="2.5" />

        {/* Plants along the field */}
        {[70, 140, 210, 270].map((x) => (
          <g key={x} transform={`translate(${x}, 55)`}>
            <path d="M 0 25 Q -8 8 0 0 Q 8 8 0 25" fill="#22C55E" />
            <path d="M -5 18 Q -15 10 -8 0" stroke="#16A34A" strokeWidth="1.5" fill="none" />
            <path d="M 5 18 Q 15 10 8 0" stroke="#16A34A" strokeWidth="1.5" fill="none" />
          </g>
        ))}

        {/* METHOD SPECIFIC VISUALS */}
        {currentMethod === 'Drip' && (
          <g>
            {/* Drip lateral pipe */}
            <line x1="30" y1="76" x2="310" y2="76" stroke="#1E293B" strokeWidth="3" />
            {/* Emitters dripping into root zones */}
            {[70, 140, 210, 270].map((x) => (
              <g key={x}>
                <circle cx={x} cy="76" r="3" fill="#0284C7" />
                <circle cx={x} cy="86" r="2.5" fill="#38BDF8" />
                {/* Wetted bulb in soil */}
                <ellipse cx={x} cy="100" rx="16" ry="12" fill="#38BDF8" opacity="0.35" />
              </g>
            ))}
            <text x="170" y="30" fill="#0369A1" fontSize="10" fontWeight="bold" textAnchor="middle">
              Targeted Root-Zone Emitters (90%+ Efficiency)
            </text>
          </g>
        )}

        {currentMethod === 'Sprinkler' && (
          <g>
            {/* Sprinkler riser in middle */}
            <line x1="175" y1="80" x2="175" y2="35" stroke="#475569" strokeWidth="3" />
            <circle cx="175" cy="35" r="4" fill="#0284C7" />
            {/* Water spray arcs */}
            <path d="M 175 35 Q 110 15 65 75" fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="3 3" />
            <path d="M 175 35 Q 240 15 285 75" fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="3 3" />
            <text x="175" y="20" fill="#0284C7" fontSize="10" fontWeight="bold" textAnchor="middle">
              Overhead Droplet Distribution
            </text>
          </g>
        )}

        {(currentMethod.includes('Flood') || currentMethod.includes('surface')) && (
          <g>
            {/* Water sheet covering ground */}
            <rect x="20" y="73" width="300" height="7" fill="#38BDF8" opacity="0.75" />
            <text x="170" y="30" fill="#0369A1" fontSize="10" fontWeight="bold" textAnchor="middle">
              Basin / Border Surface Flooding
            </text>
          </g>
        )}

        {currentMethod === 'Furrow' && (
          <g>
            {/* Furrow channels */}
            {[50, 120, 190, 260].map((fx) => (
              <path key={fx} d={`M ${fx} 80 Q ${fx + 10} 95 ${fx + 20} 80`} fill="#0284C7" opacity="0.8" />
            ))}
            <text x="170" y="30" fill="#0369A1" fontSize="10" fontWeight="bold" textAnchor="middle">
              Graded Ridge & Furrow Channels
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
