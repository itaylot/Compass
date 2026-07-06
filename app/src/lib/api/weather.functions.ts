import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// מזג אוויר מ-Open-Meteo דרך ה-Worker.
// למה Open-Meteo ולא yr.no: yr.no חוסם לעיתים קריאות מ-Cloudflare Workers
// (מה שהחזיר "תחזית בקרוב" תמיד). Open-Meteo חינמי, בלי מפתח, בלי דרישת
// User-Agent, אמין מ-Workers, ונותן עד 16 ימי תחזית (יותר מ-yr.no).
// cache ברמת ה-isolate מצמצם קריאות (ponytail: cache פר-אינסטנס).

interface WeatherResult {
  available: boolean;
  hi?: number;
  lo?: number;
  icon?: string;
  rain?: boolean;
}

const cache = new Map<string, { at: number; value: WeatherResult }>();
const TTL_MS = 60 * 60 * 1000; // שעה

// קודי מזג אוויר של WMO -> אימוג'י.
function wmoToIcon(code: number): { icon: string; rain: boolean } {
  if (code === 0) return { icon: "☀️", rain: false };
  if (code === 1) return { icon: "🌤️", rain: false };
  if (code === 2) return { icon: "⛅", rain: false };
  if (code === 3) return { icon: "☁️", rain: false };
  if (code === 45 || code === 48) return { icon: "🌫️", rain: false };
  if (code >= 51 && code <= 57) return { icon: "🌦️", rain: true }; // טפטוף
  if (code >= 61 && code <= 67) return { icon: "🌧️", rain: true }; // גשם
  if (code >= 71 && code <= 77) return { icon: "🌨️", rain: true }; // שלג
  if (code >= 80 && code <= 82) return { icon: "🌦️", rain: true }; // ממטרים
  if (code >= 85 && code <= 86) return { icon: "🌨️", rain: true }; // ממטרי שלג
  if (code >= 95) return { icon: "⛈️", rain: true }; // סופת רעמים
  return { icon: "🌡️", rain: false };
}

interface OpenMeteoDaily {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
  };
}

export const getWeather = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ data }): Promise<WeatherResult> => {
    const lat = Math.round(data.lat * 100) / 100;
    const lng = Math.round(data.lng * 100) / 100;
    const cacheKey = `${lat},${lng},${data.date}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

    let result: WeatherResult = { available: false };
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe%2FOslo` +
        `&start_date=${data.date}&end_date=${data.date}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as OpenMeteoDaily;
        const d = json.daily;
        if (d?.time?.length && typeof d.temperature_2m_max?.[0] === "number") {
          const { icon, rain } = wmoToIcon(d.weather_code?.[0] ?? -1);
          result = {
            available: true,
            hi: Math.round(d.temperature_2m_max[0]),
            lo: Math.round(d.temperature_2m_min?.[0] ?? d.temperature_2m_max[0]),
            icon,
            rain,
          };
        }
      }
    } catch {
      result = { available: false };
    }

    cache.set(cacheKey, { at: Date.now(), value: result });
    return result;
  });
