import { useState } from "react";
import type { Reminder } from "../../data/trip-items";

// תזכורות פר-יום. bottom sheet שנפתח ממסך "היום". פתוח לכולם.

export function RemindersSheet(props: {
  day: number;
  reminders: Reminder[]; // כבר מסוננות ליום
  onToggle: (r: Reminder) => void;
  onAdd: (day: number, text: string) => void;
  onDelete: (r: Reminder) => void;
  onClose: () => void;
}) {
  const { day, reminders, onToggle, onAdd, onDelete, onClose } = props;
  const [text, setText] = useState("");

  const open = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(day, t);
    setText("");
  };

  return (
    <div className="fixed inset-0 z-[1150] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--paper)] p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">📝 תזכורות ליום {day}</h2>
          <button onClick={onClose} className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold">
            סגירה
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm focus:border-[var(--brand)] focus:outline-none"
            placeholder="למשל: לקחת מעיל גשם"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button onClick={submit} className="shrink-0 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white">
            הוספה
          </button>
        </div>

        {reminders.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--muted)]">אין תזכורות ליום הזה. הוסיפו אחת למעלה.</p>
        )}

        <ul className="flex flex-col gap-1.5">
          {open.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm">
              <input
                type="checkbox"
                checked={false}
                onChange={() => onToggle(r)}
                className="h-5 w-5 shrink-0 accent-[var(--brand)]"
                aria-label={`סמן שבוצע: ${r.text}`}
              />
              <span className="flex-1 text-sm">{r.text}</span>
              <button
                onClick={() => onDelete(r)}
                aria-label="מחיקה"
                className="shrink-0 rounded-lg px-2 py-1 text-sm text-[var(--muted)]"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>

        {done.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-bold text-[var(--muted)]">בוצע ({done.length})</p>
            <ul className="flex flex-col gap-1.5">
              {done.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-xl bg-black/[0.03] px-3 py-2">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => onToggle(r)}
                    className="h-5 w-5 shrink-0 accent-[var(--brand)]"
                    aria-label={`בטל סימון: ${r.text}`}
                  />
                  <span className="flex-1 text-sm text-[var(--muted)] line-through">{r.text}</span>
                  <button
                    onClick={() => onDelete(r)}
                    aria-label="מחיקה"
                    className="shrink-0 rounded-lg px-2 py-1 text-sm text-[var(--muted)]"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
