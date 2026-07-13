import { useMemo, useState } from "react";
import {
  CATEGORIES,
  dayDateLabel,
  type Category,
  type TripItem,
  type TripSettings,
} from "../../data/trip-items";
import {
  DEFAULT_DURATION,
  REC_AREAS,
  recommendations,
  type RecArea,
  type Recommendation,
} from "../../data/recommendations";
import type { ItemDraft } from "./ItemForm";

// שעת ברירת מחדל לפי קטגוריה — כדי שהעצירות ייכנסו בסדר הגיוני ביום.
const DEFAULT_TIME: Record<Category, string> = {
  hotel: "16:00",
  food: "13:00",
  hike: "11:00",
  view: "14:00",
  charge: "12:00",
  drive: "09:00",
  activity: "10:00",
};

function recToDraft(rec: Recommendation, day: number): ItemDraft {
  return {
    day,
    time: DEFAULT_TIME[rec.category],
    category: rec.category,
    name: rec.name,
    shortDescription: rec.shortDescription,
    location: rec.area,
    lat: rec.lat,
    lng: rec.lng,
    durationMin: rec.durationMin ?? DEFAULT_DURATION[rec.category],
    status: "optional",
    notes: rec.why ? `למה מומלץ: ${rec.why}` : "",
    bookingUrl: rec.bookingUrl,
    tags: rec.tags,
    parkingName: "",
    parkingLat: 0,
    parkingLng: 0,
    bookingRef: "",
    phone: "",
    lodgingGroup: rec.category === "hotel" ? `lodge-day${day}` : "",
    openingHours: rec.openingHours ?? "",
    cost: rec.cost ?? "",
    info: rec.info ?? "",
  };
}

// סיכום קצר ליום (לרצועת אתמול/מחר)
function dayBrief(items: TripItem[], day: number): string {
  const dayItems = items.filter((i) => i.day === day).sort((a, b) => a.time.localeCompare(b.time));
  if (dayItems.length === 0) return "אין עדיין עצירות";
  const names = dayItems.slice(0, 3).map((i) => `${CATEGORIES[i.category].icon} ${i.name}`);
  const extra = dayItems.length > 3 ? ` +${dayItems.length - 3}` : "";
  return names.join(" · ") + extra;
}

// כל התגיות שקיימות במאגר (לסינון)
const ALL_TAGS = Array.from(new Set(recommendations.flatMap((r) => r.tags))).sort();

