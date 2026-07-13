-- שדות מידע נוספים לפעילות. אדיטיבי בלבד (preview+prod חולקים DB).
ALTER TABLE trip_items ADD COLUMN opening_hours TEXT NOT NULL DEFAULT '';
ALTER TABLE trip_items ADD COLUMN cost TEXT NOT NULL DEFAULT '';
ALTER TABLE trip_items ADD COLUMN info TEXT NOT NULL DEFAULT '';
