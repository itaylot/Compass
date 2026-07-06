// מדריך שימוש קצר, נפתח מאייקון "?" בכותרת. קישור אחד לכולם — כולם עורכים.

export function HelpSheet(props: { onClose: () => void }) {
  const { onClose } = props;

  const Item = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl bg-white p-3.5 shadow-sm">
      <h3 className="mb-1 text-sm font-extrabold">
        {icon} {title}
      </h3>
      <p className="text-xs leading-relaxed text-[var(--muted)]">{children}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1160] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--paper)] p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">❓ איך משתמשים באפליקציה</h2>
          <button onClick={onClose} className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold">
            סגירה
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="rounded-2xl bg-[var(--brand)] p-3.5 text-white">
            <p className="text-sm font-bold leading-relaxed">
              זה עוזר הטיול המשפחתי שלנו. כל המידע במקום אחד, וכל מה שמישהו מעדכן מופיע מיד אצל כולם.
            </p>
            <p className="mt-1 text-xs text-white/85">טיפ: ב-iPhone לחצו "שיתוף → הוסף למסך הבית" כדי שייפתח כמו אפליקציה.</p>
          </div>

          <p className="px-1 pt-1 text-xs font-extrabold text-[var(--muted)]">ארבעת המסכים למטה</p>

          <Item icon="🏠" title="היום">
            מסך הבית. למעלה רואים <b>מה הפעולה הבאה</b> עם כפתור ניווט גדול, ומתחת את כל עצירות
            היום לפי שעה. בוחרים יום מהפס העליון, או "כל הטיול". היום הנוכחי מסומן ב-📍.
          </Item>

          <Item icon="🗺️" title="מפה">
            כל העצירות על מפה, בצבע לפי סוג. לוחצים על נקודה כדי לראות פרטים ולנווט. הכפתורים
            למעלה מסננים (אוכל, לינה, מסלולים, תצפיות, טעינה).
          </Item>

          <Item icon="📋" title="תכנון">
            טבלה של כל הטיול, נוחה למי שאוהב לראות הכל ביחד. אפשר למיין ולסנן, וללחוץ על שורה
            לפרטים.
          </Item>

          <Item icon="ℹ️" title="מידע">
            "מה בא לנו עכשיו?" להצעות מהירות, רשימת לינות, בדיקת "מוכנים לטיול?", מספרי חירום,
            שיתוף הקישור, ייצוא ל-Excel והגדרות הטיול.
          </Item>

          <p className="px-1 pt-1 text-xs font-extrabold text-[var(--muted)]">הפעולות</p>

          <Item icon="🚗" title="ניווט">
            כל כפתור ניווט פותח את <b>Waze</b> עם היעד מוכן. אם לעצירה יש חניה מוגדרת, יופיע גם
            כפתור "נווט לחניה 🅿️" — כי בנורווגיה החניה לרוב לא במקום האטרקציה.
          </Item>

          <Item icon="✓" title="סימון בוצע">
            לחיצה על "סמן שבוצע" מעדכנת את כולם. תמיד אפשר לבטל.
          </Item>

          <Item icon="➕" title="הוספה ועריכה">
            הכפתור העגול <b>+</b> מוסיף עצירה. בטופס מחפשים את המקום לפי שם — המיקום במפה מתמלא
            לבד. אפשר להוסיף חניה, מספר הזמנה וטלפון. עריכה ומחיקה דרך "פרטים ← עריכה". מחיקה
            תמיד ניתנת לביטול מיד אחריה. <b>לכל המשפחה יש אותה גישה</b> — כולם יכולים לערוך.
          </Item>

          <Item icon="📝" title="תזכורות ליום">
            בכרטיס היום יש כפתור "תזכורות". פותחים רשימה קצרה לאותו יום (לקחת מעיל, קוד כניסה
            למלון וכו'). מסמנים ✓ כשמבצעים.
          </Item>

          <Item icon="🏨" title="השוואת לינות">
            כשמוסיפים כמה מלונות לאותו לילה עם אותה "קבוצת חלופות", הם מופיעים במסך מידע להשוואה,
            ולוחצים "בחר" על הנבחר — השאר נשמרים כאופציה.
          </Item>

          <Item icon="📊" title="ייצוא ל-Excel">
            במסך "מידע" → "ייצוא הטיול". מוריד קובץ מסודר עם כל המסלול, לינות ותזכורות, לפתיחה
            ב-Excel או Google Sheets, להדפסה או שיתוף.
          </Item>

          <Item icon="📶" title="בלי קליטה">
            המידע שכבר נטען זמין גם באזורים בלי קליטה. כשחוזרים לרשת הכל מתעדכן לבד.
          </Item>
        </div>
      </div>
    </div>
  );
}