export function PlanningLabScreen(props: {
  settings: TripSettings;
  items: TripItem[];
  todayNum: number | null;
  addItem: (draft: ItemDraft) => void;
  removeItem: (id: string) => void;
  showToast: (m: string) => void;
}) {
  const { settings, items, todayNum, addItem, removeItem, showToast } = props;
  const [selectedDay, setSelectedDay] = useState<number>(todayNum ?? 1);
  const [catFilter, setCatFilter] = useState<Category | "all">("all");
  const [areaFilter, setAreaFilter] = useState<RecArea | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);

  const dayItems = useMemo(
    () => items.filter((i) => i.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time)),
    [items, selectedDay],
  );

  const dayArea = dayItems.find((i) => i.location)?.location ?? "";
  const hasLodging = dayItems.some((i) => i.category === "hotel");

  // שמות שכבר במסלול (לסימון "כבר נבחר")
  const inTripNames = useMemo(() => new Set(items.map((i) => i.name)), [items]);

  const filteredRecs = useMemo(() => {
    return recommendations.filter((r) => {
      if (areaFilter !== "all" && r.area !== areaFilter) return false;
      if (catFilter !== "all" && r.category !== catFilter) return false;
      if (tagFilter && !r.tags.includes(tagFilter)) return false;
      if (minRating > 0 && (r.rating ?? 0) < minRating) return false;
      return true;
    });
  }, [areaFilter, catFilter, tagFilter, minRating]);

  const selectCls =
    "rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs font-bold text-[var(--ink)]";

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <header>
        <h2 className="text-base font-extrabold">🧭 מעבדת תכנון</h2>
        <p className="text-xs text-[var(--muted)]">
          בוחרים יום, רואים מה הוא כולל, ומוסיפים המלצות מוכנות. נוח במיוחד במסך מחשב. כל תוספת נכנסת
          כ"אופציונלי" — סוגרים סופית במסך מידע.
        </p>
      </header>

      {/* בורר יום */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold text-[var(--muted)]">יום</label>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
          className={selectCls}
        >
          {Array.from({ length: settings.numDays }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              יום {d} · {dayDateLabel(settings.startDate, d)}
              {d === todayNum ? " (היום)" : ""}
            </option>
          ))}
        </select>
        {dayArea && <span className="text-xs font-bold text-[var(--brand)]">📍 {dayArea}</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ─── עמודה: הקשר + מה היום כולל ─── */}
        <section className="flex flex-col gap-3">
          {/* רצועת הקשר אתמול/היום/מחר */}
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex gap-2">
                <span className="w-12 shrink-0 font-bold text-[var(--muted)]">אתמול</span>
                <span className="text-[var(--muted)]">
                  {selectedDay > 1 ? dayBrief(items, selectedDay - 1) : "תחילת הטיול"}
                </span>
              </div>
              <div className="flex gap-2 border-y border-black/5 py-1.5">
                <span className="w-12 shrink-0 font-extrabold text-[var(--brand)]">היום</span>
                <span className="font-bold">
                  יום {selectedDay} · {dayDateLabel(settings.startDate, selectedDay)}
                  {dayArea ? ` · ${dayArea}` : ""}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-12 shrink-0 font-bold text-[var(--muted)]">מחר</span>
                <span className="text-[var(--muted)]">
                  {selectedDay < settings.numDays ? dayBrief(items, selectedDay + 1) : "סוף הטיול"}
                </span>
              </div>
            </div>
          </div>

          {/* מה היום כבר כולל */}
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-extrabold">מה היום כולל</h3>
              {!hasLodging && dayItems.length > 0 && (
                <span className="rounded-full bg-[#FBF3E6] px-2 py-0.5 text-[10px] font-bold text-[#8A6D1F]">
                  אין עדיין לינה
                </span>
              )}
            </div>
            {dayItems.length === 0 ? (
              <p className="py-3 text-center text-xs text-[var(--muted)]">
                היום עוד ריק — הוסיפו המלצות מהצד.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {dayItems.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center gap-2 rounded-xl bg-[var(--paper)] px-2.5 py-2"
                  >
                    <span className="text-base">{CATEGORIES[i.category].icon}</span>
                    <span className="shrink-0 text-[11px] font-bold text-[var(--muted)]">{i.time}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">{i.name}</span>
                    {i.status === "optional" && (
                      <span className="shrink-0 rounded-full bg-[#F5EDD6] px-1.5 py-0.5 text-[9px] font-bold text-[#8A6D1F]">
                        אופציונלי
                      </span>
                    )}
                    <button
                      onClick={() => removeItem(i.id)}
                      aria-label="הסרה"
                      className="shrink-0 rounded-lg px-1.5 py-1 text-xs text-[var(--muted)]"
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ─── עמודה: מאגר המלצות ─── */}
        <section className="flex flex-col gap-3">
          {/* סינון */}
          <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-3 shadow-sm">
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value as RecArea | "all")} className={selectCls}>
              <option value="all">כל האזורים</option>
              {REC_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as Category | "all")} className={selectCls}>
              <option value="all">כל הסוגים</option>
              {(Object.keys(CATEGORIES) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c].icon} {CATEGORIES[c].label}
                </option>
              ))}
            </select>
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className={selectCls}>
              <option value="">כל התגיות</option>
              {ALL_TAGS.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
            <select value={minRating} onChange={(e) => setMinRating(parseFloat(e.target.value))} className={selectCls}>
              <option value={0}>כל דירוג</option>
              <option value={8}>8.0+</option>
              <option value={8.5}>8.5+</option>
              <option value={9}>9.0+</option>
            </select>
          </div>

          {/* כרטיסי המלצות */}
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {filteredRecs.length === 0 && (
              <p className="py-6 text-center text-xs text-[var(--muted)]">אין המלצות שתואמות את הסינון.</p>
            )}
            {filteredRecs.map((rec) => {
              const cat = CATEGORIES[rec.category];
              const added = inTripNames.has(rec.name);
              return (
                <article key={rec.id} className="flex flex-col rounded-2xl bg-white p-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                      style={{ backgroundColor: `${cat.color}22`, border: `2px solid ${cat.color}` }}
                    >
                      {cat.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm font-bold leading-snug">{rec.name}</h4>
                        {rec.rating != null && (
                          <span className="shrink-0 rounded-full bg-[#E2F0E3] px-1.5 py-0.5 text-[10px] font-extrabold text-[#3E7A41]">
                            ⭐ {rec.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--muted)]">
                        {rec.area} · {cat.label}
                        {rec.priceLevel ? ` · ${"₪".repeat(rec.priceLevel)}` : ""}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed">{rec.shortDescription}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--brand)]">💡 {rec.why}</p>

                  {rec.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {rec.tags.map((t) => (
                        <span key={t} className="rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--muted)]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        addItem(recToDraft(rec, selectedDay));
                        showToast(`נוסף ליום ${selectedDay} ✓`);
                      }}
                      className="flex-1 rounded-full bg-[var(--brand)] px-3 py-2 text-xs font-bold text-white"
                    >
                      {added ? "הוסף שוב ליום זה" : `הוסף ליום ${selectedDay}`}
                    </button>
                    <a
                      href={rec.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[var(--brand)] px-3 py-2 text-xs font-bold text-[var(--brand)]"
                    >
                      פרטים
                    </a>
                  </div>
                  {added && (
                    <p className="mt-1 text-center text-[10px] font-bold text-[#3E7A41]">✓ כבר במסלול</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
