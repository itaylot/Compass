// מזג אוויר מ-Open-Meteo, נקרא ישירות מהדפדפן (CORS פתוח, בלי מפתח, בלי
// User-Agent). פשוט ואמין יותר מקריאה דרך ה-Worker — ולכן אין כאן פונקציית שרת.
// react-query (ב-WeatherBadge) מטפל ב-cache פר (מיקום, תאריך).

export interface WeatherResult {
  available: boolean;
  hi?: number;
  lo?: number;
  icon?: string;
  rain?: boolean;
}

// טווח התחזית של Open-Meteo (forecast_days מקסימלי). משמש גם את ה-UI
// להסבר "התחזית תופיע עד N ימים מראש".
export const FORECAST_HORIZON_DAYS = 16;

// קודי מזג אוויר של WMO -> אימוג'י.
function wmoToIcon(code: number): { icon: string; rain: boolean } {
  if (code === 0) return { icon: "☀️", rain: false };
  if (code === 1) return { icon: "🌤️", rain: false };
  if (code === 2) return { icon: "⛅", rain: false };
  if (code === 3) return { icon: "☁️", rain: false };
  if (code === 45 || code === 48) return { icon: "🌫️", rain: false };
  if (code >= 51 && code <= 57) return { icon: "🌦️", rain: true };
  if (code >= 61 && code <= 67) return { icon: "🌧️", rain: true };
  if (code >= 71 && code <= 77) return { icon: "🌨️", rain: true };
  if (code >= 80 && code <= 82) return { icon: "🌦️", rain: true };
  if (code >= 85 && code <= 86) return { icon: "🌨️", rain: true };
  if (code >= 95) return { icon: "⛈️", rain: true };
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

export async function fetchWeather(lat: number, lng: number, date: string): Promise<WeatherResult> {
  const rlat = Math.round(lat * 100) / 100;
  const rlng = Math.round(lng * 100) / 100;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${rlat}&longitude=${rlng}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe%2FOslo` +
    `&start_date=${date}&end_date=${date}`;
  const res = await fetch(url);
  if (!res.ok) return { available: false }; // 400 = מחוץ לטווח (מטופל בצד ה-UI לפי התאריך)
  const json = (await res.json()) as OpenMeteoDaily;
  const d = json.daily;
  if (!d?.time?.length || typeof d.temperature_2m_max?.[0] !== "number") return { available: false };
  const { icon, rain } = wmoToIcon(d.weather_code?.[0] ?? -1);
  return {
    available: true,
    hi: Math.round(d.temperature_2m_max[0]),
    lo: Math.round(d.temperature_2m_min?.[0] ?? d.temperature_2m_max[0]),
    icon,
    rain,
  };
}
