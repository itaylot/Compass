import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ─── סכמות ───

const categoryEnum = z.enum(["hotel", "food", "hike", "view", "charge", "drive", "activity"]);
const statusEnum = z.enum(["planned", "optional", "done"]);

const itemInput = z.object({
  id: z.string().optional(),
  day: z.number().int().min(1).max(60),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  category: categoryEnum,
  name: z.string().min(1).max(200),
  shortDescription: z.string().max(500).default(""),
  location: z.string().max(200).default(""),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  durationMin: z.number().int().min(0).max(24 * 60),
  status: statusEnum,
  notes: z.string().max(1000).default(""),
  bookingUrl: z.string().max(500).default(""),
  tags: z.array(z.string().max(40)).max(20).default([]),
  // חניה צמודה
  parkingName: z.string().max(200).default(""),
  parkingLat: z.number().min(-90).max(90).default(0),
  parkingLng: z.number().min(-180).max(180).default(0),
  // הזמנה מובנית
  bookingRef: z.string().max(120).default(""),
  phone: z.string().max(60).default(""),
  // קבוצת חלופות לינה
  lodgingGroup: z.string().max(80).default(""),
});

const settingsInput = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().max(120).default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numDays: z.number().int().min(1).max(60),
});

const reminderInput = z.object({
  id: z.string().optional(),
  day: z.number().int().min(1).max(60),
  text: z.string().min(1).max(200),
  done: z.boolean().default(false),
});

export type TripItemDto = z.infer<typeof itemInput> & { id: string };
export type TripSettingsDto = z.infer<typeof settingsInput>;
export type ReminderDto = z.infer<typeof reminderInput> & { id: string };

// ─── גישה ל-DB ───
// בענן: D1 דרך cloudflare:workers. בפיתוח מקומי (vite dev על Node) המודול
// cloudflare:workers לא קיים, לכן import דינמי + fallback בזיכרון.
// ponytail: dev fallback בזיכרון, מתאפס בכל הפעלת שרת — מספיק לבדיקות מקומיות.

type D1Like = {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      run(): Promise<unknown>;
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
    };
    all<T>(): Promise<{ results: T[] }>;
    first<T>(): Promise<T | null>;
    run(): Promise<unknown>;
  };
};

async function getDB(): Promise<D1Like | null> {
  try {
    const mod = await import("../bindings.server");
    return (mod.bindings().DB as unknown as D1Like) ?? null;
  } catch {
    return null;
  }
}

const DEV_KEY = "dev";
const devStore: { settings: TripSettingsDto; items: TripItemDto[]; reminders: ReminderDto[] } = {
  settings: { title: "הטיול שלנו", subtitle: "הטיול המשפחתי שלנו", startDate: "2026-07-12", numDays: 13 },
  items: [],
  reminders: [],
};

// אימות מפתח ניהול. בענן: משווה למפתח השמור. בפיתוח (אין DB): מאשר תמיד.
async function assertAdmin(db: D1Like | null, key: string): Promise<void> {
  if (!db) return; // dev fallback
  const row = await db.prepare("SELECT edit_key FROM trip_settings WHERE id = 1").first<{ edit_key: string }>();
  const stored = row?.edit_key ?? "";
  if (!stored || key !== stored) {
    throw new Error("unauthorized: מפתח ניהול שגוי");
  }
}

type ItemRow = {
  id: string;
  day: number;
  time: string;
  category: string;
  name: string;
  short_description: string;
  location: string;
  lat: number;
  lng: number;
  duration_min: number;
  status: string;
  notes: string;
  booking_url: string;
  tags: string;
  parking_name: string;
  parking_lat: number;
  parking_lng: number;
  booking_ref: string;
  phone: string;
  lodging_group: string;
};

function rowToDto(r: ItemRow): TripItemDto {
  let tags: string[] = [];
  try {
    tags = JSON.parse(r.tags) as string[];
  } catch {
    tags = [];
  }
  return {
    id: r.id,
    day: r.day,
    time: r.time,
    category: r.category as TripItemDto["category"],
    name: r.name,
    shortDescription: r.short_description,
    location: r.location,
    lat: r.lat,
    lng: r.lng,
    durationMin: r.duration_min,
    status: r.status as TripItemDto["status"],
    notes: r.notes,
    bookingUrl: r.booking_url,
    tags,
    parkingName: r.parking_name ?? "",
    parkingLat: r.parking_lat ?? 0,
    parkingLng: r.parking_lng ?? 0,
    bookingRef: r.booking_ref ?? "",
    phone: r.phone ?? "",
    lodgingGroup: r.lodging_group ?? "",
  };
}

