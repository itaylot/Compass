import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// מזג אוויר מ-yr.no (Meteorologisk institutt) דרך ה-Worker בלבד:
// ה-API דורש User-Agent מזהה ואוסר קריאה ישירה מהדפדפן, ולכן זה חייב שרת.
// cache ברמת ה-isolate מצמצם קריאות (ponytail: cache פר-אינסטנס, מתאפס בהחלפת isolate).

interface WeatherResult {
  available: boolean;
  hi?: number;
  lo?: number;
  icon?: string;
  rain?: boolean;
}

const cache = new Map<string, { at: number; value: WeatherResult }>();
const TTL_MS = 60 * 60 * 1000; // שעה

function symbolToIcon(code: string): { icon: string; rain: boolean } {
  const c = code.toLowerCase();
  if (c.includes("thunder")) return { icon: "⛈️", rain: true };
  if (c.includes("sleet") || c.includes("snow")) return { icon: "🌨️", rain: true };
  if (c.includes("rain")) return { icon: "🌧️", rain: true };
  if (c.includes("fog")) return { icon: "🌫️", rain: false };
  if (c.includes("cloudy") && !c.includes("partly")) return { icon: "☁️", rain: false };
  if (c.includes("partlycloudy")) return { icon: "⛅", rain: false };
  if (c.includes("fair")) return { icon: "🌤️", rain: false };
  if (c.includes("clearsky")) return { icon: "☀️", rain: false };
  return { icon: "🌡️", rain: false };
}

interface YrTimeseries {
  time: string;
  data: {
    instant?: { details?: { air_temperature?: number } };
    next_6_hours?: { summary?: { symbol_code?: string } };
    next_1_hours?: { summary?: { symbol_code?: string } };
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
    // עיגול קואורדינטות ל-2 ספרות: מצמצם מרחב cache ותואם דרישת yr.no.
    const lat = Math.round(data.lat * 100) / 100;
    const lng = Math.round(data.lng * 100) / 100;
    const cacheKey = `${lat},${lng},${data.date}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

    let result: WeatherResult = { available: false };
    try {
      const res = await fetch(
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lng}`,
        { headers: { "User-Agent": "norway2026-family-trip-app / contact: itayl1998@gmail.com" } },
      );
      if (res.ok) {
        const json = (await res.json()) as { properties?: { timeseries?: YrTimeseries[] } };
        const series = (json.properties?.timeseries ?? []).filter((t) => t.time.startsWith(data.date));
        if (series.length > 0) {
          const temps = series
            .map((t) => t.data.instant?.details?.air_temperature)
            .filter((n): n is number => typeof n === "number");
          const hi = temps.length ? Math.round(Math.max(...temps)) : undefined;
          const lo = temps.length ? Math.round(Math.min(...temps)) : undefined;
          // סמל ייצוגי: קרוב ל-12:00, אחרת הראשון שיש בו סמל.
          const midday =
            series.find((t) => t.time.includes("T12")) ??
            series.find((t) => t.data.next_6_hours?.summary?.symbol_code) ??
            series[0];
          const code =
            midday.data.next_6_hours?.summary?.symbol_code ??
            midday.data.next_1_hours?.summary?.symbol_code ??
            "";
          const { icon, rain } = symbolToIcon(code);
          result = { available: true, hi, lo, icon, rain };
        }
      }
    } catch {
      result = { available: false };
    }

    cache.set(cacheKey, { at: Date.now(), value: result });
    return result;
  });
