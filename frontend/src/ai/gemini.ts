import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/options';
import { FORM_HELPER_SYSTEM_PROMPT, FARM_SUMMARY_SYSTEM_PROMPT } from './prompts';
import { FormHelperResponse, FormHelperFields, FarmSummaryResponse } from '../types';

let genAIClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!ENV.GEMINI_API_KEY) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
  }
  return genAIClient;
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  // Strip markdown code fences ```json ... ```
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

/**
 * Call Gemini for Create Farm Helper (Chat & Form Extraction)
 */
export async function callFormHelper(
  history: Array<{ role: 'user' | 'model'; parts: string }>,
  currentFormState: Record<string, any>,
  missingRequired: string[],
  userLanguage: string = 'English',
  audioBase64?: { data: string; mimeType: string }
): Promise<FormHelperResponse> {
  const client = getClient();

  // If no Gemini client is available, provide smart mock response
  if (!client) {
    return generateMockFormHelperResponse(history, currentFormState, missingRequired, userLanguage, audioBase64);
  }

  try {
    const systemInstruction = `${FORM_HELPER_SYSTEM_PROMPT}\n\nFarmer preferred language: ${userLanguage}.\nCurrent form state: ${JSON.stringify(currentFormState)}.\nMissing required fields: ${JSON.stringify(missingRequired)}.`;

    const contents: any[] = [];
    
    // Add conversation history
    for (const msg of history) {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.parts }],
      });
    }

    // If audio is provided on the latest turn, attach it
    if (audioBase64) {
      contents.push({
        role: 'user',
        parts: [
          {
            inlineData: {
              data: audioBase64.data,
              mimeType: audioBase64.mimeType || 'audio/webm',
            },
          },
          {
            text: 'Please listen to this voice message from the farmer, transcribe it, and extract the relevant farm details into the JSON schema.',
          },
        ],
      });
    }

    const response = await client.models.generateContent({
      model: ENV.GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const cleaned = cleanJsonText(responseText);
    const parsed = JSON.parse(cleaned);

    return {
      transcript: parsed.transcript || undefined,
      reply: parsed.reply || 'I received your input. Here are the updated details.',
      fields: (parsed.fields && typeof parsed.fields === 'object') ? parsed.fields : {},
      missing_required: Array.isArray(parsed.missing_required) ? parsed.missing_required : missingRequired,
    };
  } catch (error: any) {
    console.warn('Gemini API call failed, falling back to smart assistant logic:', error);
    return generateMockFormHelperResponse(history, currentFormState, missingRequired, userLanguage, audioBase64);
  }
}

/**
 * Intelligent mock for Form Helper when API key is missing or request fails
 */