// ─── קריאה ───

export const getTrip = createServerFn({ method: "POST" }).handler(async () => {
  const db = await getDB();
  if (!db) {
    return {
      settings: devStore.settings,
      items: devStore.items,
      reminders: devStore.reminders,
    };
  }

  const settingsRow = await db
    .prepare("SELECT title, subtitle, start_date, num_days FROM trip_settings WHERE id = 1")
    .first<{ title: string; subtitle: string; start_date: string; num_days: number }>();
  const items = await db
    .prepare("SELECT * FROM trip_items WHERE deleted_at = '' ORDER BY day, time")
    .all<ItemRow>();
  const reminders = await db
    .prepare("SELECT id, day, text, done FROM reminders ORDER BY day, sort, created_at")
    .all<{ id: string; day: number; text: string; done: number }>();

  return {
    settings: {
      title: settingsRow?.title ?? "הטיול שלנו",
      subtitle: settingsRow?.subtitle ?? "",
      startDate: settingsRow?.start_date ?? "2026-07-12",
      numDays: settingsRow?.num_days ?? 13,
    } satisfies TripSettingsDto,
    items: items.results.map(rowToDto),
    reminders: reminders.results.map((r) => ({
      id: r.id,
      day: r.day,
      text: r.text,
      done: r.done === 1,
    })) satisfies ReminderDto[],
  };
});

// בדיקת מפתח ניהול (למסך "מצב ניהול"). מחזיר האם המפתח תקף.
export const checkAdmin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ key: z.string() }))
  .handler(async ({ data }) => {
    const db = await getDB();
    if (!db) return { ok: data.key.length > 0 || data.key === DEV_KEY };
    const row = await db.prepare("SELECT edit_key FROM trip_settings WHERE id = 1").first<{ edit_key: string }>();
    const stored = row?.edit_key ?? "";
    return { ok: stored.length > 0 && data.key === stored };
  });

// ─── כתיבת פריטים (דורש מפתח ניהול) ───

export const saveItem = createServerFn({ method: "POST" })
  .inputValidator(z.object({ key: z.string(), item: itemInput }))
  .handler(async ({ data }) => {
    const { key, item } = data;
    const id = item.id ?? crypto.randomUUID();
    const db = await getDB();
    await assertAdmin(db, key);
    if (!db) {
      const dto: TripItemDto = { ...item, id };
      const idx = devStore.items.findIndex((i) => i.id === id);
      if (idx >= 0) devStore.items[idx] = dto;
      else devStore.items.push(dto);
      return { id };
    }
    await db
      .prepare(
        `INSERT INTO trip_items
           (id, day, time, category, name, short_description, location, lat, lng, duration_min,
            status, notes, booking_url, tags, parking_name, parking_lat, parking_lng,
            booking_ref, phone, lodging_group, deleted_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           day = excluded.day, time = excluded.time, category = excluded.category,
           name = excluded.name, short_description = excluded.short_description,
           location = excluded.location, lat = excluded.lat, lng = excluded.lng,
           duration_min = excluded.duration_min, status = excluded.status,
           notes = excluded.notes, booking_url = excluded.booking_url, tags = excluded.tags,
           parking_name = excluded.parking_name, parking_lat = excluded.parking_lat,
           parking_lng = excluded.parking_lng, booking_ref = excluded.booking_ref,
           phone = excluded.phone, lodging_group = excluded.lodging_group,
           updated_at = datetime('now')`,
      )
      .bind(
        id,
        item.day,
        item.time,
        item.category,
        item.name,
        item.shortDescription,
        item.location,
        item.lat,
        item.lng,
        item.durationMin,
        item.status,
        item.notes,
        item.bookingUrl,
        JSON.stringify(item.tags),
        item.parkingName,
        item.parkingLat,
        item.parkingLng,
        item.bookingRef,
        item.phone,
        item.lodgingGroup,
      )
      .run();
    return { id };
  });

