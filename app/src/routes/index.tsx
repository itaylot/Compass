import { createFileRoute } from "@tanstack/react-router";
import TripApp from "../components/trip/TripApp";
import { getTrip } from "../lib/api/trip.functions";

export const Route = createFileRoute("/")({
  // הנתונים נטענים כבר בזמן ה-SSR: המסך נפתח מלא, בלי "טוען…"
  loader: () => getTrip(),
  head: () => ({
    meta: [
      { name: "theme-color", content: "#17606A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "נורווגיה 2026" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/assets/icon.svg" },
    ],
  }),
  component: Index,
});

function Index() {
  const initialData = Route.useLoaderData();
  return <TripApp initialData={initialData} />;
}
