# תוכנית מימוש — טאב "מעבדת תכנון" (Planning Lab)

> **סטטוס:** מאושר על ידי איתי, ההחלטות נעולות. ממתין להוראת "צא לדרך" כדי לבצע.
> נשמר לפני שנגמרו הטוקנים בחלון הנוכחי, כדי שאפשר יהיה לבצע בסשן הבא.

## איך להתחיל בסשן חדש (cold start)
1. הקוד לא נמצא מקומית (תיקיית scratchpad זמנית נמחקת). לשכפל מחדש את repo של
   Higgsfield דרך MCP: `select_workspace` (workspace `92700df8-8f88-46fc-b8f2-ffb70bba440f`)
   → `website_repo_access` (website_id `a0909444-01f7-4e76-b8f4-5ebdb56e049e`) → clone.
   הקובץ הזה יהיה שם תחת `docs/planning-lab-plan.md`.
2. עותק ציבורי גם ב-GitHub: https://github.com/itaylot/Compass
3. פרטי פרויקט מלאים בזיכרון: `project-norway-trip-app`.

## ההחלטות שנעולות
- **מאגר המלצות סטטי בקוד** (לא טבלת D1) — הכי פשוט להרחבה, מתאים לטיול חד-פעמי.
- **בונה יום-אחר-יום** עם רצועת הקשר "אתמול / היום / מחר" (בקשת המשתמש).
- **הוספת המלצה יוצרת `trip_item` בסטטוס "אופציונלי"**; חלופות לינה לאותו לילה
  חולקות `lodgingGroup`, והמנגנון הקיים "בחר" מקדם אחת ל-מתוכנן. **אין מודל חדש.**
- **רספונסיבי** — מותאם קודם למסך רחב, במובייל טור אחד, בלי לחסום.
- **טאב שישי** — לצמצם רוחב/פונט בניווט התחתון כדי שייכנס.

## מודל הנתונים
קובץ חדש: `app/src/data/recommendations.ts`
```ts
export type RecArea = "אוסלו" | "פלום ואאורלנד" | "ברגן" | "איידפיורד והרדנגר" | "בדרך" ;
export interface Recommendation {
  id: string;
  area: RecArea;
  category: Category;          // מ-trip-items.ts (hotel/food/hike/view/charge/drive/activity)
  name: string;
  shortDescription: string;
  why: string;                // "למה מומלץ" — משפט אחד
  lat: number; lng: number;
  bookingUrl: string;
  rating?: number;            // למשל 8.7 (Booking)
  priceLevel?: 1 | 2 | 3;     // $ $$ $$$
  tags: string[];             // ספא, בריכה, גשום, משפחתי, חובה, נוף
  suggestedDay?: number;      // אופציונלי
  imageUrl?: string;          // אופציונלי
}
export const REC_AREAS: RecArea[] = [...];
export const recommendations: Recommendation[] = [ /* דאטה ריאליסטי, כמה אופציות לכל אזור/קטגוריה */ ];
```
זרע התחלתי אמיתי לנורווגיה: לכל אזור 2–4 מלונות (חלקם 8.5+ עם ספא/בריכה),
2–3 מסעדות, 2–3 מסלולים/תצפיות, עמדות טעינה, ואטרקציות ליום גשום.

## חיבור למסלול (בלי מיגרציה, בלי טבלה חדשה)
- ממירים `Recommendation` ל-`ItemDraft` ("hydrate"): `name, category, shortDescription,
  location=area, lat, lng, bookingUrl, tags` + ברירות מחדל: `time="10:00"`,
  `durationMin` לפי קטגוריה (מלון 30, אוכל 90, מסלול 90, תצפית 45...),
  `status="optional"`, `day=<היום הנבחר>`, ולמלונות `lodgingGroup="lodge-day{N}"`
  כדי שכל חלופות הלינה לאותו לילה יתקבצו.
- שומרים דרך `saveItem` הקיים (`lib/api/trip.functions.ts`). מחיקה דרך `deleteItem`,
  בחירת חלופה דרך `chooseLodging` — הכל כבר קיים ב-TripApp כ-mutations.

## מבנה הרכיב
קובץ חדש: `app/src/components/trip/PlanningLabScreen.tsx`
Props: `{ settings, items, addItem(draft: ItemDraft), removeItem(id), showToast, todayNum }`
(TripApp כבר מחזיק את saveMutation/deleteMutation — יעביר callbacks; או שהרכיב יחזיק
useMutation משלו עם saveItem/deleteItem + invalidate של ["trip"].)

State פנימי: `selectedDay` (ברירת מחדל: todayNum ?? 1), `filters {category|"all", tag|"", minRating, area|"all"}`.