// סימון סטטוס בלבד — פעולת שטח יומיומית, מותרת גם במצב צפייה (בלי מפתח ניהול).
// לא נוגע בשום שדה אחר, רק status. עריכה/מחיקה מלאה עדיין דורשת ניהול.
export const setItemStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), status: statusEnum }))
  .handler(async ({ data }) => {
    const db = await getDB();
    if (!db) {
      devStore.items = devStore.items.map((i) => (i.id === data.id ? { ...i, status: data.status } : i));
      return { ok: true };
    }
    await db
      .prepare("UPDATE trip_items SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(data.status, data.id)
      .run();
    return { ok: true };
  });

// מחיקה רכה: מסמנת deleted_at, ניתן לשחזר
export const deleteItem = createServerFn({ method: "POST" })
  .inputValidator(z.object({ key: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    const db = await getDB();
    await assertAdmin(db, data.key);
    if (!db) {
      devStore.items = devStore.items.filter((i) => i.id !== data.id);
      return { ok: true };
    }
    await db
      .prepare("UPDATE trip_items SET deleted_at = datetime('now') WHERE id = ?")
      .bind(data.id)
      .run();
    return { ok: true };
  });

export const restoreItem = createServerFn({ method: "POST" })
  .inputValidator(z.object({ key: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    const db = await getDB();
    await assertAdmin(db, data.key);
    if (!db) return { ok: true };
    await db.prepare("UPDATE trip_items SET deleted_at = '' WHERE id = ?").bind(data.id).run();
    return { ok: true };
  });

// בחירת חלופת לינה: הופך אחת ל-planned, שאר הקבוצה ל-optional
export const chooseLodging = createServerFn({ method: "POST" })
  .inputValidator(z.object({ key: z.string(), id: z.string(), group: z.string() }))
  .handler(async ({ data }) => {
    const db = await getDB();
    await assertAdmin(db, data.key);
    if (!db) {
      devStore.items = devStore.items.map((i) =>
        i.lodgingGroup && i.lodgingGroup === data.group
          ? { ...i, status: i.id === data.id ? "planned" : "optional" }
          : i,
      );
      return { ok: true };
    }
    await db
      .prepare("UPDATE trip_items SET status = 'optional' WHERE lodging_group = ? AND lodging_group != ''")
      .bind(data.group)
      .run();
    await db.prepare("UPDATE trip_items SET status = 'planned' WHERE id = ?").bind(data.id).run();
    return { ok: true };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator(z.object({ key: z.string(), settings: settingsInput }))
  .handler(async ({ data }) => {
    const db = await getDB();
    await assertAdmin(db, data.key);
    if (!db) {
      devStore.settings = data.settings;
      return { ok: true };
    }
    await db
      .prepare(
        `INSERT INTO trip_settings (id, title, subtitle, start_date, num_days)
         VALUES (1, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title, subtitle = excluded.subtitle,
           start_date = excluded.start_date, num_days = excluded.num_days`,
      )
      .bind(data.settings.title, data.settings.subtitle, data.settings.startDate, data.settings.numDays)
      .run();
    return { ok: true };
  });

// ─── תזכורות יומיות ───
// סימון "בוצע" בתזכורת אינו דורש מפתח ניהול (זו פעולת שטח יומיומית של המשפחה);
// הוספה/מחיקה/עריכת טקסט כן דורשות ניהול.

export const saveReminder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ key: z.string(), reminder: reminderInput }))
  .handler(async ({ data }) => {
    const { key, reminder } = data;
    const id = reminder.id ?? crypto.randomUUID();
    const db = await getDB();
    await assertAdmin(db, key);
    if (!db) {
      const idx = devStore.reminders.findIndex((r) => r.id === id);
      const dto: ReminderDto = { ...reminder, id };
      if (idx >= 0) devStore.reminders[idx] = dto;
      else devStore.reminders.push(dto);
      return { id };
    }
    await db
      .prepare(
        `INSERT INTO reminders (id, day, text, done, sort)
         VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM reminders))
         ON CONFLICT(id) DO UPDATE SET day = excluded.day, text = excluded.text, done = excluded.done`,
      )
      .bind(id, reminder.day, reminder.text, reminder.done ? 1 : 0)
      .run();
    return { id };
  });

// סימון תזכורת בוצעה/לא — פעולת שטח, ללא מפתח
export const toggleReminder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), done: z.boolean() }))
  .handler(async ({ data }) => {
    const db = await getDB();
    if (!db) {
      devStore.reminders = devStore.reminders.map((r) => (r.id === data.id ? { ...r, done: data.done } : r));
      return { ok: true };
    }
    await db.prepare("UPDATE reminders SET done = ? WHERE id = ?").bind(data.done ? 1 : 0, data.id).run();
    return { ok: true };
  });

export const deleteReminder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ key: z.string(), id: z.string() }))
  .handler(async ({ data }) => {
    const db = await getDB();
    await assertAdmin(db, data.key);
    if (!db) {
      devStore.reminders = devStore.reminders.filter((r) => r.id !== data.id);
      return { ok: true };
    }
    await db.prepare("DELETE FROM reminders WHERE id = ?").bind(data.id).run();
    return { ok: true };
  });
