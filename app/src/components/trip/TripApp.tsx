import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  STATUS_META,
  currentTripDay,
  dayDateLabel,
  hasParking,
  navigationUrl,
  osloNow,
  parkingUrl,
  type Category,
  type Reminder,
  type Status,
  type TripItem,
  type TripSettings,
} from "../../data/trip-items";
import {
  chooseLodging,
  deleteItem,
  deleteReminder,
  restoreItem,
  saveItem,
  saveReminder,
  saveSettings,
  setItemStatus,
  toggleReminder,
} from "../../lib/api/trip.functions";
import { ForecastScreen } from "./ForecastScreen";
import { HelpSheet } from "./HelpSheet";
import { InfoScreen } from "./InfoScreen";
import { ItemForm, type ItemDraft } from "./ItemForm";
import { MapView } from "./MapView";
import { NextActionCard } from "./NextActionCard";
import { RemindersSheet } from "./RemindersSheet";
import { WeatherBadge } from "./WeatherBadge";

type Tab = "today" | "forecast" | "map" | "plan" | "info";
type DaySel = number | "all";
type Filter = Category | "optional" | "all";
type TripData = { settings: TripSettings; items: TripItem[]; reminders: Reminder[] };
type Toast = { msg: string; action?: { label: string; fn: () => void } };

const TRIP_KEY = ["trip"];

function fmtDuration(min: number): string {
  if (min === 60) return "שעה";
  if (min === 120) return "שעתיים";
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hs = h === 1 ? "שעה" : h === 2 ? "שעתיים" : `${h} שע׳`;
  return m > 0 ? `${hs} ו-${m} דק׳` : hs;
}

function sortChrono(a: TripItem, b: TripItem): number {
  return a.day - b.day || a.time.localeCompare(b.time);
}

async function getTripSafe(): Promise<TripData> {
  const { getTrip } = await import("../../lib/api/trip.functions");
  return getTrip();
}