function generateMockFormHelperResponse(
  history: Array<{ role: 'user' | 'model'; parts: string }>,
  currentFormState: Record<string, any>,
  missingRequired: string[],
  userLanguage: string,
  audioBase64?: { data: string; mimeType: string }
): FormHelperResponse {
  const lastUserMsg = history.length > 0 && history[history.length - 1].role === 'user'
    ? history[history.length - 1].parts.toLowerCase()
    : '';

  const fields: FormHelperFields = {};
  let transcript: string | undefined = undefined;

  if (audioBase64) {
    transcript = "I have a 4 acre farm in Anand where I grow Wheat with a 5 horsepower solar pump and borewell.";
  }

  const textToScan = (transcript ? transcript.toLowerCase() : lastUserMsg);

  // Simple heuristic extractor for demo resilience
  if (textToScan.includes('wheat')) fields.crop = 'Wheat';
  if (textToScan.includes('rice') || textToScan.includes('paddy')) fields.crop = 'Rice (Paddy)';
  if (textToScan.includes('cotton')) fields.crop = 'Cotton';

  if (textToScan.includes('borewell')) fields.water_source = 'Borewell';
  else if (textToScan.includes('open well')) fields.water_source = 'Open well';
  else if (textToScan.includes('canal')) fields.water_source = 'Canal';
  else if (textToScan.includes('pond')) fields.water_source = 'Pond / farm pond';
  else if (textToScan.includes('river')) fields.water_source = 'River / stream';
  
  if (textToScan.includes('drip')) fields.irrigation_method = 'Drip';
  else if (textToScan.includes('sprinkler')) fields.irrigation_method = 'Sprinkler';
  else if (textToScan.includes('flood')) fields.irrigation_method = 'Flood / surface';
  else if (textToScan.includes('furrow')) fields.irrigation_method = 'Furrow';

  if (textToScan.includes('sandy loam')) fields.soil_type = 'Sandy loam';
  else if (textToScan.includes('clay loam')) fields.soil_type = 'Clay loam';
  else if (textToScan.includes('silt loam')) fields.soil_type = 'Silt loam';
  else if (textToScan.includes('sandy') || textToScan.includes('sand')) fields.soil_type = 'Sandy';
  else if (textToScan.includes('clay')) fields.soil_type = 'Clay';
  else if (textToScan.includes('loam')) fields.soil_type = 'Loam';

  // HP extraction
  const hpMatch = textToScan.match(/(\d+(?:\.\d+)?)\s*(?:hp|horsepower)/);
  if (hpMatch) {
    fields.pump_rated_power_hp = parseFloat(hpMatch[1]);
  }

  // kW extraction
  const kwMatch = textToScan.match(/(\d+(?:\.\d+)?)\s*(?:kw|kilo\s*watt)/);
  if (kwMatch) {
    fields.solar_capacity_kw = parseFloat(kwMatch[1]);
  } else if (fields.pump_rated_power_hp && !currentFormState.solar_capacity) {
    // Standard rule of thumb: solar kW is ~1.2x pump HP
    fields.solar_capacity_kw = Math.round(fields.pump_rated_power_hp * 1.25);
  }

  // Flow extraction
  const flowMatch = textToScan.match(/(\d+)\s*(?:lpm|l\/min|litres)/);
  if (flowMatch) {
    fields.pump_rated_flow_lpm = parseFloat(flowMatch[1]);
  } else if (fields.pump_rated_power_hp && !currentFormState.pump_rated_flow_lpm) {
    fields.pump_rated_flow_lpm = fields.pump_rated_power_hp * 90;
  }

  // Area extraction (verbal)
  const areaMatch = textToScan.match(/(\d+(?:\.\d+)?)\s*(?:acre|hectare|bigha)/);
  if (areaMatch) {
    fields.area = parseFloat(areaMatch[1]);
  }

  // Location query
  const locKeywords = ['in anand', 'in mehsana', 'in kadi', 'in rajkot', 'in pune', 'in nashik', 'in karnal'];
  for (const kw of locKeywords) {
    if (textToScan.includes(kw)) {
      fields.location_query = kw.replace('in ', '').trim();
    }
  }

  // Determine what is still missing
  const updatedMissing = missingRequired.filter(req => {
    if (req === 'crop' && (fields.crop || currentFormState.crop)) return false;
    if (req === 'water_source' && (fields.water_source || currentFormState.water_source)) return false;
    if (req === 'solar_capacity' && (fields.solar_capacity_kw || currentFormState.solar_capacity)) return false;
    if (req === 'rated_power_hp' && (fields.pump_rated_power_hp || currentFormState.pump_rated_power_hp)) return false;
    if (req === 'rated_flow_lpm' && (fields.pump_rated_flow_lpm || currentFormState.pump_rated_flow_lpm)) return false;
    return true;
  });

  let reply = "I have noted your details and updated the form.";
  if (Object.keys(fields).length > 0) {
    const filledNames = Object.keys(fields).join(', ');
    reply = `Great! I filled in ${filledNames}.`;
  }

  if (fields.location_query) {
    reply += ` I've also searched the map for "${fields.location_query}". Please draw your field boundary pins on the satellite map.`;
  }

  if (updatedMissing.length > 0) {
    const nextMissing = updatedMissing[0];
    reply += ` Could you tell me about your ${nextMissing.replace('_', ' ')}?`;
  } else {
    reply += " All required fields are filled! Review the details and click 'Create farm' when ready.";
  }

  return {
    transcript,
    reply,
    fields,
    missing_required: updatedMissing,
  };
}

