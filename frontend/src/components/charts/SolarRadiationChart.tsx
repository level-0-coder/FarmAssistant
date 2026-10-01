import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { ForecastRecord, IrrigationWindow } from '../../types';
import { parseBackendTime, formatTime, formatTimeAxis } from './timeHelper';

interface Props {
  forecastData: ForecastRecord[];
  irrigationWindow?: IrrigationWindow;
}

export const SolarRadiationChart: React.FC<Props> = ({
  forecastData = [],
  irrigationWindow,
}) => {
  const [showRain, setShowRain] = useState(false);

  const winStart = irrigationWindow?.start_time ? parseBackendTime(irrigationWindow.start_time) : null;
  const winEnd = irrigationWindow?.end_time ? parseBackendTime(irrigationWindow.end_time) : null;
  const hasValidWindow = Boolean(winStart && winEnd && winStart > 0 && winEnd > winStart);

  // Map forecast data to epoch ms using local farm time helper
  const chartData = useMemo(() => {
    return forecastData.map(f => ({
      time: parseBackendTime(f.time, true),
      solar_radiation: f.solar_radiation,
      rain_mm: f.rain_mm || 0,
      rain_probability: f.rain_probability || 0,
    })).filter(d => d.time > 0);
  }, [forecastData]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col items-center justify-center min-h-[300px] text-slate-400">
        <p className="text-base font-semibold text-slate-600 mb-1">No Solar Radiation Data</p>
        <p className="text-sm">Solar radiation forecast requires farm geographical coordinates.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold font-heading text-forest">Solar Radiation Forecast</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Available irradiance (W/m²) determines the electricity your solar panels produce.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={showRain}
              onChange={(e) => setShowRain(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
            />
            <span>Show rain</span>
          </label>
        </div>

        <div className="h-[280px] w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: showRain ? 30 : 10, left: 0, bottom: 15 }}>
              <defs>
                <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FBBF24" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatTimeAxis}
                stroke="#94A3B8"
                fontSize={10}
                tickLine={false}
              />

              <YAxis
                yAxisId="solar"
                stroke="#D97706"
                fontSize={10}
                tickLine={false}
                unit=" W/m²"
              />

              {showRain && (
                <YAxis
                  yAxisId="rain"
                  orientation="right"
                  stroke="#0284C7"
                  fontSize={10}
                  tickLine={false}
                  unit=" mm"
                />
              )}

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 text-white p-2.5 rounded-xl shadow-xl text-xs backdrop-blur-sm border border-slate-700">
                        <p className="font-semibold text-sun mb-1">{formatTime(data.time, true)}</p>
                        <p className="text-amber-300">
                          Solar Radiation: <span className="font-bold">{data.solar_radiation} W/m²</span>
                        </p>
                        {showRain && (
                          <p className="text-sky-300">
                            Rain: <span className="font-bold">{data.rain_mm} mm</span> ({data.rain_probability}% prob)
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Irrigation Window Band */}
              {hasValidWindow && (
                <ReferenceArea
                  yAxisId="solar"
                  x1={winStart!}
                  x2={winEnd!}
                  fill="rgba(46, 158, 79, 0.18)"
                  strokeOpacity={0}
                />
              )}
              {hasValidWindow && (
                <ReferenceLine yAxisId="solar" x={winStart!} stroke="#2E9E4F" strokeWidth={1.5} />
              )}
              {hasValidWindow && (
                <ReferenceLine yAxisId="solar" x={winEnd!} stroke="#2E9E4F" strokeWidth={1.5} />
              )}

              <Area
                yAxisId="solar"
                type="monotone"
                dataKey="solar_radiation"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#sunGrad)"
                name="Solar Radiation"
              />

              {showRain && (
                <Bar
                  yAxisId="rain"
                  dataKey="rain_mm"
                  fill="#38BDF8"
                  opacity={0.8}
                  name="Rain (mm)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-sun" /> Solar Radiation (W/m²)
        </span>
        {hasValidWindow && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-200" /> Optimal Pumping Window
          </span>
        )}
        {showRain && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-400" /> Rain (mm)
          </span>
        )}
      </div>
    </div>
  );
};