export default function TripApp({ initialData }: { initialData?: TripData }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("today");
  const [day, setDay] = useState<DaySel>(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<TripItem | null | "new">(null);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [online, setOnline] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpedRef = useRef(false);

  // רישום Service Worker (לא בתוך iframe — מצב עורך העיצוב) + מעקב חיבור.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if ("serviceWorker" in navigator && window.top === window.self) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const tripQuery = useQuery({
    queryKey: TRIP_KEY,
    queryFn: () => getTripSafe(),
    staleTime: 15_000,
    initialData,
  });

  const settings: TripSettings = tripQuery.data?.settings ?? {
    title: "הטיול שלנו",
    subtitle: "",
    startDate: "2026-07-12",
    numDays: 13,
  };
  const items: TripItem[] = useMemo(() => tripQuery.data?.items ?? [], [tripQuery.data]);
  const reminders: Reminder[] = useMemo(() => tripQuery.data?.reminders ?? [], [tripQuery.data]);

  const todayNum = useMemo(() => currentTripDay(settings), [settings.startDate, settings.numDays]);

  // בפתיחה בימי הטיול — קפיצה אוטומטית ליום הנוכחי (פעם אחת).
  useEffect(() => {
    if (jumpedRef.current) return;
    if (todayNum) {
      setDay(todayNum);
      jumpedRef.current = true;
    }
  }, [todayNum]);

  // שמירת עותק מקומי לאופליין (גיבוי מעבר ל-HTML ששמור ב-SW).
  useEffect(() => {
    if (tripQuery.isSuccess && tripQuery.data) {
      try {
        localStorage.setItem("norway2026-cache", JSON.stringify({ at: Date.now(), data: tripQuery.data }));
      } catch {
        /* אין אחסון */
      }
    }
  }, [tripQuery.isSuccess, tripQuery.dataUpdatedAt]);

  const lastUpdatedLabel = useMemo(() => {
    const t = tripQuery.dataUpdatedAt;
    if (!t) return "";
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [tripQuery.dataUpdatedAt]);

  const showToast = (msg: string, action?: Toast["action"]) => {
    setToast({ msg, action });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), action ? 5000 : 2200);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: TRIP_KEY });

  const saveMutation = useMutation({
    mutationFn: (draft: ItemDraft) => saveItem({ data: draft }),
    onSuccess: async (_res, draft) => {
      await invalidate();
      setFormItem(null);
      setDetailId(null);
      showToast(draft.id ? "העצירה עודכנה לכולם ✓" : "העצירה נוספה לטיול ✓");
    },
    onError: () => showToast("השמירה נכשלה, בדקו חיבור ונסו שוב"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteItem({ data: { id } }),
    onSuccess: async (_res, id) => {
      await invalidate();
      setFormItem(null);
      setDetailId(null);
      setSelectedId(null);
      showToast("העצירה הוסרה", {
        label: "בטל",
        fn: async () => {
          await restoreItem({ data: { id } });
          await invalidate();
          showToast("שוחזר ✓");
        },
      });
    },
    onError: () => showToast("המחיקה נכשלה, נסו שוב"),
  });

  const statusMutation = useMutation({
    mutationFn: (item: TripItem) => {
      const next: Status = item.status === "done" ? "planned" : "done";
      return setItemStatus({ data: { id: item.id, status: next } });
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: TRIP_KEY });
      const prev = queryClient.getQueryData<TripData>(TRIP_KEY);
      queryClient.setQueryData<TripData>(TRIP_KEY, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((i) =>
                i.id === item.id ? { ...i, status: i.status === "done" ? "planned" : "done" } : i,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _item, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(TRIP_KEY, ctx.prev);
      showToast("העדכון נכשל, נסו שוב");
    },
    onSuccess: (_res, item) => {
      showToast(item.status === "done" ? "הסימון בוטל" : "סומן שבוצע ✓");
      void invalidate();
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (s: TripSettings) => saveSettings({ data: s }),
    onSuccess: async () => {
      await invalidate();
      showToast("הגדרות הטיול נשמרו ✓");
    },
    onError: () => showToast("השמירה נכשלה, נסו שוב"),
  });

  const lodgingMutation = useMutation({
    mutationFn: (v: { id: string; group: string }) => chooseLodging({ data: v }),
    onSuccess: async () => {
      await invalidate();
      showToast("הלינה נבחרה ✓");
    },
    onError: () => showToast("הבחירה נכשלה, נסו שוב"),
  });

  const reminderSaveMutation = useMutation({
    mutationFn: (v: { day: number; text: string }) =>
      saveReminder({ data: { day: v.day, text: v.text, done: false } }),
    onSuccess: () => invalidate(),
    onError: () => showToast("הוספת התזכורת נכשלה"),
  });

  const reminderToggleMutation = useMutation({
    mutationFn: (r: Reminder) => toggleReminder({ data: { id: r.id, done: !r.done } }),
    onMutate: async (r) => {
      await queryClient.cancelQueries({ queryKey: TRIP_KEY });
      const prev = queryClient.getQueryData<TripData>(TRIP_KEY);
      queryClient.setQueryData<TripData>(TRIP_KEY, (old) =>
        old ? { ...old, reminders: old.reminders.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)) } : old,
      );
      return { prev };
    },
    onError: (_e, _r, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(TRIP_KEY, ctx.prev);
    },
    onSuccess: () => invalidate(),
  });

  const reminderDeleteMutation = useMutation({
    mutationFn: (r: Reminder) => deleteReminder({ data: { id: r.id } }),
    onSuccess: () => invalidate(),
  });

  const matchesFilter = (item: TripItem): boolean => {
    if (filter === "all") return true;
    if (filter === "optional") return item.status === "optional";
    return item.category === filter;
  };

  const dayItems = useMemo(
    () =>
      items
        .filter((i) => (day === "all" ? true : i.day === day))
        .filter(matchesFilter)
        .sort(sortChrono),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, day, filter],
  );

  const dayReminders = useMemo(() => reminders.filter((r) => day !== "all" && r.day === day), [reminders, day]);
  const openReminderCount = dayReminders.filter((r) => !r.done).length;

  const selectFromMap = (id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };
  const focusOnMap = (id: string) => {
    setSelectedId(id);
    setTab("map");
  };
  const openInPlan = (id: string) => {
    setSelectedId(id);
    setTab("plan");
    requestAnimationFrame(() => {
      document.getElementById(`row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const detailItem = detailId ? (items.find((i) => i.id === detailId) ?? null) : null;
  const currentDayNum = day === "all" ? (todayNum ?? 1) : day;
  const isViewingCurrentDay = day !== "all" && day === todayNum;

  if (tripQuery.isLoading && !initialData) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--paper)] text-[var(--ink)]">
        <span className="animate-bounce text-4xl">🏔️</span>
        <p className="text-sm font-semibold text-[var(--muted)]">טוען את הטיול…</p>
      </div>
    );
  }

  return (
    <div className="trip-app mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[var(--paper)] text-[var(--ink)]">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold leading-tight text-[var(--brand)]">{settings.title}</h1>
          {settings.subtitle && <p className="truncate text-xs font-medium text-[var(--muted)]">{settings.subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHelpOpen(true)}
            aria-label="מדריך שימוש"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-base font-bold text-[var(--brand)] shadow-sm"
          >
            ?
          </button>
          <span className="text-3xl" aria-hidden>🏔️</span>
        </div>
      </header>

      {!online && (
        <div className="mx-4 mb-1 rounded-xl bg-[#FBF3E6] px-3 py-1.5 text-center text-[11px] font-bold text-[#8A6D1F]">
          אין חיבור כרגע — מוצג המידע השמור אצלכם
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col pb-20">
        {tab === "today" && (
          <TodayScreen
            settings={settings}
            day={day}
            setDay={setDay}
            items={dayItems}
            hasAnyItems={items.length > 0}
            selectedId={selectedId}
            todayNum={todayNum}
            isViewingCurrentDay={isViewingCurrentDay}
            openReminderCount={openReminderCount}
            onOpenReminders={() => setRemindersOpen(true)}
            onPinSelect={selectFromMap}
            onCardSelect={setSelectedId}
            toggleDone={(i) => statusMutation.mutate(i)}
            openDetail={setDetailId}
            openAdd={() => setFormItem("new")}
          />
        )}
        {tab === "forecast" && <ForecastScreen settings={settings} items={items} todayNum={todayNum} />}
        {tab === "map" && (
          <MapScreen
            settings={settings}
            day={day}
            setDay={setDay}
            filter={filter}
            setFilter={setFilter}
            items={dayItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            openInPlan={openInPlan}
          />
        )}
        {tab === "plan" && (
          <PlanScreen
            settings={settings}
            day={day}
            setDay={setDay}
            filter={filter}
            setFilter={setFilter}
            items={dayItems}
            selectedId={selectedId}
            openDetail={setDetailId}
            openAdd={() => setFormItem("new")}
            hasAnyItems={items.length > 0}
          />
        )}
        {tab === "info" && (
          <InfoScreen
            settings={settings}
            items={items}
            reminders={reminders}
            currentDay={currentDayNum}
            focusOnMap={focusOnMap}
            saveSettings={(s) => settingsMutation.mutate(s)}
            savingSettings={settingsMutation.isPending}
            chooseLodging={(id, group) => lodgingMutation.mutate({ id, group })}
            showToast={(m) => showToast(m)}
            lastUpdatedLabel={lastUpdatedLabel}
          />
        )}
      </main>

      {/* כפתור הוספה צף — זמין לכולם */}
      {(tab === "today" || tab === "plan") && items.length > 0 && (
        <button
          onClick={() => setFormItem("new")}
          aria-label="הוספת עצירה"
          className="fab-add fixed bottom-24 left-4 z-[1050] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-3xl font-bold text-white"
        >
          <span>+</span>
        </button>
      )}

      {helpOpen && <HelpSheet onClose={() => setHelpOpen(false)} />}

      {remindersOpen && day !== "all" && (
        <RemindersSheet
          day={day}
          reminders={dayReminders}
          onToggle={(r) => reminderToggleMutation.mutate(r)}
          onAdd={(d, text) => reminderSaveMutation.mutate({ day: d, text })}
          onDelete={(r) => reminderDeleteMutation.mutate(r)}
          onClose={() => setRemindersOpen(false)}
        />
      )}

      {detailItem && !formItem && (
        <DetailSheet
          item={detailItem}
          dateLabel={dayDateLabel(settings.startDate, detailItem.day)}
          close={() => setDetailId(null)}
          toggleDone={() => statusMutation.mutate(detailItem)}
          edit={() => setFormItem(detailItem)}
          focusOnMap={() => {
            setDetailId(null);
            focusOnMap(detailItem.id);
          }}
        />
      )}

      {formItem && (
        <ItemForm
          initial={formItem === "new" ? null : formItem}
          defaultDay={currentDayNum}
          numDays={settings.numDays}
          saving={saveMutation.isPending || deleteMutation.isPending}
          onSave={(draft) => saveMutation.mutate(draft)}
          onDelete={formItem !== "new" ? () => deleteMutation.mutate(formItem.id) : undefined}
          onClose={() => setFormItem(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[1200] flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast.msg}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.fn();
                setToast(null);
              }}
              className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-[1100] border-t border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-stretch justify-around pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5">
          {(
            [
              { id: "today", icon: "🏠", label: "היום" },
              { id: "forecast", icon: "🌤️", label: "תחזית" },
              { id: "map", icon: "🗺️", label: "מפה" },
              { id: "plan", icon: "📋", label: "תכנון" },
              { id: "info", icon: "ℹ️", label: "מידע" },
            ] as { id: Tab; icon: string; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex min-w-16 flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-[11px] font-semibold transition-colors ${
                tab === t.id ? "tab-active text-[var(--brand)]" : "text-[var(--muted)]"
              }`}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <span className={`text-xl leading-none ${tab === t.id ? "" : "grayscale opacity-70"}`}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ─────────── רכיבים משותפים ─────────── */

function DayChips(props: { settings: TripSettings; day: DaySel; setDay: (d: DaySel) => void; todayNum: number | null }) {
  const { settings, day, setDay, todayNum } = props;
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
      <button
        onClick={() => setDay("all")}
        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
          day === "all" ? "bg-[var(--brand)] text-white" : "bg-white text-[var(--ink)] shadow-sm"
        }`}
      >
        כל הטיול
      </button>
      {Array.from({ length: settings.numDays }, (_, i) => i + 1).map((d) => (
        <button
          key={d}
          onClick={() => setDay(d)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
            day === d ? "bg-[var(--brand)] text-white" : "bg-white text-[var(--ink)] shadow-sm"
          }`}
        >
          {d === todayNum ? "📍 " : ""}יום {d}
          <span className={`mr-1 font-medium ${day === d ? "text-white/80" : "text-[var(--muted)]"}`}>
            · {dayDateLabel(settings.startDate, d)}
          </span>
        </button>
      ))}
    </div>
  );
}

