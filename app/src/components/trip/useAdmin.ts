import { useEffect, useState } from "react";
import { checkAdmin } from "../../lib/api/trip.functions";

// מצב ניהול: קישור הניהול מכיל ?k=<מפתח>. בכניסה ראשונה המפתח נשמר
// ב-localStorage והפרמטר מנוקה מה-URL, כדי שלא ידלוף בשיתוף מסך/היסטוריה.
// קישור הצפייה (בלי k) נשאר במצב קריאה בלבד.

const STORE_KEY = "norway2026-adminkey";

export interface AdminState {
  isAdmin: boolean;
  key: string;
  ready: boolean; // סיימנו לבדוק מול השרת
  signOut: () => void;
  signInWithKey: (key: string) => Promise<boolean>;
}

export function useAdmin(): AdminState {
  const [key, setKey] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  const verify = async (candidate: string): Promise<boolean> => {
    if (!candidate) return false;
    try {
      const res = await checkAdmin({ data: { key: candidate } });
      return res.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let candidate = "";
      try {
        const url = new URL(window.location.href);
        const fromUrl = url.searchParams.get("k");
        if (fromUrl) {
          candidate = fromUrl;
          localStorage.setItem(STORE_KEY, fromUrl);
          url.searchParams.delete("k");
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        } else {
          candidate = localStorage.getItem(STORE_KEY) ?? "";
        }
      } catch {
        candidate = "";
      }
      const ok = await verify(candidate);
      if (cancelled) return;
      setKey(ok ? candidate : "");
      setIsAdmin(ok);
      setReady(true);
      if (!ok && candidate) {
        try {
          localStorage.removeItem(STORE_KEY);
        } catch {
          /* אין אחסון */
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = () => {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* אין אחסון */
    }
    setKey("");
    setIsAdmin(false);
  };

  const signInWithKey = async (candidate: string): Promise<boolean> => {
    const ok = await verify(candidate.trim());
    if (ok) {
      try {
        localStorage.setItem(STORE_KEY, candidate.trim());
      } catch {
        /* אין אחסון */
      }
      setKey(candidate.trim());
      setIsAdmin(true);
    }
    return ok;
  };

  return { isAdmin, key, ready, signOut, signInWithKey };
}
