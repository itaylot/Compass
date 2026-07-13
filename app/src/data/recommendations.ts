// מאגר המלצות טעון מראש למעבדת התכנון. תוכן סטטי (curated) — מנותק מהמסלול
// עד שבוחרים פריט. "הוסף ליום" ממיר Recommendation ל-ItemDraft ושומר ב-trip_items.
// להרחבה: פשוט מוסיפים איברים למערך recommendations.

import type { Category } from "./trip-items";

export type RecArea = "אוסלו" | "פלום ואאורלנד" | "ברגן" | "איידפיורד והרדנגר" | "בדרך";

export const REC_AREAS: RecArea[] = ["אוסלו", "פלום ואאורלנד", "ברגן", "איידפיורד והרדנגר", "בדרך"];

export interface Recommendation {
  id: string;
  area: RecArea;
  category: Category;
  name: string;
  shortDescription: string;
  why: string; // "למה מומלץ" — משפט אחד
  lat: number;
  lng: number;
  bookingUrl: string;
  rating?: number; // למשל 8.7
  priceLevel?: 1 | 2 | 3; // $ $$ $$$
  tags: string[]; // ספא, בריכה, גשום, משפחתי, חובה, נוף...
  durationMin?: number; // משך מוצע; אם ריק — ברירת מחדל לפי קטגוריה
  // מידע על הפעילות (אופציונלי — נשמר גם על הפריט אחרי "הוסף ליום")
  openingHours?: string;
  cost?: string;
  info?: string;
}

// משך ברירת מחדל לפי קטגוריה (כשלהמלצה אין durationMin משלה)
export const DEFAULT_DURATION: Record<Category, number> = {
  hotel: 30,
  food: 90,
  hike: 90,
  view: 45,
  charge: 35,
  drive: 120,
  activity: 120,
};

