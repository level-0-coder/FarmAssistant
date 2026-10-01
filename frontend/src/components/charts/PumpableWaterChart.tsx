import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from 'recharts';
import { WaterCapacityPrediction, IrrigationWindow } from '../../types';
import { parseBackendTime, formatTime, formatTimeAxis } from './timeHelper';

interface Props {
  waterCapacityPrediction: WaterCapacityPrediction[];
  irrigationWindow?: IrrigationWindow;
}

export const PumpableWaterChart: React.FC<Props> = ({
  waterCapacityPrediction = [],
  irrigationWindow,
}) => {
  const winStart = irrigationWindow?.start_time ? parseBackendTime(irrigationWindow.start_time) : null;
  const winEnd = irrigationWindow?.end_time ? parseBackendTime(irrigationWindow.end_time) : null;
  const hasValidWindow = Boolean(winStart && winEnd && winStart > 0 && winEnd > winStart);

  const chartData = useMemo(() => {
    return waterCapacityPrediction.map(w => ({
      time: parseBackendTime(w.time, true),
      water_capacity_l: w.water_capacity_l || 0,
      available_power_kw: w.available_power_kw || 0,
    })).filter(d => d.time > 0);
  }, [waterCapacityPrediction]);

  // Sum total litres inside irrigation window
  const windowLitresSum = useMemo(() => {
    if (!hasValidWindow || !winStart || !winEnd) return 0;
    return chartData
      .filter(d => d.time >= winStart && d.time <= winEnd)
      .reduce((acc, curr) => acc + curr.water_capacity_l, 0);
  }, [chartData, hasValidWindow, winStart, winEnd]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col items-center justify-center min-h-[320px] text-slate-400">
        <p className="text-base font-semibold text-slate-600 mb-1">No Pump Delivery Forecast Available</p>
        <p className="text-sm">Water capacity prediction requires pump and solar panel ratings.</p>
      </div>
    );
  }

  // Helper to determine bar color based on available solar power kW
  const getBarColor = (powerKw: number) => {
    if (powerKw >= 4.0) return '#0284C7'; // Deep sky blue
    if (powerKw >= 2.5) return '#0EA5E9'; // Sky blue
    if (powerKw >= 1.0) return '#38BDF8'; // Light sky blue
    if (powerKw > 0) return '#BAE6FD';    // Pale blue
    return '#E2E8F0';                     // Idle (night)
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
        <div>
          <h3 className="text-lg font-bold font-heading text-forest">Pumpable Water Forecast (Hourly Histogram)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hourly estimate of water your solar pump can deliver based on forecasted solar electricity generation.
          </p>
        </div>

        {hasValidWindow && windowLitresSum > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-forest font-semibold">
              Window Total: <b className="text-emerald-700 font-bold">{windowLitresSum.toLocaleString()} Litres</b>
            </span>
          </div>
        )}
      </div>

      <div className="h-[320px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTimeAxis}
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
            />

            <YAxis
              stroke="#0369A1"
              fontSize={11}
              tickLine={false}
              unit=" L"
              label={{ value: 'Water (Litres/hour)', angle: -90, position: 'insideLeft', offset: 0, style: { fill: '#64748B', fontSize: 11 } }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs backdrop-blur-sm border border-slate-700">
                      <p className="font-semibold text-sun mb-1">{formatTime(data.time, true)}</p>
                      <p className="text-sky-300">
                        Pump Delivery: <span className="font-bold">{data.water_capacity_l.toLocaleString()} Litres</span>
                      </p>
                      <p className="text-amber-300">
                        Available Solar Power: <span className="font-bold">{data.available_power_kw} kW</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Irrigation Window Band */}
            {hasValidWindow && (
              <ReferenceArea
                x1={winStart!}
                x2={winEnd!}
                fill="rgba(46, 158, 79, 0.18)"
                strokeOpacity={0}
              />
            )}
            {hasValidWindow && (
              <ReferenceLine
                x={winStart!}
                stroke="#2E9E4F"
                strokeWidth={2}
                label={{
                  value: 'Best Window',
                  position: 'insideTopLeft',
                  fill: '#15803D',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}
            {hasValidWindow && (
              <ReferenceLine x={winEnd!} stroke="#2E9E4F" strokeWidth={2} />
            )}

            <Bar dataKey="water_capacity_l" name="Pumpable Litres" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.available_power_kw)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#0284C7]" /> High Power (&gt;4 kW)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#0EA5E9]" /> Moderate Power (2.5–4 kW)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#38BDF8]" /> Low Power (1–2.5 kW)
          </span>
        </div>
        {hasValidWindow && (
          <span className="font-medium text-forest">
            Sum over window: {windowLitresSum.toLocaleString()} L
          </span>
        )}
      </div>
    </div>
  );
};
