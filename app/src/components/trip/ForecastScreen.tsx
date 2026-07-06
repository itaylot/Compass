import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { dayDateLabel, dayIso, type TripItem, type TripSettings } from "../../data/trip-items";
import { FORECAST_HORIZON_DAYS, daysUntil, fetchWeather } from "../../lib/weather";

// טאב תחזית: מזג אוויר לכל ימי הטיול במבט אחד.
// המיקום לכל יום נגזר מהעצירה המרכזית של אותו יום; אם ליום אין מיקום,
// נגררת קדימה הלוקיישן של היום הקודם (בדרך כלל נשארים באותו אזור).

interface DayLoc {
  day: number;
  date: string; // YYYY-MM-DD
  label: string; // DD.MM
  area: string;
  lat: number;
  lng: number;
}

function buildDayLocations(items: TripItem[], settings: TripSettings): DayLoc[] {
  const out: DayLoc[] = [];
  let last: { area: string; lat: number; lng: number } | null = null;
  for (let day = 1; day <= settings.numDays; day++) {
    const located = items.filter((i) => i.day === day && (i.lat !== 0 || i.lng !== 0));
    const rep = located.find((i) => i.category !== "drive") ?? located[0];
    if (rep) last = { area: rep.location, lat: rep.lat, lng: rep.lng };
    out.push({
      day,
      date: dayIso(settings.startDate, day),
      label: dayDateLabel(settings.startDate, day),
      area: last?.area ?? "",
      lat: last?.lat ?? 0,
      lng: last?.lng ?? 0,
    });
  }
  // מילוי לאחור לימים הראשונים שאין להם מיקום עדיין
  const firstLocated = out.find((d) => d.lat !== 0 || d.lng !== 0);
  if (firstLocated) {
    for (const d of out) {
      if (d.lat === 0 && d.lng === 0) {
        d.lat = firstLocated.lat;
        d.lng = firstLocated.lng;
        if (!d.area) d.area = firstLocated.area;
      } else break;
    }
  }
  return out;
}

function ForecastRow({ d, todayNum }: { d: DayLoc; todayNum: number | null }) {
  const far = daysUntil(d.date);
  const isFar = far != null && far > FORECAST_HORIZON_DAYS;
  const hasLoc = d.lat !== 0 || d.lng !== 0;

  const q = useQuery({
    queryKey: ["weather", Math.round(d.lat * 100) / 100, Math.round(d.lng * 100) / 100, d.date],
    queryFn: () => fetchWeather(d.lat, d.lng, d.date),
    staleTime: 60 * 60 * 1000,
    enabled: hasLoc && !isFar,
    retry: 1,
  });

  const isToday = d.day === todayNum;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ${
        isToday ? "ring-2 ring-[var(--brand)]" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold">
          {isToday ? "📍 " : ""}יום {d.day}
          <span className="mr-1 text-xs font-medium text-[var(--muted)]">· {d.label}</span>
        </p>
        {d.area && <p className="truncate text-xs text-[var(--muted)]">{d.area}</p>}
      </div>

      <div className="shrink-0 text-left">
        {!hasLoc ? (
          <span className="text-[11px] text-[var(--muted)]">אין מיקום ליום זה</span>
        ) : isFar ? (
          <div className="text-left leading-tight" title={`התחזית מתעדכנת עד ${FORECAST_HORIZON_DAYS} ימים מראש`}>
            <p className="text-[11px] font-semibold text-[var(--ink)]">רחוק מדי</p>
            <p className="text-[10px] text-[var(--muted)]">
              בעוד ~{(far as number) - FORECAST_HORIZON_DAYS} ימים
            </p>
          </div>
        ) : q.isLoading ? (
          <span className="text-xs text-[var(--muted)]">טוען…</span>
        ) : q.data?.available ? (
          <div className="flex items-center gap-2">
            {q.data.rain && <span className="text-[10px] font-bold text-[var(--glacier)]">גשם</span>}
            <span className="text-2xl">{q.data.icon}</span>
            <span className="text-sm font-bold text-[var(--ink)]" dir="ltr">
              {q.data.lo}° / {q.data.hi}°
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-[var(--muted)]">לא זמין</span>
        )}
      </div>
    </div>
  );
}

export function ForecastScreen(props: { settings: TripSettings; items: TripItem[]; todayNum: number | null }) {
  const { settings, items, todayNum } = props;
  const days = useMemo(() => buildDayLocations(items, settings), [items, settings]);

  const anyInRange = days.some((d) => {
    const f = daysUntil(d.date);
    return f != null && f <= FORECAST_HORIZON_DAYS && (d.lat !== 0 || d.lng !== 0);
  });

  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <div className="mb-1">
        <h2 className="text-base font-extrabold">🌤️ תחזית מזג האוויר</h2>
        <p className="text-xs text-[var(--muted)]">
          {anyInRange
            ? `תחזית לכל ימי הטיול. מתעדכנת אוטומטית עד ${FORECAST_HORIZON_DAYS} ימים מראש.`
            : `הטיול עדיין רחוק — התחזית תופיע כשנתקרב (עד ${FORECAST_HORIZON_DAYS} ימים מראש).`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center shadow-sm">
          <span className="text-4xl">🌦️</span>
          <p className="text-sm text-[var(--muted)]">כשיתווספו עצירות עם מיקום, כאן תופיע תחזית מזג האוויר לכל יום.</p>
        </div>
      ) : (
        days.map((d) => <ForecastRow key={d.day} d={d} todayNum={todayNum} />)
      )}
    </div>
  );
}
