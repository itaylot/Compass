-- טבלאות הטיול. אדיטיבי בלבד: preview ו-production חולקים את אותו DB.
CREATE TABLE IF NOT EXISTS trip_items (
  id TEXT PRIMARY KEY,
  day INTEGER NOT NULL,
  time TEXT NOT NULL DEFAULT '09:00',
  category TEXT NOT NULL DEFAULT 'view',
  name TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  lat REAL NOT NULL DEFAULT 0,
  lng REAL NOT NULL DEFAULT 0,
  duration_min INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT NOT NULL DEFAULT '',
  booking_url TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trip_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL DEFAULT 'הטיול שלנו',
  subtitle TEXT NOT NULL DEFAULT 'הטיול המשפחתי שלנו',
  start_date TEXT NOT NULL DEFAULT '2026-07-12',
  num_days INTEGER NOT NULL DEFAULT 13
);

INSERT OR IGNORE INTO trip_settings (id) VALUES (1);
