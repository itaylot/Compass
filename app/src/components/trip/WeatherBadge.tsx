import { useQuery } from "@tanstack/react-query";
import { getWeather } from "../../lib/api/weather.functions";

// מזג אוויר ליום ולמיקום. אם התאריך מחוץ לטווח התחזית (~10 ימים) — מציג
// חיווי עדין במקום מספרים שגויים.

export function WeatherBadge(props: { lat: number; lng: number; date: string }) {
  const { lat, lng, date } = props;
  const q = useQuery({
    queryKey: ["weather", Math.round(lat * 100) / 100, Math.round(lng * 100) / 100, date],
    queryFn: () => getWeather({ data: { lat, lng, date } }),
    staleTime: 60 * 60 * 1000,
    enabled: lat !== 0 || lng !== 0,
    retry: 1,
  });

  if (q.isLoading) {
    return <span className="text-xs text-white/70">…</span>;
  }
  if (!q.data?.available) {
    return <span className="text-[11px] text-white/70">תחזית בקרוב</span>;
  }
  return (
    <div className="text-left">
      <span className="text-2xl">{q.data.icon}</span>
      <p className="text-xs text-white/85" dir="ltr">
        {q.data.lo}° / {q.data.hi}°
      </p>
    </div>
  );
}
