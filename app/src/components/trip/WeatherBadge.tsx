import { useQuery } from "@tanstack/react-query";
import { FORECAST_HORIZON_DAYS, fetchWeather } from "../../lib/weather";

// מזג אוויר ליום ולמיקום — גנרי לכל טיול/תאריך.
// מצבים: טוען · זמין (אייקון+טמפרטורות) · רחוק מהטווח (הודעה עם ספירת ימים) · לא זמין זמנית.
// "רחוק מהטווח" מחושב בצד הלקוח מהתאריך עצמו — אמין יותר מהסתמכות על תגובת השרת.

function daysUntil(dateIso: string): number | null {
  const target = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000);
}

export function WeatherBadge(props: { lat: number; lng: number; date: string }) {
  const { lat, lng, date } = props;
  const far = daysUntil(date);
  const isFarFuture = far != null && far > FORECAST_HORIZON_DAYS;

  const q = useQuery({
    queryKey: ["weather", Math.round(lat * 100) / 100, Math.round(lng * 100) / 100, date],
    queryFn: () => fetchWeather(lat, lng, date),
    staleTime: 60 * 60 * 1000,
    // לא קוראים לשרת אם התאריך רחוק מהטווח או שאין מיקום — חוסך קריאה מיותרת.
    enabled: (lat !== 0 || lng !== 0) && !isFarFuture,
    retry: 1,
  });

  // רחוק מהטווח — הודעה מסבירה עם ספירת ימים עד שהתחזית תיכנס לטווח
  if (isFarFuture) {
    const untilWindow = (far as number) - FORECAST_HORIZON_DAYS;
    return (
      <div
        className="max-w-[100px] text-left leading-tight"
        title={`תחזית מזג האוויר מתעדכנת עד ${FORECAST_HORIZON_DAYS} ימים לפני כל תאריך. היום הזה עדיין רחוק מדי.`}
      >
        <p className="text-[10px] font-semibold text-white/85">🌡️ מזג אוויר</p>
        <p className="text-[10px] text-white/70">יופיע בעוד ~{untilWindow} ימים</p>
      </div>
    );
  }

  if (q.isLoading) {
    return <span className="text-xs text-white/70">…</span>;
  }

  if (q.data?.available) {
    return (
      <div className="text-left">
        <span className="text-2xl">{q.data.icon}</span>
        <p className="text-xs text-white/85" dir="ltr">
          {q.data.lo}° / {q.data.hi}°
        </p>
      </div>
    );
  }

  // בטווח אבל לא חזר מידע — תקלה זמנית
  return (
    <span className="text-[10px] text-white/60" title="לא הצלחנו לטעון תחזית כרגע, נסו לרענן">
      תחזית לא זמינה
    </span>
  );
}
