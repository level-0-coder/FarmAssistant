import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import { ActualRecord, DepletionPrediction, IrrigationWindow } from '../../types';
import { parseBackendTime, formatTime, formatTimeAxis } from './timeHelper';

interface Props {
  actualRecords: ActualRecord[];
  depletionPrediction: DepletionPrediction;
  irrigationWindow?: IrrigationWindow;
  TAW: number;
  RAW: number;
  lastIrrigation?: string | null;
}

export const DepletionChart: React.FC<Props> = ({
  actualRecords = [],
  depletionPrediction,
  irrigationWindow,
  TAW = 50,
  RAW = 25,
  lastIrrigation,
}) => {
  const [showActuals, setShowActuals] = useState(true);
  const [showPoly, setShowPoly] = useState(true);
  const [showLinear, setShowLinear] = useState(true);

  const yMax = Math.round(TAW * 1.15);

  // Parse irrigation window start and end to epoch ms
  const winStart = irrigationWindow?.start_time ? parseBackendTime(irrigationWindow.start_time) : null;
  const winEnd = irrigationWindow?.end_time ? parseBackendTime(irrigationWindow.end_time) : null;
  const hasValidWindow = Boolean(winStart && winEnd && winStart > 0 && winEnd > winStart);

  const lastIrrigMs = lastIrrigation ? parseBackendTime(lastIrrigation) : null;

  // Build unified dataset on shared timeline
  const chartData = useMemo(() => {
    const pointMap = new Map<number, {
      time: number;
      actualDepletion?: number;
      polyDepletion?: number;
      linearDepletion?: number;
    }>();

    // Add actual records
    actualRecords.forEach(rec => {
      const t = parseBackendTime(rec.timestamp);
      if (t > 0) {
        pointMap.set(t, {
          time: t,
          actualDepletion: Math.min(yMax, Math.max(0, rec.D_current)),
        });
      }
    });

    // Add polynomial predictions
    depletionPrediction?.polynomial?.forEach(p => {
      const t = parseBackendTime(p.timestamp);
      if (t > 0) {
        const existing = pointMap.get(t) || { time: t };
        existing.polyDepletion = Math.min(yMax, Math.max(0, p.D_current));
        pointMap.set(t, existing);
      }
    });

    // Add linear predictions
    depletionPrediction?.linear?.forEach(p => {
      const t = parseBackendTime(p.timestamp);
      if (t > 0) {
        const existing = pointMap.get(t) || { time: t };
        existing.linearDepletion = Math.min(yMax, Math.max(0, p.D_current));
        pointMap.set(t, existing);
      }
    });

    return Array.from(pointMap.values()).sort((a, b) => a.time - b.time);
  }, [actualRecords, depletionPrediction, yMax]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col items-center justify-center min-h-[360px] text-slate-400">
        <p className="text-base font-semibold text-slate-600 mb-1">No Depletion Data Available</p>
        <p className="text-sm">Telemetry readings are required to plot the soil moisture depletion curve.</p>
      </div>
    );
  }

  // Find latest actual record timestamp
  const latestActualMs = actualRecords.length > 0
    ? parseBackendTime(actualRecords[actualRecords.length - 1].timestamp)
    : null;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-lg font-bold font-heading text-forest">Soil Water Depletion</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Shows how much root-zone water has depleted. When depletion crosses RAW into the red band, the crop needs water.
          </p>
        </div>

        {/* Legend with interactive toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs select-none">
          <button
            onClick={() => setShowActuals(!showActuals)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              showActuals ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            Actual Records
          </button>

          <button
            onClick={() => setShowPoly(!showPoly)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              showPoly ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <span className="w-3 h-0.5 bg-blue-600" />
            Poly Prediction
          </button>

          <button
            onClick={() => setShowLinear(!showLinear)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
              showLinear ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <span className="w-3 h-0.5 bg-amber-500 border-b border-dashed border-amber-600" />
            Linear Prediction
          </button>
        </div>
      </div>

      <div className="h-[380px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
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
              domain={[0, yMax]}
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              unit=" mm"
              label={{ value: 'Depletion (mm)', angle: -90, position: 'insideLeft', offset: 0, style: { fill: '#64748B', fontSize: 11 } }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs backdrop-blur-sm border border-slate-700">
                      <p className="font-semibold text-sun mb-1">{formatTime(data.time, true)}</p>
                      {data.actualDepletion !== undefined && (
                        <p className="text-emerald-300">
                          Actual Depletion: <span className="font-bold">{data.actualDepletion.toFixed(1)} mm</span>
                        </p>
                      )}
                      {data.polyDepletion !== undefined && (
                        <p className="text-sky-300">
                          Poly Prediction: <span className="font-bold">{data.polyDepletion.toFixed(1)} mm</span>
                        </p>
                      )}
                      {data.linearDepletion !== undefined && (
                        <p className="text-amber-300">
                          Linear Prediction: <span className="font-bold">{data.linearDepletion.toFixed(1)} mm</span>
                        </p>
                      )}
                      <div className="mt-1 pt-1 border-t border-slate-700/60 text-[10px] text-slate-400">
                        RAW: {RAW} mm | TAW: {TAW} mm
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* TRANSLUCENT RED STRESS BAND between RAW and TAW */}
            <ReferenceArea
              y1={RAW}
              y2={TAW}
              fill="rgba(239, 68, 68, 0.15)"
              strokeOpacity={0}
            />

            {/* RAW REFERENCE LINE */}
            <ReferenceLine
              y={RAW}
              stroke="#F59E0B"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `RAW: ${RAW} mm (Stress Threshold)`,
                position: 'insideBottomRight',
                fill: '#D97706',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* TAW REFERENCE LINE */}
            <ReferenceLine
              y={TAW}
              stroke="#EF4444"
              strokeWidth={2}
              label={{
                value: `TAW: ${TAW} mm (Wilting Risk)`,
                position: 'insideTopRight',
                fill: '#DC2626',
                fontSize: 10,
                fontWeight: 700,
              }}
            />

            {/* OPTIMAL IRRIGATION WINDOW GREEN BAND */}
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
                  value: 'Irrigation Window',
                  position: 'insideTopLeft',
                  fill: '#15803D',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}
            {hasValidWindow && (
              <ReferenceLine
                x={winEnd!}
                stroke="#2E9E4F"
                strokeWidth={2}
              />
            )}

            {/* Latest Record / Now Marker */}
            {latestActualMs && (
              <ReferenceLine
                x={latestActualMs}
                stroke="#94A3B8"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: 'Latest', position: 'insideBottomLeft', fill: '#64748B', fontSize: 9 }}
              />
            )}

            {/* Last Irrigation Marker */}
            {lastIrrigMs && (
              <ReferenceLine
                x={lastIrrigMs}
                stroke="#0EA5E9"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: 'Last Irrigated', position: 'insideTopLeft', fill: '#0284C7', fontSize: 9 }}
              />
            )}

            {/* Polynomial Prediction Curve */}
            {showPoly && (
              <Line
                type="monotone"
                dataKey="polyDepletion"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
                name="Polynomial Prediction"
              />
            )}

            {/* Linear Prediction Line */}
            {showLinear && (
              <Line
                type="linear"
                dataKey="linearDepletion"
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Linear Prediction"
              />
            )}

            {/* Actual Records Scatter Dots */}
            {showActuals && (
              <Scatter
                dataKey="actualDepletion"
                fill="#15803D"
                line={false}
                shape="circle"
                isAnimationActive={false}
                name="Actual Depletion"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-100 border border-red-300" />
            Red zone = Crop moisture stress (Depletion between RAW and TAW)
          </span>
          {hasValidWindow && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
              Green band = Optimal solar pumping window
            </span>
          )}
        </div>
        <span>Y-axis clipped to 1.15× TAW ({yMax} mm)</span>
      </div>
    </div>
  );
};
