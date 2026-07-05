import { useMemo, useState } from "react";
import {
  CATEGORIES,
  dayDateLabel,
  navigationUrl,
  wazeUrl,
  type Reminder,
  type TripItem,
  type TripSettings,
} from "../../data/trip-items";
import type { AdminState } from "./useAdmin";

function sortChrono(a: TripItem, b: TripItem): number {
  return a.day - b.day || a.time.localeCompare(b.time);
}

// חוסרים אמיתיים לפני הטיול, בשפה אנושית.
function buildReadiness(items: TripItem[], settings: TripSettings): string[] {
  const out: string[] = [];
  const active = items;
  for (let day = 1; day <= settings.numDays; day++) {
    const dayItems = active.filter((i) => i.day === day);
    if (dayItems.length === 0) continue;
    const hasLodging = dayItems.some((i) => i.category === "hotel" && i.status === "planned");
    const hasAnyHotel = dayItems.some((i) => i.category === "hotel");
    if (!hasLodging && hasAnyHotel) out.push(`יום ${day}: יש אופציות לינה אבל עוד לא נבחרה אחת`);
    const hasDrive = dayItems.some((i) => i.category === "drive");
    const hasCharge = dayItems.some((i) => i.category === "charge");
    if (hasDrive && !hasCharge) out.push(`יום ${day}: יש נסיעה בלי עצירת טעינה מתוכננת`);
  }
  for (const i of active) {
    if (i.bookingUrl && !i.bookingRef && (i.category === "hotel" || i.category === "activity")) {
      out.push(`"${i.name}": הזמנה בלי מספר אישור`);
    }
    if (i.category === "hotel" && !i.location) out.push(`"${i.name}": לינה בלי כתובת`);
  }
  return out;
}

