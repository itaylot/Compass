// מודל הנתונים של הטיול. הנתונים עצמם חיים ב-D1 (ראו lib/api/trip.functions.ts);
// כאן רק הטיפוסים, המטא-דאטה של קטגוריות/סטטוסים, ועזרי תצוגה.

export type Category =
  | "hotel"
  | "food"
  | "hike"
  | "view"
  | "charge"
  | "drive"
  | "activity";

export type Status = "planned" | "optional" | "done";

export interface TripItem {
  id: string;
  day: number;
  time: string; // HH:MM
  category: Category;
  name: string;
  shortDescription: string;
  location: string;
  lat: number;
  lng: number;
  durationMin: number;
  status: Status;
  notes: string;
  bookingUrl: string;
  tags: string[];
  // חניה צמודה (נקודה נפרדת מהאטרקציה)
  parkingName: string;
  parkingLat: number;
  parkingLng: number;
  // הזמנה מובנית
  bookingRef: string;
  phone: string;
  // קבוצת חלופות לינה (מזהה משותף לכל האופציות לאותו לילה)
  lodgingGroup: string;
}

export interface Reminder {
  id: string;
  day: number;
  text: string;
  done: boolean;
}

export interface TripSettings {
  title: string;
  subtitle: string;
  startDate: string; // YYYY-MM-DD
  numDays: number;
}

export const CATEGORIES: Record<
  Category,
  { label: string; icon: string; color: string }
> = {
  hotel: { label: "לינה", icon: "🏨", color: "#8E6FC1" },
  food: { label: "אוכל", icon: "🍽️", color: "#D97742" },
  hike: { label: "מסלול קצר", icon: "🥾", color: "#4E9A51" },
  view: { label: "תצפית", icon: "📍", color: "#2E7DA6" },
  charge: { label: "טעינת רכב", icon: "⚡", color: "#C9A227" },
  drive: { label: "נסיעה", icon: "🚗", color: "#6B7A8C" },
  activity: { label: "הזמנה / פעילות", icon: "🎟️", color: "#C25E8A" },
};

export const STATUS_META: Record<
  Status,
  { label: string; color: string; bg: string }
> = {
  planned: { label: "מתוכנן", color: "#17606A", bg: "#E3EEEF" },
  optional: { label: "אופציונלי", color: "#8A6D1F", bg: "#F5EDD6" },
  done: { label: "בוצע", color: "#3E7A41", bg: "#E2F0E3" },
};

// ניווט דרך Waze: קישור אוניברסלי שפותח את אפליקציית Waze בטלפון.
export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;
}

export function navigationUrl(item: Pick<TripItem, "lat" | "lng">): string {
  return wazeUrl(item.lat, item.lng);
}

// יעד חניה אם הוגדר, אחרת המיקום עצמו.
export function hasParking(item: TripItem): boolean {
  return item.parkingLat !== 0 || item.parkingLng !== 0;
}

export function parkingUrl(item: TripItem): string {
  return hasParking(item) ? wazeUrl(item.parkingLat, item.parkingLng) : navigationUrl(item);
}

// תאריך תצוגה (DD.MM) ליום נתון בטיול, נגזר מתאריך ההתחלה.
export function dayDateLabel(startDate: string, day: number): string {
  const d = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + (day - 1));
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

// תאריך ISO (YYYY-MM-DD) ליום נתון בטיול.
export function dayIso(startDate: string, day: number): string {
  const d = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return startDate;
  d.setDate(d.getDate() + (day - 1));
  return d.toISOString().slice(0, 10);
}

// ── אזור זמן Europe/Oslo ──
// "עכשיו" של הטיול תמיד לפי שעון נורווגיה, לא לפי המכשיר.
// שימוש ב-Intl כדי לא לגרור ספריית timezone.

export function osloNow(): { iso: string; minutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const iso = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { iso, minutes: parseInt(hour, 10) * 60 + parseInt(get("minute"), 10) };
}

// איזה יום בטיול היום (לפי שעון אוסלו). null אם מחוץ לטווח הטיול.
export function currentTripDay(settings: TripSettings): number | null {
  const { iso } = osloNow();
  for (let day = 1; day <= settings.numDays; day++) {
    if (dayIso(settings.startDate, day) === iso) return day;
  }
  return null;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}
