import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type TripItem } from "../../data/trip-items";

// Leaflet נטען מ-CDN בזמן ריצה: שומר על SSR בטוח (אין window בזמן render)
// ובלי לגעת ב-bun.lock של התבנית.
let leafletPromise: Promise<unknown> | null = null;

function loadLeaflet(): Promise<unknown> {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const w = window as unknown as { L?: unknown };
    if (w.L) {
      resolve(w.L);
      return;
    }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve((window as unknown as { L?: unknown }).L);
    script.onerror = () => {
      leafletPromise = null;
      reject(new Error("leaflet load failed"));
    };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

interface MapViewProps {
  items: TripItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
  /* מפה קטנה (מסך "היום") מקבלת zoom עדין יותר בבחירה */
  mini?: boolean;
}

export function MapView({ items, selectedId, onSelect, className, mini }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // יצירת המפה פעם אחת
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((L: any) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: !mini,
          attributionControl: true,
        }).setView([60.5, 8.0], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mini, retry]);

  // סנכרון סיכות עם הפריטים המסוננים
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const L = (window as unknown as { L: any }).L; // eslint-disable-line @typescript-eslint/no-explicit-any

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    items.forEach((item) => {
      const cat = CATEGORIES[item.category];
      const isSel = item.id === selectedId;
      const isOpt = item.status === "optional";
      const icon = L.divIcon({
        className: "",
        html: `<div class="trip-pin${isSel ? " trip-pin-selected" : ""}${isOpt ? " trip-pin-optional" : ""}" style="--pin:${cat.color}">${cat.icon}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = L.marker([item.lat, item.lng], { icon, title: item.name }).addTo(map);
      marker.on("click", () => onSelectRef.current(item.id));
      markersRef.current.set(item.id, marker);
    });

    // התאמת התצוגה לפריטים כשאין בחירה פעילה
    if (items.length > 0 && !selectedId) {
      const bounds = L.latLngBounds(items.map((i) => [i.lat, i.lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    }
  }, [items, selectedId, ready]);

  // התמקדות בפריט נבחר
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selectedId) return;
    const item = items.find((i) => i.id === selectedId);
    if (!item) return;
    map.flyTo([item.lat, item.lng], mini ? 12 : 13, { duration: 0.6 });
  }, [selectedId, items, ready, mini]);

  if (failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[#E8EEF0] text-center ${className ?? ""}`}>
        <span className="text-3xl">🗺️</span>
        <p className="px-6 text-sm text-[#4A5A63]">
          המפה לא הצליחה להיטען. בדקו חיבור לאינטרנט ונסו לרענן.
        </p>
        <button
          className="rounded-full bg-[#17606A] px-4 py-1.5 text-sm font-semibold text-white"
          onClick={() => {
            leafletPromise = null;
            setFailed(false);
            setRetry((r) => r + 1);
          }}
        >
          נסו שוב
        </button>
      </div>
    );
  }

  return <div ref={containerRef} dir="ltr" className={`z-0 ${className ?? ""}`} />;
}
