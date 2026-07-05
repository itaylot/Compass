// ייצוא הטיול לקובץ Excel (.xlsx). נטען דינמית (import()) רק כשלוחצים "ייצוא",
// כדי לא להכביד על טעינת האפליקציה. רץ כולו בצד לקוח — בלי שרת, בלי חשבון Google.
// exceljs תומך RTL (view.rightToLeft), שורות קפואות, סינון, רוחבי עמודות וצבעים.

import {
  CATEGORIES,
  STATUS_META,
  dayDateLabel,
  hasParking,
  type Reminder,
  type TripItem,
  type TripSettings,
} from "../data/trip-items";

function argb(hex: string): string {
  return "FF" + hex.replace("#", "").toUpperCase();
}

export async function exportTripToXlsx(
  settings: TripSettings,
  items: TripItem[],
  reminders: Reminder[],
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = settings.title;

  const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: argb("#17606A") } };
  const headerFont = { bold: true, color: { argb: argb("#FFFFFF") }, size: 11 };

  const styleHeader = (ws: import("exceljs").Worksheet, cols: number) => {
    const row = ws.getRow(1);
    row.font = headerFont;
    row.height = 22;
    for (let c = 1; c <= cols; c++) {
      row.getCell(c).fill = headerFill;
      row.getCell(c).alignment = { vertical: "middle", horizontal: "right", readingOrder: "rtl" };
    }
    ws.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }];
  };

  // ── גיליון 1: סקירת הטיול ──
  const overview = wb.addWorksheet("סקירת הטיול");
  overview.columns = [
    { header: "פרט", key: "k", width: 22 },
    { header: "ערך", key: "v", width: 50 },
  ];
  const chosen = items.filter((i) => i.category === "hotel" && i.status === "planned");
  overview.addRows([
    { k: "שם הטיול", v: settings.title },
    { k: "תיאור", v: settings.subtitle },
    { k: "תאריך התחלה", v: settings.startDate.split("-").reverse().join(".") },
    { k: "מספר ימים", v: settings.numDays },
    { k: "סה\"כ עצירות", v: items.length },
    { k: "לינות נבחרות", v: chosen.length },
    { k: "בוצעו", v: items.filter((i) => i.status === "done").length },
  ]);
  styleHeader(overview, 2);

  // סיכום יומי
  overview.addRow([]);
  const sumHeaderRow = overview.addRow(["יום", "תאריך / עצירות"]);
  sumHeaderRow.font = { bold: true };
  for (let day = 1; day <= settings.numDays; day++) {
    const dayItems = items.filter((i) => i.day === day).sort((a, b) => a.time.localeCompare(b.time));
    if (dayItems.length === 0) continue;
    const area = dayItems.find((i) => i.category !== "drive")?.location ?? "";
    overview.addRow([
      `יום ${day} · ${dayDateLabel(settings.startDate, day)}`,
      `${area}${area ? " · " : ""}${dayItems.length} עצירות: ${dayItems.map((i) => i.name).join(" ← ")}`,
    ]);
  }

  // ── גיליון 2: מסלול מלא ──
  const plan = wb.addWorksheet("מסלול מלא");
  plan.columns = [
    { header: "יום", key: "day", width: 6 },
    { header: "תאריך", key: "date", width: 9 },
    { header: "שעה", key: "time", width: 7 },
    { header: "קטגוריה", key: "cat", width: 12 },
    { header: "מקום", key: "name", width: 28 },
    { header: "אזור", key: "loc", width: 16 },
    { header: "משך (דק׳)", key: "dur", width: 10 },
    { header: "סטטוס", key: "status", width: 10 },
    { header: "חניה", key: "parking", width: 18 },
    { header: "תיאור", key: "desc", width: 32 },
    { header: "הערות", key: "notes", width: 32 },
    { header: "אישור", key: "ref", width: 14 },
    { header: "טלפון", key: "phone", width: 14 },
    { header: "ניווט (Waze)", key: "nav", width: 16 },
    { header: "הזמנה", key: "booking", width: 16 },
    { header: "תגיות", key: "tags", width: 20 },
  ];
  const sorted = [...items].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  for (const i of sorted) {
    const row = plan.addRow({
      day: i.day,
      date: dayDateLabel(settings.startDate, i.day),
      time: i.time,
      cat: `${CATEGORIES[i.category].icon} ${CATEGORIES[i.category].label}`,
      name: i.name,
      loc: i.location,
      dur: i.durationMin,
      status: STATUS_META[i.status].label,
      parking: hasParking(i) ? i.parkingName || "מוגדרת" : "",
      desc: i.shortDescription,
      notes: i.notes,
      ref: i.bookingRef,
      phone: i.phone,
      tags: i.tags.join(", "),
    });
    // צבע רקע עדין לפי קטגוריה בעמודת הקטגוריה
    row.getCell("cat").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: argb(CATEGORIES[i.category].color) },
    };
    row.getCell("cat").font = { color: { argb: argb("#FFFFFF") }, bold: true, size: 10 };
    // קישורים לחיצים
    const navUrl = `https://waze.com/ul?ll=${i.lat}%2C${i.lng}&navigate=yes`;
    row.getCell("nav").value = { text: "פתח ב-Waze", hyperlink: navUrl };
    row.getCell("nav").font = { color: { argb: argb("#2E7DA6") }, underline: true };
    if (i.bookingUrl) {
      row.getCell("booking").value = { text: "קישור", hyperlink: i.bookingUrl };
      row.getCell("booking").font = { color: { argb: argb("#2E7DA6") }, underline: true };
    }
    row.alignment = { vertical: "top", horizontal: "right", readingOrder: "rtl", wrapText: true };
  }
  styleHeader(plan, 16);
  plan.autoFilter = "A1:P1";

  // ── גיליון 3: לינות והזמנות ──
  const lodging = wb.addWorksheet("לינות והזמנות");
  lodging.columns = [
    { header: "יום", key: "day", width: 6 },
    { header: "תאריך", key: "date", width: 9 },
    { header: "לינה / הזמנה", key: "name", width: 28 },
    { header: "קבוצת חלופות", key: "group", width: 16 },
    { header: "סטטוס", key: "status", width: 12 },
    { header: "אזור / כתובת", key: "loc", width: 22 },
    { header: "מספר אישור", key: "ref", width: 16 },
    { header: "טלפון", key: "phone", width: 14 },
    { header: "קישור", key: "url", width: 16 },
    { header: "הערות", key: "notes", width: 32 },
  ];
  const bookingItems = items
    .filter((i) => i.category === "hotel" || i.bookingUrl || i.bookingRef)
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  for (const i of bookingItems) {
    const row = lodging.addRow({
      day: i.day,
      date: dayDateLabel(settings.startDate, i.day),
      name: `${CATEGORIES[i.category].icon} ${i.name}`,
      group: i.lodgingGroup,
      status: STATUS_META[i.status].label,
      loc: i.location,
      ref: i.bookingRef,
      phone: i.phone,
      notes: i.notes,
    });
    if (i.bookingUrl) {
      row.getCell("url").value = { text: "פתח", hyperlink: i.bookingUrl };
      row.getCell("url").font = { color: { argb: argb("#2E7DA6") }, underline: true };
    }
    row.alignment = { vertical: "top", horizontal: "right", readingOrder: "rtl", wrapText: true };
  }
  if (bookingItems.length === 0) lodging.addRow({ name: "אין עדיין לינות או הזמנות" });
  styleHeader(lodging, 10);
  lodging.autoFilter = "A1:J1";

  // ── גיליון 4: תזכורות ──
  const rem = wb.addWorksheet("תזכורות");
  rem.columns = [
    { header: "יום", key: "day", width: 6 },
    { header: "תזכורת", key: "text", width: 50 },
    { header: "בוצע", key: "done", width: 10 },
  ];
  for (const r of [...reminders].sort((a, b) => a.day - b.day)) {
    rem.addRow({ day: r.day, text: r.text, done: r.done ? "✓ בוצע" : "פתוח" });
  }
  if (reminders.length === 0) rem.addRow({ text: "אין תזכורות" });
  styleHeader(rem, 3);

  // ── הורדה ──
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = settings.title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40) || "trip";
  a.download = `${safeName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
