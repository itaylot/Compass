import {
  CATEGORIES,
  hasParking,
  navigationUrl,
  parkingUrl,
  timeToMinutes,
  type TripItem,
} from "../../data/trip-items";

// כרטיס "הפעולה הבאה" בראש מסך היום: מה עכשיו, ניווט גדול, ומה אחריו.
// isCurrentDay=true → מסנן לפי שעון אוסלו (nowMinutes). אחרת מציג את
// הפריט הראשון שטרם בוצע ביום שנבחר.

export function NextActionCard(props: {
  items: TripItem[]; // כל פריטי היום, ממוינים כרונולוגית
  isCurrentDay: boolean;
  nowMinutes: number;
  onNavigate: (item: TripItem) => void;
  onDetail: (id: string) => void;
}) {
  const { items, isCurrentDay, nowMinutes, onNavigate, onDetail } = props;

  const active = items.filter((i) => i.status !== "done");
  if (active.length === 0) return null;

  let idx = 0;
  if (isCurrentDay) {
    const upcoming = active.findIndex((i) => timeToMinutes(i.time) >= nowMinutes - 30);
    idx = upcoming >= 0 ? upcoming : active.length - 1;
  }
  const item = active[idx];
  const next = active[idx + 1];
  const cat = CATEGORIES[item.category];
  const park = hasParking(item);

  return (
    <section className="mx-4 mt-1 rounded-2xl border border-[var(--brand)]/20 bg-white p-4 shadow-md">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-extrabold text-white">
          {isCurrentDay ? "עכשיו" : "מתחילים"}
        </span>
        <span className="text-xs font-bold text-[var(--muted)]">{item.time}</span>
        {item.tags.includes("קריטי בזמן") && (
          <span className="rounded-full bg-[#F8E3E0] px-2 py-0.5 text-[10px] font-bold text-[#A33B2E]">⏰ רגיש לזמן</span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: `${cat.color}22` }}>
          {cat.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold leading-snug">{item.name}</h2>
          {item.shortDescription && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">{item.shortDescription}</p>
          )}
          {park && <p className="mt-1 text-[11px] font-bold text-[var(--brand)]">🅿️ חניה: {item.parkingName || "מוגדרת"}</p>}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <a
          href={park ? parkingUrl(item) : navigationUrl(item)}
          target="_blank"
          rel="noreferrer"
          onClick={() => onNavigate(item)}
          className="flex-1 rounded-full bg-[var(--brand)] px-4 py-3 text-center text-sm font-extrabold text-white shadow-sm"
        >
          {park ? "נווט לחניה 🅿️" : "נווט ליעד 🚗"}
        </a>
        <button
          onClick={() => onDetail(item.id)}
          className="rounded-full border border-[var(--brand)] px-4 py-3 text-sm font-bold text-[var(--brand)]"
        >
          פרטים
        </button>
      </div>

      {next && (
        <p className="mt-2.5 border-t border-black/5 pt-2 text-xs text-[var(--muted)]">
          אחר כך: <b className="text-[var(--ink)]">{CATEGORIES[next.category].icon} {next.name}</b> ב-{next.time}
        </p>
      )}
    </section>
  );
}