פריסה:
- כותרת + הסבר קצר + רמז "נוח יותר במסך רחב".
- בורר יום (לימים רבים — Select קומפקטי, לא רק chips).
- **רצועת הקשר:** `אתמול · <dayBrief(day-1)>` — `היום · <אזור היום>` — `מחר · <dayBrief(day+1)>`.
- **מה היום כולל:** פריטי `items` של היום הנבחר, שורות קומפקטיות + כפתור הסרה + חיווי חוסר ("אין עדיין לינה").
- **המלצות:** מסוננות (ברירת מחדל לפי אזור היום אם קיים), מקובצות לפי קטגוריה, כרטיס
  עם שם, "למה מומלץ", דירוג ⭐, תגיות, קישור, וכפתור **"הוסף ליום זה"**.
- סינון: קטגוריה · תגית · דירוג מינימלי · אזור.

עזר: `function dayBrief(items, day): string` — "3 עצירות: מלון · מסלול · מסעדה" (2–3 שמות/קטגוריות).

## שינוי ניווט
- `type Tab` להוסיף `"lab"`. במערך הניווט להוסיף `{ id:"lab", icon:"🧭", label:"מעבדה" }`
  (מיקום מוצע: אחרי "תכנון").
- 6 טאבים ב-390px: לצמצם `min-w-16`→`min-w-[52px]` ו-`text-[11px]`→`text-[10px]`,
  לוודא שאין גלישה (בדיקה: `nav scrollWidth <= clientWidth`).

## רספונסיביות
- מסך רחב (`md:`): שתי עמודות — שמאל: רצועת הקשר + "מה היום כולל"; ימין: גריד המלצות
  (`md:grid-cols-2` / `lg:grid-cols-3`).
- מובייל: טור אחד, גלילה אנכית. רמז עדין בלבד, בלי לחסום.

## שלבי מימוש (סדר ביצוע)
1. `recommendations.ts` — טיפוסים + זרע דאטה ריאליסטי לנורווגיה.
2. שלד `PlanningLabScreen` — בורר יום + רצועת אתמול/היום/מחר + "מה היום כולל" (עם הסרה).
3. דפדפן ההמלצות — סינון + כרטיסים + "הוסף ליום זה" → יוצר פריט אופציונלי (עם lodgingGroup ללינה).
4. חיווט ניווט (6 טאבים, צמצום) + רספונסיב + בדיקת סנכרון מלא + מנגנון "בחר חלופה".

## צ'קליסט אימות
- הוספת המלצה → מופיעה ב"מה היום כולל" וגם בטאבים היום/מפה/תכנון, סטטוס אופציונלי.
- שני מלונות לאותו יום → אותו `lodgingGroup` → "בחר" במסך מידע מקדם אחד ל-מתוכנן.
- רצועת ההקשר מציגה אתמול/מחר נכון.
- 6 טאבים נכנסים ב-390px בלי גלישה.
- גריד רחב במחשב מול טור במובייל.
- `npx tsc --noEmit` 0 שגיאות ב-`^src/`, `node scripts/fill-check.mjs --strict` נקי, אפס שגיאות קונסול.
- **פריסה: production ישירות** (ראו הערות פריסה למטה) + אימות דרך ה-bundle + דפדפן עם ניקוי SW.

## הערות פריסה (נלמד בדרך הקשה)
- `deploy_website env=preview` החזיר לעיתים URL של פרודקשן וה-preview נשאר על בנייה
  ישנה. **פריסות production עבדו** — לפרוס ישירות ל-production ולאמת.
- אימות שהבנייה הופצה: `curl` ל-`https://serene-flora-768.higgsfield.app/`, לחלץ את
  `/assets/index-*.js`, ולגרפ marker מהקוד החדש. בדפדפן: לנקות Service Worker + caches
  ואז לרענן (ה-SW מגיש bundle ישן מה-cache).
- אחרי כל שינוי: commit+push ל-Higgsfield (טוקן דרך `http.extraHeader`) → deploy production
  → סנכרון GitHub mirror דרך `git archive HEAD` לתיקיית `compass-export` (היסטוריה נקייה, בלי מפתחות).
- **מפתח ניהול הוסר** — האפליקציה פתוחה לכולם (בלי `?k=`). אין צורך במפתח לכתיבות.

## הערת תוכן
המאגר הוא עבודת תוכן: הזרע ההתחלתי הוא בסיס; להרחיב (למצוא בפועל מלונות 8.5+ אמיתיים
לכל אזור) — עבודת תוכן שנעשה עם איתי, אפשר בעזרת AI.
