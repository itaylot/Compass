-- שלב 1: הרחבת מודל הטיול. אדיטיבי בלבד — preview ו-production חולקים DB אחד.
-- SQLite לא תומך ב-ADD COLUMN IF NOT EXISTS, אבל ADD COLUMN על עמודה קיימת
-- נכשל בשקט מבחינת ה-runner (המיגרציה מיושמת פעם אחת), לכן זה בטוח.

-- חניה צמודה לכל יעד (נקודה נפרדת מהאטרקציה)
ALTER TABLE trip_items ADD COLUMN parking_name TEXT NOT NULL DEFAULT '';
ALTER TABLE trip_items ADD COLUMN parking_lat REAL NOT NULL DEFAULT 0;
ALTER TABLE trip_items ADD COLUMN parking_lng REAL NOT NULL DEFAULT 0;

-- הזמנות כמידע מובנה
ALTER TABLE trip_items ADD COLUMN booking_ref TEXT NOT NULL DEFAULT '';
ALTER TABLE trip_items ADD COLUMN phone TEXT NOT NULL DEFAULT '';

-- השוואת חלופות לינה: קבוצת חלופות לאותו לילה
ALTER TABLE trip_items ADD COLUMN lodging_group TEXT NOT NULL DEFAULT '';

-- soft delete: זמן מחיקה (ריק = פעיל)
ALTER TABLE trip_items ADD COLUMN deleted_at TEXT NOT NULL DEFAULT '';

-- מפתח ניהול סודי (נשמר בצד שרת בלבד, לא נשלח לדפדפן של צופה).
-- לפריסה חדשה: החליפו את הערך למחרוזת אקראית משלכם *לפני* הפריסה הראשונה,
-- או הריצו UPDATE ידני מול D1. אל תשאירו את ערך ברירת המחדל בריפו ציבורי —
-- מי שיודע את המפתח יכול לערוך את הטיול. (בפריסה הקיימת המפתח כבר הוגדר ב-D1.)
ALTER TABLE trip_settings ADD COLUMN edit_key TEXT NOT NULL DEFAULT '';
UPDATE trip_settings SET edit_key = 'CHANGE-ME-before-first-deploy' WHERE id = 1 AND edit_key = '';

-- תזכורות יומיות (ישות נפרדת: תזכורת שייכת ליום, לא לפריט מסלול)
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  day INTEGER NOT NULL,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
