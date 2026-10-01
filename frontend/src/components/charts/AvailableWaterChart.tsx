import React, { useMemo } from 'react';
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
}

export const AvailableWaterChart: React.FC<Props> = ({
  actualRecords = [],
  depletionPrediction,
  irrigationWindow,
  TAW = 50,
  RAW = 25,
}) => {
  const stressAWThreshold = Math.max(0, TAW - RAW); // Readily available water exhausted

  const winStart = irrigationWindow?.start_time ? parseBackendTime(irrigationWindow.start_time) : null;
  const winEnd = irrigationWindow?.end_time ? parseBackendTime(irrigationWindow.end_time) : null;
  const hasValidWindow = Boolean(winStart && winEnd && winStart > 0 && winEnd > winStart);

  // Compute AW = TAW - D_current for each point
  const chartData = useMemo(() => {
    const pointMap = new Map<number, {
      time: number;
      actualAW?: number;
      polyAW?: number;
      linearAW?: number;
    }>();

    actualRecords.forEach(rec => {
      const t = parseBackendTime(rec.timestamp);
      if (t > 0) {
        pointMap.set(t, {
          time: t,
          actualAW: Math.max(0, parseFloat((TAW - rec.D_current).toFixed(1))),
        });
      }
    });

    depletionPrediction?.polynomial?.forEach(p => {
      const t = parseBackendTime(p.timestamp);
      if (t > 0) {
        const existing = pointMap.get(t) || { time: t };
        existing.polyAW = Math.max(0, parseFloat((TAW - p.D_current).toFixed(1)));
        pointMap.set(t, existing);
      }
    });

    depletionPrediction?.linear?.forEach(p => {
      const t = parseBackendTime(p.timestamp);
      if (t > 0) {
        const existing = pointMap.get(t) || { time: t };
        existing.linearAW = Math.max(0, parseFloat((TAW - p.D_current).toFixed(1)));
        pointMap.set(t, existing);
      }
    });

    return Array.from(pointMap.values()).sort((a, b) => a.time - b.time);
  }, [actualRecords, depletionPrediction, TAW]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col items-center justify-center min-h-[300px] text-slate-400">
        <p className="text-base font-semibold text-slate-600 mb-1">No Available Water Data</p>
        <p className="text-sm">Available water will display once sensor readings are recorded.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col justify-between">
      <div>
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold font-heading text-forest">Available Soil Water (AW)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Derived as TAW − Depletion. Higher values indicate abundant soil moisture.
          </p>
        </div>

        <div className="h-[280px] w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 15 }}>
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
                domain={[0, Math.round(TAW * 1.05)]}
                stroke="#94A3B8"
                fontSize={10}
                tickLine={false}
                unit=" mm"
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 text-white p-2.5 rounded-xl shadow-xl text-xs backdrop-blur-sm border border-slate-700">
                        <p className="font-semibold text-sun mb-1">{formatTime(data.time, true)}</p>
                        {data.actualAW !== undefined && (
                          <p className="text-emerald-300">
                            Available Water: <span className="font-bold">{data.actualAW} mm</span>
                          </p>
                        )}
                        {data.polyAW !== undefined && (
                          <p className="text-sky-300">
                            Predicted AW: <span className="font-bold">{data.polyAW} mm</span>
                          </p>
                        )}
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          Stress threshold: {stressAWThreshold.toFixed(1)} mm
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* TRANSLUCENT RED CRITICAL ZONE (0 to TAW - RAW) */}
              <ReferenceArea
                y1={0}
                y2={stressAWThreshold}
                fill="rgba(239, 68, 68, 0.15)"
                strokeOpacity={0}
              />

              {/* AW = TAW - RAW reference line */}
              <ReferenceLine
                y={stressAWThreshold}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Stress Threshold: ${stressAWThreshold.toFixed(1)} mm`,
                  position: 'insideTopRight',
                  fill: '#D97706',
                  fontSize: 9,
                  fontWeight: 600,
                }}
              />

              {/* AW = 0 (Total wilting) */}
              <ReferenceLine
                y={0}
                stroke="#EF4444"
                strokeWidth={2}
                label={{
                  value: '0 mm (TAW Exhausted)',
                  position: 'insideBottomRight',
                  fill: '#DC2626',
                  fontSize: 9,
                  fontWeight: 700,
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
                <ReferenceLine x={winStart!} stroke="#2E9E4F" strokeWidth={1.5} />
              )}
              {hasValidWindow && (
                <ReferenceLine x={winEnd!} stroke="#2E9E4F" strokeWidth={1.5} />
              )}

              {/* Lines and points */}
              <Line
                type="monotone"
                dataKey="polyAW"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Predicted AW"
              />
              <Scatter
                dataKey="actualAW"
                fill="#15803D"
                line={false}
                shape="circle"
                isAnimationActive={false}
                name="Actual AW"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-emerald-600" /> Actual AW
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-600" /> Poly Predicted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-red-200" /> Stress Zone (&lt; {stressAWThreshold.toFixed(1)} mm)
        </span>
      </div>
    </div>
  );
};