const FILTERS: { id: Filter; label: string; icon?: string }[] = [
  { id: "all", label: "הכל" },
  { id: "food", label: "אוכל", icon: "🍽️" },
  { id: "hotel", label: "לינה", icon: "🏨" },
  { id: "hike", label: "מסלולים", icon: "🥾" },
  { id: "view", label: "תצפיות", icon: "📍" },
  { id: "charge", label: "טעינה", icon: "⚡" },
  { id: "optional", label: "אופציונלי", icon: "✨" },
];

function FilterChips({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => setFilter(f.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            filter === f.id ? "bg-[var(--ink)] text-white" : "bg-white text-[var(--ink)] shadow-sm"
          }`}
        >
          {f.icon ? `${f.icon} ` : ""}
          {f.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: m.color, backgroundColor: m.bg }}>
      {m.label}
    </span>
  );
}

function EmptyTrip({ openAdd }: { openAdd: () => void }) {
  return (
    <div className="mx-4 mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-center shadow-sm">
      <span className="text-5xl">🧳</span>
      <h2 className="text-base font-extrabold">הטיול עוד ריק</h2>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        מוסיפים את העצירה הראשונה: מלון, מסעדה, תצפית או כל מקום אחר.
        <br />
        כל מה שמוסיפים כאן מופיע מיד אצל כל המשפחה.
      </p>
      <button
        onClick={openAdd}
        className="mt-1 rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white shadow-md"
      >
        + הוספת העצירה הראשונה
      </button>
    </div>
  );
}

function ItemActions(props: { item: TripItem; toggleDone: () => void; openDetail: () => void }) {
  const { item, toggleDone, openDetail } = props;
  const park = hasParking(item);
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <a
        href={park ? parkingUrl(item) : navigationUrl(item)}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="rounded-full border border-[var(--brand)] px-3 py-1 text-xs font-bold text-[var(--brand)]"
      >
        {park ? "חניה 🅿️" : "Waze 🚗"}
      </a>
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleDone();
        }}
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          item.status === "done" ? "bg-[#E2F0E3] text-[#3E7A41]" : "bg-[var(--brand)]/10 text-[var(--brand)]"
        }`}
      >
        {item.status === "done" ? "בוצע ✓" : "סמן שבוצע"}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          openDetail();
        }}
        className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-[var(--ink)]"
      >
        פרטים
      </button>
    </div>
  );
}

