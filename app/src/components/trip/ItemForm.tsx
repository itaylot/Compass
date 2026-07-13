import { useState } from "react";
import { CATEGORIES, type Category, type Status, type TripItem } from "../../data/trip-items";

export type ItemDraft = Omit<TripItem, "id"> & { id?: string };

function emptyDraft(day: number): ItemDraft {
  return {
    day,
    time: "10:00",
    category: "view",
    name: "",
    shortDescription: "",
    location: "",
    lat: 0,
    lng: 0,
    durationMin: 60,
    status: "planned",
    notes: "",
    bookingUrl: "",
    tags: [],
    parkingName: "",
    parkingLat: 0,
    parkingLng: 0,
    bookingRef: "",
    phone: "",
    lodgingGroup: "",
    openingHours: "",
    cost: "",
    info: "",
  };
}

interface PlaceHit {
  display_name: string;
  lat: string;
  lon: string;
}

async function geocode(query: string): Promise<PlaceHit[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=he&q=${encodeURIComponent(query)}`,
  );
  return (await res.json()) as PlaceHit[];
}

export function ItemForm(props: {
  initial: TripItem | null; // null = פריט חדש
  defaultDay: number;
  numDays: number;
  saving: boolean;
  onSave: (draft: ItemDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { initial, defaultDay, numDays, saving, onSave, onDelete, onClose } = props;
  const [draft, setDraft] = useState<ItemDraft>(initial ? { ...initial } : emptyDraft(defaultDay));
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeHits, setPlaceHits] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [parkingQuery, setParkingQuery] = useState("");
  const [parkingHits, setParkingHits] = useState<PlaceHit[]>([]);
  const [parkingSearching, setParkingSearching] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const searchPlace = async () => {
    const q = placeQuery.trim() || draft.name.trim();
    if (!q) return;
    setSearching(true);
    setPlaceHits([]);
    try {
      const hits = await geocode(q);
      setPlaceHits(hits);
      setError(hits.length === 0 ? "לא נמצא מקום כזה, נסו ניסוח אחר (עדיף באנגלית)" : null);
    } catch {
      setError("חיפוש המקום נכשל, בדקו חיבור לאינטרנט");
    } finally {
      setSearching(false);
    }
  };

  const searchParking = async () => {
    const q = parkingQuery.trim();
    if (!q) return;
    setParkingSearching(true);
    setParkingHits([]);
    try {
      setParkingHits(await geocode(q));
    } catch {
      setError("חיפוש החניה נכשל");
    } finally {
      setParkingSearching(false);
    }
  };

  const pickPlace = (hit: PlaceHit) => {
    const shortName = hit.display_name.split(",").slice(0, 2).join(", ");
    setDraft((d) => ({
      ...d,
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      location: d.location || shortName,
      name: d.name || shortName,
    }));
    setPlaceHits([]);
  };

  const pickParking = (hit: PlaceHit) => {
    setDraft((d) => ({
      ...d,
      parkingLat: parseFloat(hit.lat),
      parkingLng: parseFloat(hit.lon),
      parkingName: d.parkingName || hit.display_name.split(",").slice(0, 2).join(", "),
    }));
    setParkingHits([]);
  };

  const submit = () => {
    if (!draft.name.trim()) {
      setError("חסר שם למקום");
      return;
    }
    if (draft.lat === 0 && draft.lng === 0) {
      setError("חסר מיקום: חפשו את המקום כדי שיופיע במפה ובניווט");
      return;
    }
    setError(null);
    onSave(draft);
  };

  const inputCls =
    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none";
  const labelCls = "mb-1 block text-xs font-bold text-[var(--muted)]";

  return (
    <div className="fixed inset-0 z-[1150] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--paper)] p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
        <h2 className="mb-4 text-base font-extrabold">{initial ? "עריכת עצירה" : "עצירה חדשה"}</h2>

        {/* חיפוש מקום */}
        <div className="mb-4 rounded-2xl bg-white p-3 shadow-sm">
          <label className={labelCls}>איפה זה? חפשו ונמלא את המיקום לבד</label>
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="למשל: Stegastein viewpoint"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void searchPlace();
                }
              }}
            />
            <button
              onClick={() => void searchPlace()}
              disabled={searching}
              className="shrink-0 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {searching ? "מחפש…" : "חיפוש 🔎"}
            </button>
          </div>
          {placeHits.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {placeHits.map((h, i) => (
                <li key={i}>
                  <button
                    onClick={() => pickPlace(h)}
                    className="w-full rounded-lg bg-[var(--paper)] px-3 py-2 text-right text-xs leading-snug"
                  >
                    📍 {h.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {draft.lat !== 0 && (
            <p className="mt-2 text-[11px] font-semibold text-[#3E7A41]">
              ✓ מיקום נבחר ({draft.lat.toFixed(4)}, {draft.lng.toFixed(4)})
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>שם המקום *</label>
            <input className={inputCls} value={draft.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>קטגוריה</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(CATEGORIES) as Category[]).map((c) => (
                <button
                  key={c}
                  onClick={() => set("category", c)}
                  className={`rounded-xl px-1 py-2 text-[11px] font-bold leading-tight ${
                    draft.category === c ? "bg-[var(--brand)] text-white" : "bg-white text-[var(--ink)] shadow-sm"
                  }`}
                >
                  <span className="block text-base">{CATEGORIES[c].icon}</span>
                  {CATEGORIES[c].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>יום</label>
              <select
                className={inputCls}
                value={draft.day}
                onChange={(e) => set("day", parseInt(e.target.value, 10))}
              >
                {Array.from({ length: numDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    יום {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>שעה</label>
              <input type="time" className={inputCls} value={draft.time} onChange={(e) => set("time", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>משך (דקות)</label>
              <input
                type="number"
                min={0}
                step={15}
                className={inputCls}
                value={draft.durationMin}
                onChange={(e) => set("durationMin", Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>סטטוס</label>
            <div className="flex gap-1.5">
              {(
                [
                  { v: "planned", l: "מתוכנן" },
                  { v: "optional", l: "אופציונלי" },
                  { v: "done", l: "בוצע" },
                ] as { v: Status; l: string }[]
              ).map((s) => (
                <button
                  key={s.v}
                  onClick={() => set("status", s.v)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold ${
                    draft.status === s.v ? "bg-[var(--ink)] text-white" : "bg-white shadow-sm"
                  }`}
                >
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>אזור / עיר</label>
            <input className={inputCls} value={draft.location} onChange={(e) => set("location", e.target.value)} />
          </div>

          <div>
            <label className={labelCls}>תיאור קצר</label>
            <input
              className={inputCls}
              value={draft.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
            />
          </div>

          {/* חניה צמודה */}
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <label className={labelCls}>🅿️ חניה מומלצת (נפרדת מהיעד, לניווט ישיר)</label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder="חפשו חניון / רחוב חניה"
                value={parkingQuery}
                onChange={(e) => setParkingQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void searchParking();
                  }
                }}
              />
              <button
                onClick={() => void searchParking()}
                disabled={parkingSearching}
                className="shrink-0 rounded-xl bg-black/5 px-3 py-2 text-sm font-bold disabled:opacity-50"
              >
                {parkingSearching ? "…" : "חיפוש"}
              </button>
            </div>
            {parkingHits.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {parkingHits.map((h, i) => (
                  <li key={i}>
                    <button
                      onClick={() => pickParking(h)}
                      className="w-full rounded-lg bg-[var(--paper)] px-3 py-2 text-right text-xs leading-snug"
                    >
                      🅿️ {h.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {(draft.parkingLat !== 0 || draft.parkingLng !== 0) && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <input
                  className={`${inputCls} text-xs`}
                  placeholder="שם החניה"
                  value={draft.parkingName}
                  onChange={(e) => set("parkingName", e.target.value)}
                />
                <button
                  onClick={() => setDraft((d) => ({ ...d, parkingName: "", parkingLat: 0, parkingLng: 0 }))}
                  className="shrink-0 rounded-lg bg-[#F8E3E0] px-2 py-2 text-xs font-bold text-[#A33B2E]"
                >
                  הסר
                </button>
              </div>
            )}
          </div>

          {/* פרטים נוספים (מתקפל) */}
          <button
            onClick={() => setShowExtras((s) => !s)}
            className="rounded-xl bg-white px-3 py-2 text-right text-xs font-bold text-[var(--muted)] shadow-sm"
          >
            {showExtras ? "▼" : "◀"} שעות פתיחה, עלות, מידע, הזמנה ותגיות
          </button>
          {showExtras && (
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>🕐 שעות פתיחה</label>
                  <input
                    className={inputCls}
                    placeholder="למשל: 09:00–18:00"
                    value={draft.openingHours}
                    onChange={(e) => set("openingHours", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>💰 עלות</label>
                  <input
                    className={inputCls}
                    placeholder="למשל: חינם / 150 NOK"
                    value={draft.cost}
                    onChange={(e) => set("cost", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>ℹ️ מידע כללי (טיפים, מה חשוב לדעת)</label>
                <textarea
                  className={`${inputCls} min-h-16`}
                  value={draft.info}
                  onChange={(e) => set("info", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>מספר אישור הזמנה</label>
                  <input className={inputCls} value={draft.bookingRef} onChange={(e) => set("bookingRef", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>טלפון</label>
                  <input className={inputCls} dir="ltr" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>קישור להזמנה / אתר</label>
                <input
                  className={inputCls}
                  dir="ltr"
                  placeholder="https://"
                  value={draft.bookingUrl}
                  onChange={(e) => set("bookingUrl", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>הערות (טיפים, קוד כניסה, הערת שטח)</label>
                <textarea
                  className={`${inputCls} min-h-16`}
                  value={draft.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>תגיות, מופרדות בפסיק (למשל: גשם, משפחתי)</label>
                <input
                  className={inputCls}
                  value={draft.tags.join(", ")}
                  onChange={(e) =>
                    set(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </div>
              {draft.category === "hotel" && (
                <div>
                  <label className={labelCls}>קבוצת חלופות לינה (שם משותף לאותו לילה, למשל "לילה בברגן")</label>
                  <input
                    className={inputCls}
                    placeholder="ריק = מלון בודד"
                    value={draft.lodgingGroup}
                    onChange={(e) => set("lodgingGroup", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {error && <p className="rounded-xl bg-[#F8E3E0] px-3 py-2 text-xs font-bold text-[#A33B2E]">{error}</p>}

          <div className="mt-1 flex gap-2">
            <button
              onClick={submit}
              disabled={saving}
              className="flex-1 rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "שומר…" : initial ? "שמירת שינויים" : "הוספה לטיול"}
            </button>
            <button onClick={onClose} className="rounded-full bg-black/5 px-5 py-3 text-sm font-bold">
              ביטול
            </button>
          </div>

          {initial && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-full bg-[#F8E3E0] px-4 py-2.5 text-sm font-bold text-[#A33B2E]"
            >
              מחיקת העצירה מהטיול 🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
