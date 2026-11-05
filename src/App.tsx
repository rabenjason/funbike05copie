import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Footer, Header, type Route } from "./components/Layout";
import CatChat from "./components/CatChat";
import CookieConsent, { readConsent } from "./components/CookieConsent";
import { RouteProgress, SplashLoader } from "./components/Loaders";
import Home from "./pages/Home";
import { Catalogue, Equipements, Spares } from "./pages/Catalog";
import Product from "./pages/Product";
import AccessoryDetail from "./pages/AccessoryDetail";
import Contact from "./pages/Contact";
import Dealers from "./pages/Dealers";
import { motorcycles, findProductById } from "./data";
import { persistTheme, readDarkPreference } from "./lib/theme";

const FIRST_HERO =
  "https://funbike.mg/wp-content/uploads/2026/02/01-250-SEF-FACTORY-2026-3679x2456-1-1920x1080-1.jpg";

function sameRoute(a: Route, b: Route) {
  return a.page === b.page && (a.id ?? "") === (b.id ?? "");
}

function routeLabel(route: Route): string {
  switch (route.page) {
    case "home":
      return "Accueil";
    case "catalogue":
      return "Catalogue";
    case "motos":
      return "Motos";
    case "equipements":
      return "Équipements";
    case "spares":
      return "Pièces détachées";
    case "product": {
      const bike = motorcycles.find((product) => product.id === route.id);
      return bike ? bike.name : "Fiche moto";
    }
    case "accessory": {
      const part = findProductById(route.id);
      return part ? part.name : "Fiche produit";
    }
    case "revendeurs":
      return "Revendeurs";
    case "contact":
      return "Contact";
    default:
      return "Page précédente";
  }
}

export default function App() {
  const [dark, setDark] = useState(readDarkPreference);
  const [history, setHistory] = useState<Route[]>([{ page: "home" }]);
  const [booting, setBooting] = useState(true);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const route = history[history.length - 1];
  const canGoBack = history.length > 1;
  const previousRoute = canGoBack ? history[history.length - 2] : null;
  const backLabel = useMemo(
    () => (previousRoute ? routeLabel(previousRoute) : "Accueil"),
    [previousRoute?.page, previousRoute?.id],
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    persistTheme(dark);
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", dark ? "#141513" : "#ffffff");
  }, [dark]);

  // Fast splash: wait for the first hero photo (min 650 ms, max 1.6 s)
  useEffect(() => {
    let done = false;
    const start = performance.now();
    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, 650 - (performance.now() - start));
      window.setTimeout(() => setBooting(false), wait);
    };
    const img = new Image();
    img.onload = finish;
    img.onerror = finish;
    img.src = FIRST_HERO;
    const cap = window.setTimeout(finish, 1600);
    return () => {
      done = true;
      window.clearTimeout(cap);
    };
  }, []);

  // Cookie banner appears once the splash is gone, only if no choice was saved
  useEffect(() => {
    if (booting || readConsent()) return;
    const timer = window.setTimeout(() => setCookieOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, [booting]);

  const go = useCallback((page: string, id?: string) => {
    const next: Route = { page, id };
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && sameRoute(last, next)) return prev;
      // Garde un historique raisonnable (50 dernières pages)
      const grown = [...prev, next];
      return grown.length > 50 ? grown.slice(grown.length - 50) : grown;
    });
    setProgressKey((k) => k + 1);
    // Retour en haut instantané : le défilement fluide se fait
    // interrompre par le changement de page et laisse l'utilisateur en bas.
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, []);

  // Sécurité : après chaque changement de page, forcer le haut
  // (les images qui chargent décalent la mise en page vers le bas).
  useEffect(() => {
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => window.scrollTo(0, 0), 60);
    return () => window.clearTimeout(t);
  }, [route.page, route.id]);

  /** Retour réel : revient là où on était juste avant, jamais vers une page imposée. */
  const back = useCallback(
    (fallback: Route = { page: "home" }) => {
      let didGoBack = false;
      setHistory((prev) => {
        if (prev.length > 1) {
          didGoBack = true;
          return prev.slice(0, -1);
        }
        return prev;
      });
      // Si aucun historique, on va vers le fallback demandé
      if (!didGoBack) {
        setHistory((prev) => {
          const last = prev[prev.length - 1];
          if (last && sameRoute(last, fallback)) return prev;
          return [...prev, fallback];
        });
      }
      setProgressKey((k) => k + 1);
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    },
    [],
  );

  return (
    <MotionConfig reducedMotion="user">
      <SplashLoader show={booting} />
      {progressKey > 0 && <RouteProgress key={progressKey} />}

      <div className="min-h-screen bg-white text-[#171816] transition-colors duration-300 dark:bg-[#141513] dark:text-[#f2f0ea]">
        <Header route={route} go={go} dark={dark} toggle={() => setDark((d) => !d)} />
        <main>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${route.page}-${route.id ?? ""}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {route.page === "home" && <Home go={go} />}
              {route.page === "catalogue" && <Catalogue go={go} />}
              {route.page === "motos" && <Catalogue go={go} motosOnly initialQuery={route.id} />}
              {route.page === "equipements" && <Equipements go={go} initialBrand={route.id} />}
              {route.page === "spares" && <Spares go={go} initialBrand={route.id} />}
              {route.page === "product" && (
                <Product id={route.id} go={go} back={back} canGoBack={canGoBack} backLabel={backLabel} />
              )}
              {route.page === "accessory" && (
                <AccessoryDetail id={route.id} go={go} back={back} canGoBack={canGoBack} backLabel={backLabel} />
              )}
              {route.page === "revendeurs" && <Dealers go={go} initialCity={route.id} />}
              {route.page === "contact" && <Contact inquiryId={route.id} />}
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer go={go} onCookies={() => setCookieOpen(true)} />
        <CatChat go={go} hiddenOnMobile={cookieOpen} />
        <CookieConsent open={cookieOpen} onClose={() => setCookieOpen(false)} />
      </div>
    </MotionConfig>
  );
}