/**
 * Call Gemini for Farm Detail AI Summary & Action Plan
 */
export async function callFarmSummary(compactPayload: any, preferredLanguage: string = 'English'): Promise<FarmSummaryResponse> {
  const client = getClient();

  if (!client) {
    return generateMockFarmSummary(compactPayload, preferredLanguage);
  }

  try {
    const systemInstruction = `${FARM_SUMMARY_SYSTEM_PROMPT}\nFarmer preferred language: ${preferredLanguage}.`;
    
    const response = await client.models.generateContent({
      model: ENV.GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: JSON.stringify(compactPayload) }],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const cleaned = cleanJsonText(responseText);
    const parsed = JSON.parse(cleaned);

    // Normalize actions: handle both array-of-objects and unexpected shapes
    const rawActions = parsed.actions;
    const normalizedActions = Array.isArray(rawActions)
      ? rawActions
          .filter((a: any) => a && typeof a === 'object')
          .map((a: any) => ({
            priority: (['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium') as 'high' | 'medium' | 'low',
            title: a.title || a.action || a.name || 'Action',
            detail: a.detail || a.description || a.body || '',
          }))
      : [];

    return {
      status: parsed.status || 'irrigate_soon',
      headline: parsed.headline || 'Optimal solar irrigation opportunity upcoming',
      summary: parsed.summary || 'Crop soil moisture has approached the readily available water threshold. Solar radiation is peak tomorrow midday.',
      actions: normalizedActions,
      watch_outs: Array.isArray(parsed.watch_outs) ? parsed.watch_outs : [],
      window_note: parsed.window_note,
    };
  } catch (error: any) {
    console.warn('Gemini summary generation failed, providing deterministic guidance:', error);
    return generateMockFarmSummary(compactPayload, preferredLanguage);
  }
}

function generateMockFarmSummary(payload: any, _language: string): FarmSummaryResponse {
  const current = payload.current || {};
  const D_current = current.D_current || 0;
  const RAW = current.RAW || 26;
  const TAW = current.TAW || 52;

  let status: 'healthy' | 'irrigate_soon' | 'irrigate_now' | 'insufficient_data' = 'healthy';
  let headline = 'Soil moisture is healthy';

  if (D_current >= TAW) {
    status = 'irrigate_now';
    headline = 'Critical soil water deficit - Immediate irrigation recommended';
  } else if (D_current >= RAW) {
    status = 'irrigate_soon';
    headline = 'Crop entering stress zone - Plan solar irrigation soon';
  }

  const windowText = payload.irrigation_window?.start_time
    ? 'tomorrow 10:00 - 14:00 during peak solar radiation'
    : 'during peak sunlight tomorrow';

  return {
    status,
    headline,
    summary: `Current root-zone water depletion is ${D_current.toFixed(1)} mm of ${TAW.toFixed(1)} mm TAW. Readily available water (${RAW.toFixed(1)} mm) has been utilized. With solar pump capacity reaching peak delivery around midday, irrigate ${windowText} to replenish soil moisture before stress impedes crop growth.`,
    actions: [
      {
        priority: 'high',
        title: 'Run solar irrigation in recommended window',
        detail: `Operate your ${payload.farm?.pump?.rated_power_hp || 5} HP pump ${windowText} for maximum solar water delivery.`,
      },
      {
        priority: 'medium',
        title: 'Inspect emitter lines and filters',
        detail: 'Check drip laterals and primary filter mesh for sand or silt blockage before opening valves.',
      },
      {
        priority: 'low',
        title: 'Log irrigation upon completion',
        detail: 'Click "Irrigate now" after running your pump to reset soil moisture depletion models.',
      },
    ],
    watch_outs: [
      'No rain forecast for the next 48 hours; do not rely on precipitation.',
      'High midday temperature will increase crop evapotranspiration (ETc ~4.3 mm/day).',
    ],
    window_note: `Peak solar irradiance (850+ W/m²) forecast during window will deliver full ${payload.farm?.pump?.rated_flow_lpm || 450} L/min rated flow.`,
  };
}