/* ─────────── מסך היום ─────────── */

function TodayScreen(props: {
  settings: TripSettings;
  day: DaySel;
  setDay: (d: DaySel) => void;
  items: TripItem[];
  hasAnyItems: boolean;
  selectedId: string | null;
  todayNum: number | null;
  isViewingCurrentDay: boolean;
  openReminderCount: number;
  onOpenReminders: () => void;
  onPinSelect: (id: string) => void;
  onCardSelect: (id: string) => void;
  toggleDone: (i: TripItem) => void;
  openDetail: (id: string) => void;
  openAdd: () => void;
}) {
  const {
    settings, day, setDay, items, hasAnyItems, selectedId, todayNum, isViewingCurrentDay,
    openReminderCount, onOpenReminders, onPinSelect, onCardSelect, toggleDone, openDetail, openAdd,
  } = props;

  const area = items.find((i) => i.category !== "drive")?.location || items[0]?.location || "";
  const stops = items.filter((i) => i.category !== "drive").length;
  const driveMin = items.filter((i) => i.category === "drive").reduce((s, i) => s + i.durationMin, 0);
  const charges = items.filter((i) => i.category === "charge").length;
  const centerItem = items.find((i) => i.lat !== 0) ?? null;

  if (!hasAnyItems) {
    return (
      <div className="flex flex-col">
        <EmptyTrip openAdd={openAdd} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <section className="mx-4 rounded-2xl bg-[var(--brand)] p-4 text-white shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold">
              {day === "all" ? "כל הטיול" : `יום ${day}${area ? ` · ${area}` : ""}`}
            </h2>
            <p className="text-xs text-white/80">
              {day === "all" ? `${settings.numDays} ימים` : dayDateLabel(settings.startDate, day)}
            </p>
          </div>
          {day !== "all" && centerItem && (
            <WeatherBadge lat={centerItem.lat} lng={centerItem.lng} date={dateForDay(settings, day)} />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/15 px-2.5 py-1">{stops} עצירות</span>
          {driveMin > 0 && <span className="rounded-full bg-white/15 px-2.5 py-1">🚗 {fmtDuration(driveMin)} נסיעה</span>}
          {charges > 0 && (
            <span className="rounded-full bg-white/15 px-2.5 py-1">
              ⚡ {charges === 1 ? "טעינה אחת" : `${charges} טעינות`}
            </span>
          )}
          {day !== "all" && (
            <button onClick={onOpenReminders} className="rounded-full bg-white/20 px-2.5 py-1 font-bold">
              📝 {openReminderCount > 0 ? `${openReminderCount} תזכורות` : "תזכורות"}
            </button>
          )}
        </div>
      </section>

      {day !== "all" && items.some((i) => i.status !== "done") && (
        <NextActionCard
          items={items}
          isCurrentDay={isViewingCurrentDay}
          nowMinutes={osloNow().minutes}
          onNavigate={() => {}}
          onDetail={openDetail}
        />
      )}

      <DayChips settings={settings} day={day} setDay={setDay} todayNum={todayNum} />

      {items.length > 0 && (
        <div className="mx-4 overflow-hidden rounded-2xl shadow-sm">
          <MapView items={items} selectedId={selectedId} onSelect={onPinSelect} className="h-44" mini />
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 py-4">
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-3xl">🌤️</span>
            <p className="text-sm text-[var(--muted)]">{day === "all" ? "אין עצירות מתאימות לסינון." : "היום הזה עוד ריק."}</p>
            <button onClick={openAdd} className="rounded-full bg-[var(--brand)]/10 px-4 py-2 text-xs font-bold text-[var(--brand)]">
              + הוספת עצירה ליום הזה
            </button>
          </div>
        )}
        {items.map((item, idx) => {
          const cat = CATEGORIES[item.category];
          const sel = item.id === selectedId;
          const isFirst = idx === 0;
          const isLast = idx === items.length - 1;
          const showEnds = day !== "all";
          return (
            <article
              key={item.id}
              id={`card-${item.id}`}
              onClick={() => onCardSelect(item.id)}
              className={`flex gap-3 rounded-2xl bg-white p-3 shadow-sm transition-all ${
                sel ? "ring-2 ring-[var(--brand)]" : ""
              } ${item.status === "optional" ? "border border-dashed border-[#C9A227]/60" : ""} ${
                item.status === "done" ? "opacity-70" : ""
              }`}
            >
              <div className="flex w-12 shrink-0 flex-col items-center gap-1">
                <time className="text-xs font-bold text-[var(--muted)]">{item.time}</time>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{ backgroundColor: `${cat.color}22`, border: `2px solid ${cat.color}` }}
                >
                  {cat.icon}
                </span>
                {/* שביל מקווקו מתפתל (סללום) ליעד הבא — תחושת מפת אוצר */}
                {!isLast && (
                  <svg aria-hidden viewBox="0 0 24 120" preserveAspectRatio="none" className="mt-1 w-6 flex-1">
                    <path
                      d="M12,0 Q22,12 12,24 Q2,36 12,48 Q22,60 12,72 Q2,84 12,96 Q22,108 12,120"
                      fill="none"
                      stroke="rgba(36,49,58,0.28)"
                      strokeWidth="2"
                      strokeDasharray="2 5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {showEnds && isFirst && (
                  <span className="mb-1 inline-block rounded-full bg-[var(--brand)] px-2 py-0.5 text-[9px] font-extrabold text-white">
                    🚩 יציאה
                  </span>
                )}
                {showEnds && isLast && !isFirst && (
                  <span className="mb-1 inline-block rounded-full bg-[var(--ink)] px-2 py-0.5 text-[9px] font-extrabold text-white">
                    🏁 סוף היום
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-bold leading-snug ${item.status === "done" ? "line-through" : ""}`}>
                    {item.name}
                  </h3>
                  <StatusBadge status={item.status} />
                </div>
                {item.shortDescription && (
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{item.shortDescription}</p>
                )}
                <div className="mt-1 text-[11px] font-medium text-[var(--muted)]">
                  {cat.label} · {fmtDuration(item.durationMin)}
                  {item.location ? ` · ${item.location}` : ""}
                  {hasParking(item) ? " · 🅿️ חניה" : ""}
                </div>
                <ItemActions item={item} toggleDone={() => toggleDone(item)} openDetail={() => openDetail(item.id)} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function dateForDay(settings: TripSettings, day: number): string {
  const d = new Date(`${settings.startDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return settings.startDate;
  d.setDate(d.getDate() + (day - 1));
  return d.toISOString().slice(0, 10);
}

/* ─────────── מסך מפה ─────────── */

function MapScreen(props: {
  settings: TripSettings;
  day: DaySel;
  setDay: (d: DaySel) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  items: TripItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  openInPlan: (id: string) => void;
}) {
  const { settings, day, setDay, filter, setFilter, items, selectedId, onSelect, openInPlan } = props;
  const selected = selectedId ? (items.find((i) => i.id === selectedId) ?? null) : null;
  const todayNum = currentTripDay(settings);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FilterChips filter={filter} setFilter={setFilter} />
      <DayChips settings={settings} day={day} setDay={setDay} todayNum={todayNum} />
      <div className="relative mx-4 mb-2 min-h-0 flex-1 overflow-hidden rounded-2xl shadow-sm">
        <MapView items={items} selectedId={selectedId} onSelect={onSelect} className="h-full min-h-72" />
        {items.length === 0 && (
          <div className="pointer-events-none absolute inset-x-4 top-4 z-[1000] rounded-2xl bg-white/90 p-3 text-center text-xs font-semibold text-[var(--muted)] shadow">
            אין עצירות להצגה ליום ולסינון שנבחרו
          </div>
        )}
        {selected && (
          <div className="absolute inset-x-2 bottom-2 z-[1000] rounded-2xl bg-white p-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold">
                  {CATEGORIES[selected.category].icon} {selected.name}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {CATEGORIES[selected.category].label} · יום {selected.day} · {selected.time} ·{" "}
                  {fmtDuration(selected.durationMin)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={selected.status} />
                <button
                  onClick={() => onSelect("")}
                  aria-label="סגירה"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => openInPlan(selected.id)}
                className="flex-1 rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-bold text-white"
              >
                פתח בתכנון 📋
              </button>
              {hasParking(selected) && (
                <a
                  href={parkingUrl(selected)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-full border border-[var(--brand)] px-3 py-1.5 text-center text-xs font-bold text-[var(--brand)]"
                >
                  חניה 🅿️
                </a>
              )}
              <a
                href={navigationUrl(selected)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-full border border-[var(--brand)] px-3 py-1.5 text-center text-xs font-bold text-[var(--brand)]"
              >
                Waze 🚗
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── מסך תכנון ─────────── */

function PlanScreen(props: {
  settings: TripSettings;
  day: DaySel;
  setDay: (d: DaySel) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  items: TripItem[];
  selectedId: string | null;
  openDetail: (id: string) => void;
  openAdd: () => void;
  hasAnyItems: boolean;
}) {
  const { settings, day, setDay, filter, setFilter, items, selectedId, openDetail, openAdd, hasAnyItems } = props;
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [sortBy, setSortBy] = useState<"time" | "category" | "status">("time");
  const todayNum = currentTripDay(settings);

  const rows = useMemo(() => {
    const filtered = items.filter((i) => (statusFilter === "all" ? true : i.status === statusFilter));
    const arr = [...filtered];
    if (sortBy === "category") arr.sort((a, b) => a.category.localeCompare(b.category) || sortChrono(a, b));
    else if (sortBy === "status") arr.sort((a, b) => a.status.localeCompare(b.status) || sortChrono(a, b));
    else arr.sort(sortChrono);
    return arr;
  }, [items, statusFilter, sortBy]);

  if (!hasAnyItems) {
    return (
      <div className="flex flex-col">
        <EmptyTrip openAdd={openAdd} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <FilterChips filter={filter} setFilter={setFilter} />
      <DayChips settings={settings} day={day} setDay={setDay} todayNum={todayNum} />

      <div className="flex items-center gap-2 px-4 py-2 text-xs">
        <label className="flex items-center gap-1 font-semibold text-[var(--muted)]">
          סטטוס
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
            className="rounded-lg border border-black/10 bg-white px-2 py-1 font-bold text-[var(--ink)]"
          >
            <option value="all">הכל</option>
            <option value="planned">מתוכנן</option>
            <option value="optional">אופציונלי</option>
            <option value="done">בוצע</option>
          </select>
        </label>
        <label className="flex items-center gap-1 font-semibold text-[var(--muted)]">
          מיון
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "time" | "category" | "status")}
            className="rounded-lg border border-black/10 bg-white px-2 py-1 font-bold text-[var(--ink)]"
          >
            <option value="time">יום ושעה</option>
            <option value="category">קטגוריה</option>
            <option value="status">סטטוס</option>
          </select>
        </label>
      </div>

      <div className="mx-4 mb-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-right text-xs">
          <thead>
            <tr className="border-b border-black/5 text-[11px] font-bold text-[var(--muted)]">
              <th className="px-3 py-2.5">יום</th>
              <th className="px-2 py-2.5">שעה</th>
              <th className="px-2 py-2.5">קטגוריה</th>
              <th className="px-2 py-2.5">מקום</th>
              <th className="px-2 py-2.5">משך</th>
              <th className="px-2 py-2.5">אזור</th>
              <th className="px-2 py-2.5">סטטוס</th>
              <th className="px-3 py-2.5">הערה</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[var(--muted)]">
                  אין שורות מתאימות לסינון.
                </td>
              </tr>
            )}
            {rows.map((item) => (
              <tr
                key={item.id}
                id={`row-${item.id}`}
                onClick={() => openDetail(item.id)}
                className={`cursor-pointer border-b border-black/5 last:border-0 ${
                  item.id === selectedId ? "bg-[var(--brand)]/10" : "odd:bg-black/[0.015]"
                }`}
              >
                <td className="px-3 py-2.5 font-bold">{item.day}</td>
                <td className="px-2 py-2.5">{item.time}</td>
                <td className="whitespace-nowrap px-2 py-2.5">
                  {CATEGORIES[item.category].icon} {CATEGORIES[item.category].label}
                </td>
                <td className="max-w-44 truncate px-2 py-2.5 font-semibold">{item.name}</td>
                <td className="whitespace-nowrap px-2 py-2.5">{fmtDuration(item.durationMin)}</td>
                <td className="whitespace-nowrap px-2 py-2.5">{item.location}</td>
                <td className="px-2 py-2.5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="max-w-52 truncate px-3 py-2.5 text-[var(--muted)]">{item.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────── חלונית פרטים ─────────── */

function DetailSheet(props: {
  item: TripItem;
  dateLabel: string;
  close: () => void;
  toggleDone: () => void;
  edit: () => void;
  focusOnMap: () => void;
}) {
  const { item, dateLabel, close, toggleDone, edit, focusOnMap } = props;
  const cat = CATEGORIES[item.category];
  const park = hasParking(item);
  return (
    <div className="fixed inset-0 z-[1150] flex items-end justify-center bg-black/40" onClick={close}>
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold leading-snug">
              {cat.icon} {item.name}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              יום {item.day} · {dateLabel} · {item.time} · {fmtDuration(item.durationMin)}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>
        {item.shortDescription && <p className="mt-3 text-sm leading-relaxed">{item.shortDescription}</p>}

        {(item.bookingRef || item.phone) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.bookingRef && (
              <span className="rounded-lg bg-[var(--paper)] px-3 py-1.5 text-xs font-bold">אישור: {item.bookingRef}</span>
            )}
            {item.phone && (
              <a
                href={`tel:${item.phone.replace(/[^+\d]/g, "")}`}
                className="rounded-lg bg-[var(--paper)] px-3 py-1.5 text-xs font-bold text-[var(--brand)]"
                dir="ltr"
              >
                ☎️ {item.phone}
              </a>
            )}
          </div>
        )}

        {park && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[var(--paper)] px-3 py-2">
            <span className="text-xs font-bold">🅿️ {item.parkingName || "חניה מומלצת"}</span>
            <a
              href={parkingUrl(item)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[var(--brand)] px-3 py-1 text-[11px] font-bold text-white"
            >
              נווט לחניה
            </a>
          </div>
        )}

        {item.notes && (
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[var(--paper)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
            📝 {item.notes}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                #{t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <a
              href={navigationUrl(item)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-full bg-[var(--brand)] px-4 py-2.5 text-center text-sm font-bold text-white"
            >
              ניווט ליעד 🚗
            </a>
            <button
              onClick={focusOnMap}
              className="flex-1 rounded-full border border-[var(--brand)] px-4 py-2.5 text-sm font-bold text-[var(--brand)]"
            >
              הצג במפה 🗺️
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleDone}
              className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold ${
                item.status === "done" ? "bg-[#E2F0E3] text-[#3E7A41]" : "bg-black/5 text-[var(--ink)]"
              }`}
            >
              {item.status === "done" ? "בוצע ✓ (לביטול)" : "סמן שבוצע"}
            </button>
            <button onClick={edit} className="flex-1 rounded-full bg-black/5 px-4 py-2.5 text-sm font-bold">
              עריכה ✏️
            </button>
            {item.bookingUrl && (
              <a
                href={item.bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-full bg-black/5 px-4 py-2.5 text-center text-sm font-bold"
              >
                🎟️ אתר
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