export function InfoScreen(props: {
  settings: TripSettings;
  items: TripItem[];
  reminders: Reminder[];
  currentDay: number;
  admin: AdminState;
  focusOnMap: (id: string) => void;
  saveSettings: (s: TripSettings) => void;
  savingSettings: boolean;
  chooseLodging: (id: string, group: string) => void;
  showToast: (m: string) => void;
  lastUpdatedLabel: string;
}) {
  const { settings, items, reminders, currentDay, admin, focusOnMap, saveSettings, savingSettings, chooseLodging, showToast, lastUpdatedLabel } =
    props;
  const [mood, setMood] = useState<"hike" | "food" | "view" | "rain" | "short" | null>(null);
  const [editSettings, setEditSettings] = useState<TripSettings | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState(false);
  const [exporting, setExporting] = useState(false);

  const runExport = async () => {
    setExporting(true);
    try {
      const { exportTripToXlsx } = await import("../../lib/export-xlsx");
      await exportTripToXlsx(settings, items, reminders);
      showToast("קובץ Excel ירד ✓");
    } catch {
      showToast("הייצוא נכשל, נסו שוב");
    } finally {
      setExporting(false);
    }
  };

  const hotels = items.filter((i) => i.category === "hotel").sort(sortChrono);
  const readiness = useMemo(() => buildReadiness(items, settings), [items, settings]);

  // לינה נוכחית: המלון ה"מתוכנן" האחרון עד היום הנוכחי.
  const currentLodging = useMemo(() => {
    const planned = hotels.filter((h) => h.status === "planned" && h.day <= currentDay);
    return planned.length ? planned[planned.length - 1] : (hotels.find((h) => h.status === "planned") ?? null);
  }, [hotels, currentDay]);

  // קבוצות חלופות לינה
  const lodgingGroups = useMemo(() => {
    const groups = new Map<string, TripItem[]>();
    const singles: TripItem[] = [];
    for (const h of hotels) {
      if (h.lodgingGroup) {
        const arr = groups.get(h.lodgingGroup) ?? [];
        arr.push(h);
        groups.set(h.lodgingGroup, arr);
      } else {
        singles.push(h);
      }
    }
    return { groups: Array.from(groups.entries()), singles };
  }, [hotels]);

  const suggestions = useMemo(() => {
    if (!mood) return [];
    let pool: TripItem[];
    if (mood === "rain") pool = items.filter((i) => i.tags.includes("גשם"));
    else if (mood === "short") pool = items.filter((i) => i.durationMin > 0 && i.durationMin <= 75 && i.category !== "drive");
    else pool = items.filter((i) => i.category === mood);
    return [...pool]
      .filter((i) => i.status !== "done")
      .sort((a, b) => Math.abs(a.day - currentDay) - Math.abs(b.day - currentDay))
      .slice(0, 3);
  }, [mood, items, currentDay]);

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <section className="mx-4 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-extrabold">
        {icon} {title}
      </h2>
      {children}
    </section>
  );

  const inputCls =
    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none";

  const copyManageLink = async () => {
    const link = `${window.location.origin}/?k=${admin.key}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast("קישור הניהול הועתק ✓");
    } catch {
      showToast(link);
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* מצב ניהול */}
      <Section title={admin.isAdmin ? "מצב ניהול פעיל" : "צפייה בלבד"} icon={admin.isAdmin ? "🔓" : "👀"}>
        {admin.isAdmin ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--muted)]">
              אתם יכולים להוסיף, לערוך ולמחוק. שתפו את קישור הצפייה עם המשפחה, ושמרו את קישור הניהול לעצמכם.
            </p>
            <div className="flex gap-2">
              <button onClick={copyManageLink} className="flex-1 rounded-full bg-black/5 px-3 py-2 text-xs font-bold">
                העתק קישור ניהול 🔑
              </button>
              <button
                onClick={async () => {
                  const link = `${window.location.origin}/`;
                  try {
                    await navigator.clipboard.writeText(link);
                    showToast("קישור הצפייה הועתק ✓");
                  } catch {
                    showToast(link);
                  }
                }}
                className="flex-1 rounded-full bg-black/5 px-3 py-2 text-xs font-bold"
              >
                העתק קישור צפייה 👀
              </button>
            </div>
            <button onClick={admin.signOut} className="rounded-full bg-[#F8E3E0] px-3 py-2 text-xs font-bold text-[#A33B2E]">
              יציאה ממצב ניהול
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--muted)]">
              במצב צפייה אפשר לראות הכל, לנווט ולסמן מה בוצע. לעריכה צריך מפתח ניהול.
            </p>
            <div className="flex gap-2">
              <input
                className={inputCls}
                dir="ltr"
                placeholder="מפתח ניהול"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setKeyError(false);
                }}
              />
              <button
                onClick={async () => {
                  const ok = await admin.signInWithKey(keyInput);
                  if (ok) showToast("מצב ניהול הופעל ✓");
                  else setKeyError(true);
                }}
                className="shrink-0 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white"
              >
                הפעל
              </button>
            </div>
            {keyError && <p className="text-xs font-bold text-[#A33B2E]">מפתח שגוי</p>}
          </div>
        )}
      </Section>

      {/* מה בא לנו עכשיו */}
      <Section title="מה בא לנו עכשיו?" icon="✨">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "hike", label: "טבע קצר", icon: "🥾" },
              { id: "food", label: "אוכל", icon: "🍽️" },
              { id: "view", label: "תצפית", icon: "📍" },
              { id: "rain", label: "יום גשום", icon: "🌧️" },
              { id: "short", label: "שעה פנויה", icon: "⏳" },
            ] as { id: "hike" | "food" | "view" | "rain" | "short"; label: string; icon: string }[]
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(mood === m.id ? null : m.id)}
              className={`rounded-xl px-2 py-2.5 text-xs font-bold transition-colors ${
                mood === m.id ? "bg-[var(--brand)] text-white" : "bg-[var(--paper)] text-[var(--ink)]"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        {mood && (
          <div className="mt-3 flex flex-col gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => focusOnMap(s.id)}
                className="flex items-center justify-between rounded-xl bg-[var(--paper)] px-3 py-2.5 text-right"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold">
                    {CATEGORIES[s.category].icon} {s.name}
                  </span>
                  <span className="block text-[11px] text-[var(--muted)]">
                    יום {s.day}
                    {s.location ? ` · ${s.location}` : ""}
                  </span>
                </span>
                <span className="text-xs font-bold text-[var(--brand)]">למפה ←</span>
              </button>
            ))}
            {suggestions.length === 0 && (
              <p className="text-xs text-[var(--muted)]">
                {mood === "rain"
                  ? 'אין עדיין עצירות עם תגית "גשם". הוסיפו תגית כזו לעצירות מקורות.'
                  : "אין עדיין עצירות מתאימות בטיול."}
              </p>
            )}
          </div>
        )}
      </Section>

      {/* מוכנים לטיול */}
      <Section title="מוכנים לטיול?" icon="✅">
        {items.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">אין עדיין מסלול לבדוק.</p>
        ) : readiness.length === 0 ? (
          <p className="text-xs font-bold text-[#3E7A41]">הכל נראה מסודר! אין חוסרים בולטים 🎉</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {readiness.map((r, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-[#FBF3E6] px-3 py-2 text-xs">
                <span>⚠️</span>
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* לינות והשוואת חלופות */}
      <Section title="לינות והזמנות" icon="🏨">
        {hotels.length === 0 && (
          <p className="text-xs text-[var(--muted)]">עוד אין לינות. עצירות מקטגוריית 🏨 לינה יופיעו כאן.</p>
        )}
        <div className="flex flex-col gap-3">
          {lodgingGroups.groups.map(([group, options]) => (
            <div key={group} className="rounded-xl bg-[var(--paper)] p-2.5">
              <p className="mb-1.5 text-[11px] font-extrabold text-[var(--muted)]">
                {group} · {options.length} חלופות
              </p>
              <div className="flex flex-col gap-1.5">
                {options.map((h) => {
                  const chosen = h.status === "planned";
                  return (
                    <div
                      key={h.id}
                      className={`rounded-lg bg-white px-3 py-2 ${chosen ? "ring-2 ring-[var(--brand)]" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-bold">
                          {chosen ? "✓ " : ""}
                          {h.name}
                        </p>
                        {admin.isAdmin && !chosen && (
                          <button
                            onClick={() => chooseLodging(h.id, group)}
                            className="shrink-0 rounded-full bg-[var(--brand)] px-3 py-1 text-[11px] font-bold text-white"
                          >
                            בחר
                          </button>
                        )}
                      </div>
                      {h.shortDescription && (
                        <p className="mt-0.5 text-[11px] text-[var(--muted)]">{h.shortDescription}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {lodgingGroups.singles.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--paper)] px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{h.name}</p>
                <p className="text-[11px] text-[var(--muted)]">
                  יום {h.day} · {dayDateLabel(settings.startDate, h.day)}
                  {h.location ? ` · ${h.location}` : ""}
                  {h.bookingRef ? ` · אישור ${h.bookingRef}` : ""}
                </p>
              </div>
              {h.bookingUrl && (
                <a
                  href={h.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-full border border-[var(--brand)] px-3 py-1 text-[11px] font-bold text-[var(--brand)]"
                >
                  להזמנה
                </a>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* חירום */}
      <Section title="חירום ומידע מיידי" icon="🆘">
        {currentLodging && (
          <div className="mb-3 rounded-xl bg-[var(--paper)] p-3">
            <p className="text-[11px] font-bold text-[var(--muted)]">הלינה הנוכחית</p>
            <p className="text-sm font-bold">{currentLodging.name}</p>
            {currentLodging.location && <p className="text-xs text-[var(--muted)]">{currentLodging.location}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <a
                href={navigationUrl(currentLodging)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[var(--brand)] px-3 py-1 text-[11px] font-bold text-white"
              >
                נווט ללינה 🚗
              </a>
              {currentLodging.phone && (
                <a
                  href={`tel:${currentLodging.phone.replace(/[^+\d]/g, "")}`}
                  className="rounded-full border border-[var(--brand)] px-3 py-1 text-[11px] font-bold text-[var(--brand)]"
                >
                  ☎️ {currentLodging.phone}
                </a>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { n: "112", l: "משטרה" },
            { n: "113", l: "אמבולנס" },
            { n: "110", l: "מכבי אש" },
            { n: "+47 22 42 76 00", l: "שגרירות ישראל" },
          ].map((e) => (
            <a key={e.n} href={`tel:${e.n.replace(/[^+\d]/g, "")}`} className="rounded-xl bg-[var(--paper)] px-3 py-2">
              <span className="block font-extrabold text-[var(--brand)]" dir="ltr">
                {e.n}
              </span>
              <span className="text-[11px] text-[var(--muted)]">{e.l}</span>
            </a>
          ))}
        </div>
        {(currentLodging?.lat || hotels.length > 0) && (
          <a
            href={wazeUrl(currentLodging?.lat ?? hotels[0].lat, currentLodging?.lng ?? hotels[0].lng)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block rounded-xl bg-black/5 px-3 py-2 text-center text-xs font-bold"
          >
            🏥 מצא בית חולים קרוב (דרך Waze)
          </a>
        )}
      </Section>

      {/* ייצוא */}
      {admin.isAdmin && (
        <Section title="ייצוא הטיול" icon="📤">
          <p className="mb-2 text-xs text-[var(--muted)]">
            קובץ Excel מסודר עם כל המסלול, הלינות, ההזמנות והתזכורות. אפשר לפתוח ב-Excel או להעלות ל-Google Sheets, להדפיס או לשתף.
          </p>
          <button
            onClick={runExport}
            disabled={exporting || items.length === 0}
            className="w-full rounded-full bg-[#0B7A44] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {exporting ? "מכין קובץ…" : "ייצוא ל-Excel / Sheets 📊"}
          </button>
          {items.length === 0 && <p className="mt-1 text-[11px] text-[var(--muted)]">אין עדיין מסלול לייצא.</p>}
        </Section>
      )}

      {/* הגדרות טיול */}
      {admin.isAdmin && (
        <Section title="הגדרות הטיול" icon="⚙️">
          {!editSettings ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">
                {settings.title} · מ-{settings.startDate.split("-").reverse().join(".")} · {settings.numDays} ימים
              </p>
              <button
                onClick={() => setEditSettings({ ...settings })}
                className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-bold"
              >
                עריכה ✏️
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--muted)]">
                שם הטיול
                <input
                  className={inputCls}
                  value={editSettings.title}
                  onChange={(e) => setEditSettings({ ...editSettings, title: e.target.value })}
                />
              </label>
              <label className="text-xs font-bold text-[var(--muted)]">
                כותרת משנה
                <input
                  className={inputCls}
                  value={editSettings.subtitle}
                  onChange={(e) => setEditSettings({ ...editSettings, subtitle: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold text-[var(--muted)]">
                  תאריך התחלה
                  <input
                    type="date"
                    className={inputCls}
                    value={editSettings.startDate}
                    onChange={(e) => setEditSettings({ ...editSettings, startDate: e.target.value })}
                  />
                </label>
                <label className="text-xs font-bold text-[var(--muted)]">
                  מספר ימים
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className={inputCls}
                    value={editSettings.numDays}
                    onChange={(e) =>
                      setEditSettings({ ...editSettings, numDays: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    saveSettings(editSettings);
                    setEditSettings(null);
                  }}
                  disabled={savingSettings}
                  className="flex-1 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  שמירה
                </button>
                <button onClick={() => setEditSettings(null)} className="rounded-full bg-black/5 px-4 py-2 text-xs font-bold">
                  ביטול
                </button>
              </div>
            </div>
          )}
        </Section>
      )}

      {lastUpdatedLabel && (
        <p className="px-4 pb-2 text-center text-[11px] text-[var(--muted)]">
          עודכן לאחרונה ב-{lastUpdatedLabel} · זמין גם בלי קליטה
        </p>
      )}
    </div>
  );
}
