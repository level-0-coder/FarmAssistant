import { FORECAST_UTC_OFFSET } from '../../config/options';

/**
 * Parses timestamps according to the backend contract rules:
 * - actual_records, predictions, current, and last_irrigation are UTC (treat naive ISO as UTC).
 * - forecast_data and water_capacity_prediction are LOCAL farm time without offset (Open-Meteo),
 *   so interpret them with FORECAST_UTC_OFFSET (+05:30 for India).
 * - Returns epoch milliseconds on a shared timeline.
 */
export function parseBackendTime(timeStr: string | null | undefined, isForecastOrLocal: boolean = false): number {
  if (!timeStr) return 0;

  try {
    let clean = timeStr.trim();

    if (isForecastOrLocal) {
      // Local farm time without timezone, e.g. "2026-10-01T14:00" or "2026-10-01T14:00:00"
      if (!clean.includes('+') && !clean.endsWith('Z')) {
        // Ensure seconds are present
        const parts = clean.split('T');
        if (parts.length === 2) {
          const timeParts = parts[1].split(':');
          if (timeParts.length === 2) {
            clean = `${parts[0]}T${parts[1]}:00`;
          }
        }
        clean = `${clean}${FORECAST_UTC_OFFSET}`;
      }
      return new Date(clean).getTime();
    } else {
      // UTC time (actual_records, predictions, current, last_irrigation)
      if (!clean.endsWith('Z') && !clean.includes('+') && !clean.includes('-', 10)) {
        clean = `${clean}Z`;
      }
      return new Date(clean).getTime();
    }
  } catch (e) {
    console.error('Failed to parse backend timestamp:', timeStr, e);
    return 0;
  }
}

/**
 * Format epoch milliseconds to farmer's localized display string
 */
export function formatTime(epochMs: number, includeDate: boolean = false): string {
  if (!epochMs || isNaN(epochMs)) return '--:--';
  const d = new Date(epochMs);
  
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const timePart = `${hours}:${minutes}`;

  if (!includeDate) return timePart;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  return `${day} ${month}, ${timePart}`;
}

export function formatTimeAxis(epochMs: number): string {
  if (!epochMs || isNaN(epochMs)) return '';
  const d = new Date(epochMs);
  const hours = d.getHours().toString().padStart(2, '0');
  const day = d.getDate();
  return `${day}d ${hours}:00`;
}
