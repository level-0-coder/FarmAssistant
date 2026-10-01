import React from 'react';

interface Props {
  hp: number;
  flowLpm?: number;
  headM?: number;
  focusedField?: 'hp' | 'flow' | 'head' | null;
}

export const PumpDiagram: React.FC<Props> = ({
  hp = 5,
  flowLpm = 450,
  headM = 30,
  focusedField = null,
}) => {
  const displayHp = hp > 0 ? hp : 5;
  const displayFlow = flowLpm !== undefined && flowLpm > 0 ? flowLpm : 450;
  const displayHead = headM !== undefined && headM > 0 ? headM : 30;

  return (
    <div className="bg-gradient-to-b from-sky-50/60 to-emerald-50/40 rounded-2xl p-4 border border-sky-200/70 flex flex-col items-center justify-center text-slate-700 min-h-[200px]">
      <div className="text-xs font-semibold uppercase tracking-wider text-forest/70 mb-2">
        Solar Pump Rating & Hydraulic Head
      </div>

      <svg viewBox="0 0 380 180" className="w-full max-h-[170px] drop-shadow-sm select-none">
        <defs>
          <marker id="pumpArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#0284C7" />
          </marker>
          <marker id="headArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={focusedField === 'head' ? '#D97706' : '#64748B'} />
          </marker>
        </defs>

        {/* Water Source Level */}
        <line x1="30" y1="150" x2="160" y2="150" stroke="#38BDF8" strokeWidth="3" />
        <text x="35" y="165" fill="#0284C7" fontSize="10" fontWeight="bold">Water Level</text>

        {/* Vertical Suction / Head Lift Dimension Line */}
        <line
          x1="50"
          y1="150"
          x2="50"
          y2="50"
          stroke={focusedField === 'head' ? '#D97706' : '#64748B'}
          strokeWidth={focusedField === 'head' ? '3' : '2'}
          strokeDasharray="4 3"
          markerEnd="url(#headArrow)"
          markerStart="url(#headArrow)"
        />
        
        {/* Head Annotation Badge */}
        <g transform="translate(60, 90)">
          <rect
            x="0"
            y="-14"
            width="72"
            height="26"
            rx="6"
            fill={focusedField === 'head' ? '#FEF3C7' : '#FFFFFF'}
            stroke={focusedField === 'head' ? '#F59E0B' : '#CBD5E1'}
            strokeWidth={focusedField === 'head' ? '2' : '1'}
          />
          <text
            x="36"
            y="3"
            fill={focusedField === 'head' ? '#B45309' : '#334155'}
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            Head: {displayHead} m
          </text>
        </g>

        {/* Central Pump Unit */}
        <g transform="translate(180, 50)">
          {/* Motor Body */}
          <rect
            x="0"
            y="15"
            width="65"
            height="40"
            rx="6"
            fill={focusedField === 'hp' ? '#DCFCE7' : '#1E293B'}
            stroke={focusedField === 'hp' ? '#15803D' : '#0F172A'}
            strokeWidth={focusedField === 'hp' ? '3' : '1'}
          />
          {/* Impeller Casing */}
          <circle
            cx="75"
            cy="35"
            r="24"
            fill={focusedField === 'flow' ? '#E0F2FE' : '#334155'}
            stroke={focusedField === 'flow' ? '#0284C7' : '#1E293B'}
            strokeWidth={focusedField === 'flow' ? '3' : '1.5'}
          />

          {/* HP Label Badge */}
          <rect
            x="8"
            y="23"
            width="48"
            height="22"
            rx="4"
            fill="#FBBF24"
          />
          <text
            x="32"
            y="38"
            fill="#14532D"
            fontSize="11"
            fontWeight="800"
            textAnchor="middle"
          >
            {displayHp} HP
          </text>
        </g>

        {/* Discharge pipe and flow arrow */}
        <path
          d="M 270 70 L 330 70"
          stroke={focusedField === 'flow' ? '#0284C7' : '#38BDF8'}
          strokeWidth={focusedField === 'flow' ? '5' : '3.5'}
          fill="none"
          markerEnd="url(#pumpArrow)"
        />

        {/* Flow Annotation Badge */}
        <g transform="translate(265, 25)">
          <rect
            x="0"
            y="0"
            width="100"
            height="26"
            rx="6"
            fill={focusedField === 'flow' ? '#E0F2FE' : '#FFFFFF'}
            stroke={focusedField === 'flow' ? '#0284C7' : '#CBD5E1'}
            strokeWidth={focusedField === 'flow' ? '2' : '1'}
          />
          <text
            x="50"
            y="17"
            fill={focusedField === 'flow' ? '#0369A1' : '#334155'}
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            Flow: {displayFlow} L/min
          </text>
        </g>
      </svg>

      <div className="flex gap-4 text-xs mt-1 text-slate-500">
        <span className={focusedField === 'hp' ? 'text-forest font-bold underline' : ''}>
          Power: <b>{displayHp} HP</b>
        </span>
        <span className={focusedField === 'flow' ? 'text-sky-600 font-bold underline' : ''}>
          Delivery: <b>{displayFlow} L/min</b>
        </span>
        <span className={focusedField === 'head' ? 'text-amber-600 font-bold underline' : ''}>
          Head: <b>{displayHead} m</b>
        </span>
      </div>
    </div>
  );
};