export const recommendations: Recommendation[] = [
  // ─────────── אוסלו ───────────
  {
    id: "rec-oslo-hotel-amerikalinjen", area: "אוסלו", category: "hotel",
    name: "Hotel Amerikalinjen", shortDescription: "בוטיק מעוצב ליד התחנה המרכזית",
    why: "מיקום מושלם, חדרים משפחתיים ובוקר מעולה", lat: 59.9107, lng: 10.7522,
    bookingUrl: "https://www.booking.com/hotel/no/amerikalinjen.html", rating: 8.9, priceLevel: 3,
    tags: ["משפחתי", "מרכזי"],
  },
  {
    id: "rec-oslo-hotel-thon-opera", area: "אוסלו", category: "hotel",
    name: "Thon Hotel Opera", shortDescription: "מול בית האופרה, נוף לפיורד",
    why: "יחס מחיר-מיקום מצוין, צמוד לתחנה ולאופרה", lat: 59.9101, lng: 10.7513,
    bookingUrl: "https://www.thonhotels.com/hotels/norway/oslo/thon-hotel-opera/", rating: 8.5, priceLevel: 2,
    tags: ["משפחתי", "מרכזי", "נוף"],
  },
  {
    id: "rec-oslo-hotel-farris", area: "אוסלו", category: "hotel",
    name: "The Hub", shortDescription: "מלון גדול עם בריכה על הגג",
    why: "בריכה מקורה — כיף לילדים אחרי יום סיורים", lat: 59.9127, lng: 10.7461,
    bookingUrl: "https://www.booking.com/hotel/no/comfort-xpress-youngstorget.html", rating: 8.6, priceLevel: 2,
    tags: ["בריכה", "משפחתי"],
  },
  {
    id: "rec-oslo-food-vippa", area: "אוסלו", category: "food",
    name: "Vippa", shortDescription: "אולם אוכל על המים, דוכנים בינלאומיים",
    why: "מגוון ענק לכל המשפחה, אווירה נעימה", lat: 59.9034, lng: 10.7368,
    bookingUrl: "https://vippa.no", rating: 8.4, priceLevel: 1, tags: ["משפחתי", "צמחוני"],
  },
  {
    id: "rec-oslo-food-mathallen", area: "אוסלו", category: "food",
    name: "Mathallen", shortDescription: "שוק אוכל מקורה במרכז",
    why: "מבחר גדול, מושלם גם ליום גשום", lat: 59.9226, lng: 10.7519,
    bookingUrl: "https://mathallenoslo.no", rating: 8.3, priceLevel: 2, tags: ["גשום", "משפחתי"],
  },
  {
    id: "rec-oslo-view-opera", area: "אוסלו", category: "view",
    name: "גג בית האופרה", shortDescription: "עלייה רגלית על הגג הלבן",
    why: "חינם, נוף לפיורד, חובה באוסלו", lat: 59.9075, lng: 10.7531,
    bookingUrl: "https://operaen.no", rating: 9.0, priceLevel: 1, tags: ["חובה", "נוף", "בחינם"],
  },
  {
    id: "rec-oslo-hike-vigeland", area: "אוסלו", category: "hike",
    name: "פארק הפסלים ויגלנד", shortDescription: "הליכה קלה בין מאות פסלים",
    why: "חינם, יפהפה ומתאים לכל הגילים", lat: 59.927, lng: 10.7007,
    bookingUrl: "https://vigeland.museum.no", rating: 8.8, priceLevel: 1, tags: ["בחינם", "משפחתי", "הליכה קלה"],
    openingHours: "הפארק פתוח תמיד",
    cost: "כניסה חופשית",
    info: "פארק ענק עם מאות פסלים. שירותים ליד הכניסה הראשית. נוח לעגלות.",
  },
  {
    id: "rec-oslo-activity-fram", area: "אוסלו", category: "activity",
    name: "מוזיאון פראם", shortDescription: "ספינת הקוטב האמיתית",
    why: "מרתק לילדים, מקורה — טוב לגשם", lat: 59.9036, lng: 10.6994,
    bookingUrl: "https://frammuseum.no", rating: 8.9, priceLevel: 2, tags: ["גשום", "משפחתי", "מוזיאון"],
  },
  {
    id: "rec-oslo-activity-munch", area: "אוסלו", category: "activity",
    name: "מוזיאון מונק", shortDescription: "אמנות נורווגית ומגדל תצפית",
    why: "אדריכלות מרשימה, מושלם ליום גשום", lat: 59.9057, lng: 10.7553,
    bookingUrl: "https://www.munchmuseet.no", rating: 8.5, priceLevel: 2, tags: ["גשום", "מוזיאון"],
  },

  // ─────────── פלום ואאורלנד ───────────
  {
    id: "rec-flam-hotel-fretheim", area: "פלום ואאורלנד", category: "hotel",
    name: "Fretheim Hotel", shortDescription: "מלון היסטורי מול הפיורד",
    why: "מיקום מול הפיורד, חדרים משפחתיים", lat: 59.8632, lng: 7.113,
    bookingUrl: "https://www.fretheimhotel.no", rating: 8.7, priceLevel: 3, tags: ["נוף", "משפחתי"],
  },
  {
    id: "rec-flam-hotel-aurland-spa", area: "פלום ואאורלנד", category: "hotel",
    name: "Aurland Fjordhotel", shortDescription: "מלון שקט עם ספא על שפת הפיורד",
    why: "ספא ונוף פיורד — רגיעה אחרי יום מסלולים", lat: 60.9061, lng: 7.1897,
    bookingUrl: "https://www.booking.com/hotel/no/aurland-fjordhotel.html", rating: 8.6, priceLevel: 2,
    tags: ["ספא", "נוף"],
  },
  {
    id: "rec-flam-view-stegastein", area: "פלום ואאורלנד", category: "view",
    name: "תצפית סטגסטיין", shortDescription: "מרפסת עץ 650 מ' מעל הפיורד",
    why: "אחת התצפיות היפות בנורווגיה — חובה", lat: 60.9203, lng: 7.2077,
    bookingUrl: "https://www.nasjonaleturistveger.no/no/turistvegar/aurlandsfjellet", rating: 9.3, priceLevel: 1,
    tags: ["חובה", "נוף", "בחינם"],
    openingHours: "פתוח תמיד (הכביש עשוי להיסגר בחורף)",
    cost: "כניסה חופשית · חניה בתשלום",
    info: "העלייה בכביש הרים צר ותלול — נהגו לאט. אור בוקר הכי יפה, לקחת שכבה חמה.",
  },
  {
    id: "rec-flam-activity-railway", area: "פלום ואאורלנד", category: "activity",
    name: "רכבת פלום (Flåmsbana)", shortDescription: "אחת ממסילות הרכבת היפות בעולם",
    why: "חוויה בלתי נשכחת, כרטיסים מראש", lat: 59.8631, lng: 7.1123,
    bookingUrl: "https://www.norwaysbest.com/flam-railway/", rating: 9.1, priceLevel: 3,
    tags: ["חובה", "משפחתי", "הזמנה"],
    openingHours: "מספר יציאות ביום, משתנה לפי עונה",
    cost: "מבוגר ~450 NOK הלוך-חזור (מחיר משוער — בדקו באתר)",
    info: "כדאי להזמין מראש בעונה. לשבת בצד ימין בעלייה לנוף הטוב ביותר. עצירה קצרה במפל קיוספוסן.",
  },
  {
    id: "rec-flam-activity-cruise", area: "פלום ואאורלנד", category: "activity",
    name: "שייט בנרויפיורד", shortDescription: "שייט חשמלי שקט בפיורד צר (מורשת עולמית)",
    why: "פיורד מרהיב, שקט ונקי — חובה", lat: 59.8638, lng: 7.1107,
    bookingUrl: "https://www.norwaysbest.com/", rating: 9.0, priceLevel: 3,
    tags: ["חובה", "פיורד", "הזמנה"],
  },
  {
    id: "rec-flam-food-aegir", area: "פלום ואאורלנד", category: "food",
    name: "Ægir BrewPub", shortDescription: "פאב ויקינגי עם אוכל מקומי",
    why: "אווירה ייחודית ותפריט ילדים", lat: 59.8622, lng: 7.1147,
    bookingUrl: "https://www.flamsbrygga.no", rating: 8.5, priceLevel: 2, tags: ["מקומי", "משפחתי"],
  },
  {
    id: "rec-flam-activity-museum", area: "פלום ואאורלנד", category: "activity",
    name: "מוזיאון רכבת פלום", shortDescription: "קטן, חינמי ומקורה",
    why: "אופציה מצוינת ליום גשום, צמוד לתחנה", lat: 59.8635, lng: 7.1118,
    bookingUrl: "https://www.visitflam.com", rating: 8.0, priceLevel: 1, tags: ["גשום", "בחינם"],
  },

  // ─────────── ברגן ───────────
  {
    id: "rec-bergen-hotel-zander", area: "ברגן", category: "hotel",
    name: "Zander K Hotel", shortDescription: "מעוצב, ליד תחנת הרכבת",
    why: "מודרני, מרכזי, חניון חשמלי", lat: 60.3894, lng: 5.3325,
    bookingUrl: "https://zanderk.no", rating: 8.8, priceLevel: 2, tags: ["מרכזי", "טעינה"],
  },
  {
    id: "rec-bergen-hotel-norge-spa", area: "ברגן", category: "hotel",
    name: "Hotel Norge by Scandic", shortDescription: "מלון יוקרה עם ספא ובריכה",
    why: "ספא ובריכה מקורה — פינוק בלב ברגן", lat: 60.3922, lng: 5.3243,
    bookingUrl: "https://www.scandichotels.com/hotels/norway/bergen/hotel-norge-by-scandic", rating: 8.7, priceLevel: 3,
    tags: ["ספא", "בריכה", "מרכזי"],
  },
  {
    id: "rec-bergen-view-floyen", area: "ברגן", category: "hike",
    name: "פלויבאנן והר פלויין", shortDescription: "רכבל להר, נוף ויער טרולים",
    why: "נוף עוצר נשימה + מגרש משחקים למעלה", lat: 60.3961, lng: 5.3286,
    bookingUrl: "https://www.floyen.no", rating: 9.0, priceLevel: 2, tags: ["חובה", "משפחתי", "נוף"],
    openingHours: "רכבל בערך 07:30–23:00 (בדקו לפי עונה)",
    cost: "רכבל מבוגר ~160 NOK הלוך-חזור (משוער), ילדים בהנחה",
    info: "כרטיסים אונליין חוסכים תור. אפשר לרדת גם רגלית. מגרש משחקים ונוף למעלה.",
  },
  {
    id: "rec-bergen-view-bryggen", area: "ברגן", category: "view",
    name: "רציף בריגן (Bryggen)", shortDescription: "בתי העץ הצבעוניים, אתר מורשת",
    why: "צבעוני וייחודי — יפה גם בגשם", lat: 60.3973, lng: 5.3241,
    bookingUrl: "https://en.visitbergen.com/things-to-do/bryggen-in-bergen-p877063", rating: 8.9, priceLevel: 1,
    tags: ["חובה", "היסטוריה"],
  },
  {
    id: "rec-bergen-food-fishmarket", area: "ברגן", category: "food",
    name: "שוק הדגים של ברגן", shortDescription: "דוכני פירות ים על הנמל",
    why: "חוויה קלאסית של ברגן", lat: 60.3945, lng: 5.3252,
    bookingUrl: "https://en.visitbergen.com", rating: 8.2, priceLevel: 2, tags: ["מקומי"],
  },
  {
    id: "rec-bergen-activity-aquarium", area: "ברגן", category: "activity",
    name: "אקווריום ברגן", shortDescription: "פינגווינים וכלבי ים",
    why: "מושלם לילדים וליום גשום", lat: 60.3995, lng: 5.3037,
    bookingUrl: "https://www.akvariet.no", rating: 8.6, priceLevel: 2, tags: ["גשום", "משפחתי"],
  },
  {
    id: "rec-bergen-activity-kode", area: "ברגן", category: "activity",
    name: "מוזיאוני KODE", shortDescription: "אמנות ועיצוב במרכז",
    why: "כרטיס אחד לכמה בניינים — טוב לגשם", lat: 60.3912, lng: 5.3223,
    bookingUrl: "https://www.kodebergen.no", rating: 8.4, priceLevel: 2, tags: ["גשום", "מוזיאון"],
  },

  // ─────────── איידפיורד והרדנגר ───────────
  {
    id: "rec-eid-hotel-voringfoss", area: "איידפיורד והרדנגר", category: "hotel",
    name: "Quality Hotel Vøringfoss", shortDescription: "על שפת הפיורד באיידפיורד",
    why: "נוף פיורד, בופה ערב נוח למשפחות", lat: 60.4672, lng: 7.0716,
    bookingUrl: "https://www.strawberryhotels.com", rating: 8.5, priceLevel: 2, tags: ["נוף", "משפחתי"],
  },
  {
    id: "rec-eid-view-voringsfossen", area: "איידפיורד והרדנגר", category: "view",
    name: "מפל וורינגספוסן", shortDescription: "המפל המפורסם, גשר צעדים מעל התהום",
    why: "מרהיב עם פלטפורמות בטוחות — חובה", lat: 60.4269, lng: 7.2497,
    bookingUrl: "https://www.nasjonaleturistveger.no/no/turistvegar/hardanger", rating: 9.2, priceLevel: 1,
    tags: ["חובה", "מפל", "נוף"],
    openingHours: "פתוח תמיד",
    cost: "כניסה חופשית · חניה בתשלום",
    info: "פלטפורמות תצפית וגשר צעדים חדשים ובטוחים. קר ורוחי גם בקיץ — לקחת שכבה. שירותים בחניה.",
  },
  {
    id: "rec-eid-view-steins", area: "איידפיורד והרדנגר", category: "view",
    name: "מפל סטיינסדלספוסן", shortDescription: "המפל שהולכים מאחוריו",
    why: "שביל קצר ובטוח — כיף לילדים", lat: 60.3766, lng: 6.1268,
    bookingUrl: "https://en.visitnorway.com", rating: 8.7, priceLevel: 1, tags: ["מפל", "משפחתי", "חובה"],
  },
  {
    id: "rec-eid-activity-naturesenter", area: "איידפיורד והרדנגר", category: "activity",
    name: "מרכז הטבע הרדנגרוידה", shortDescription: "מוזיאון אינטראקטיבי וסרט פנורמי",
    why: "מצוין ליום גשום, מתאים לילדים", lat: 60.4055, lng: 7.2242,
    bookingUrl: "https://norsknatursenter.no", rating: 8.5, priceLevel: 2, tags: ["גשום", "משפחתי"],
  },
  {
    id: "rec-eid-hike-nature-trail", area: "איידפיורד והרדנגר", category: "hike",
    name: "שביל מרכז הטבע הרדנגרוידה", shortDescription: "מסלול מעגלי קצר ומסומן",
    why: "קל, מסומן, מתחיל ליד החניה", lat: 60.4058, lng: 7.2246,
    bookingUrl: "https://en.visitnorway.com", rating: 8.3, priceLevel: 1, tags: ["הליכה קלה", "משפחתי"],
  },

  // ─────────── בדרך (נסיעה + טעינה) ───────────
  {
    id: "rec-road-charge-gol", area: "בדרך", category: "charge",
    name: "טעינה מהירה בגול", shortDescription: "Circle K, עמדות 150kW, שירותים וקפה",
    why: "עצירת אמצע נוחה בין אוסלו לפלום", lat: 60.6994, lng: 8.9445,
    bookingUrl: "https://www.circlek.no", rating: 8.0, priceLevel: 2, tags: ["טעינה", "הפסקה"],
  },
  {
    id: "rec-road-charge-voss", area: "בדרך", category: "charge",
    name: "טעינה מהירה בווס", shortDescription: "Recharge ליד הרכבת, בתי קפה ממול",
    why: "עצירה נוחה בדרך לברגן", lat: 60.6294, lng: 6.4077, rating: 8.0, priceLevel: 2,
    bookingUrl: "https://rechargeinfra.com", tags: ["טעינה", "הפסקה"],
  },
  {
    id: "rec-road-view-tvinde", area: "בדרך", category: "view",
    name: "מפל טווינדפוסן", shortDescription: "מפל 110 מ' ממש ליד הכביש",
    why: "עצירה קצרה ומרשימה, חניה חינם", lat: 60.7, lng: 6.4239, rating: 8.4, priceLevel: 1,
    bookingUrl: "https://en.visitnorway.com", tags: ["מפל", "עצירת דרך", "בחינם"],
  },
  {
    id: "rec-road-view-borgund", area: "בדרך", category: "view",
    name: "כנסיית העץ בורגון", shortDescription: "כנסיית מוטות מהמאה ה-12",
    why: "עצירת דרך היסטורית ומרשימה", lat: 61.0471, lng: 7.8122, rating: 8.6, priceLevel: 2,
    bookingUrl: "https://www.stavechurch.com", tags: ["היסטוריה", "עצירת דרך"],
  },
];

// המלצות רלוונטיות לאזור (עם fallback לכל האזורים אם אין התאמה)
export function recsForArea(area: RecArea | "all"): Recommendation[] {
  if (area === "all") return recommendations;
  return recommendations.filter((r) => r.area === area);
}
