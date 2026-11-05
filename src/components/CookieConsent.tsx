import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faChevronDown,
  faCookieBite,
  faLock,
  faSliders,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

export type Consent = { necessary: true; stats: boolean; marketing: boolean; date: string };

const STORAGE_KEY = "fb_cookie_consent";
const COOKIE_DAYS = 180;

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

function saveConsent(stats: boolean, marketing: boolean) {
  const consent: Consent = { necessary: true, stats, marketing, date: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    /* storage unavailable: the cookie below still records the choice */
  }
  const value = encodeURIComponent(JSON.stringify({ s: stats ? 1 : 0, m: marketing ? 1 : 0 }));
  document.cookie = `${STORAGE_KEY}=${value}; max-age=${COOKIE_DAYS * 86400}; path=/; SameSite=Lax`;
}

function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      onClick={() => onChange?.(!checked)}
      className={
        "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed " +
        (checked ? "bg-[#ffd100]" : "bg-black/15 dark:bg-white/20")
      }
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 520, damping: 30 }}
        className={"absolute top-0.5 h-4 w-4 rounded-full bg-white shadow " + (checked ? "right-0.5" : "left-0.5")}
      />
    </motion.button>
  );
}

type Mode = "docked" | "compact" | "custom";

const springLayout = { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.8 };

export default function CookieConsent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const existing = readConsent();
  const [mode, setMode] = useState<Mode>("compact");
  const [stats, setStats] = useState(existing?.stats ?? false);
  const [marketing, setMarketing] = useState(existing?.marketing ?? false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Reset to compact when explicitly reopened from footer
  useEffect(() => {
    if (open) {
      setMode("compact");
      setSavedFlash(false);
    }
  }, [open]);

  // Adaptive behavior: automatically morph into mini docked pill when user scrolls down on mobile/desktop
  useEffect(() => {
    if (!open || mode === "custom") return;
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (y > 90 && delta > 6 && mode === "compact") {
        setMode("docked");
      } else if (y < 25 && mode === "docked") {
        setMode("compact");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open, mode]);

  function decide(s: boolean, m: boolean) {
    saveConsent(s, m);
    setSavedFlash(true);
    window.setTimeout(() => {
      setSavedFlash(false);
      setMode("compact");
      onClose();
    }, 420);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="cookie-adaptive-shell"
          layout
          transition={springLayout}
          role="dialog"
          aria-modal="false"
          aria-label="Préférences de cookies"
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.92 }}
          drag={mode !== "docked" ? "y" : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.35 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 35) {
              setMode("docked");
            }
          }}
          className={
            "glass-panel fixed z-[60] overflow-hidden shadow-[0_14px_44px_rgba(0,0,0,0.18)] " +
            (mode === "docked"
              ? "bottom-4 left-3 rounded-full p-1 sm:bottom-6 sm:left-6 sm:p-1.5"
              : mode === "compact"
                ? "bottom-3 left-3 w-[min(calc(100vw-5.5rem),300px)] rounded-xl p-2.5 sm:bottom-6 sm:left-6 sm:w-[370px] sm:rounded-2xl sm:p-4"
                : "bottom-3 left-3 max-h-[72svh] w-[min(calc(100vw-1.5rem),340px)] overflow-y-auto rounded-xl p-3 sm:bottom-6 sm:left-6 sm:w-[400px] sm:rounded-2xl sm:p-5")
          }
        >
          {/* Subtle animated top shimmer accent */}
          <motion.div
            aria-hidden="true"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffd100] to-transparent"
          />

          <AnimatePresence mode="wait" initial={false}>
            {savedFlash ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center gap-2.5 px-3 py-2 text-xs font-bold text-[#171816] dark:text-[#f2f0ea]"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -12, 0] }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="grid h-6 w-6 place-items-center rounded-full bg-[#ffd100] text-[#171816]"
                >
                  <FontAwesomeIcon icon={faCheck} className="text-[11px]" />
                </motion.span>
                <span>Préférences enregistrées</span>
              </motion.div>
            ) : mode === "docked" ? (
              /* STATE 1: MINI DOCKED PILL (when scrolling or minimized) */
              <motion.div
                key="docked"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1.5"
              >
                <motion.button
                  type="button"
                  onClick={() => setMode("compact")}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-2 rounded-full py-1 pl-1.5 pr-2.5 text-left"
                  aria-label="Ouvrir les options de cookies"
                >
                  <motion.span
                    animate={{ rotate: [0, -12, 12, -5, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2 }}
                    className="grid h-7 w-7 place-items-center rounded-full bg-[#ffd100] text-xs text-[#171816] shadow-sm"
                  >
                    <FontAwesomeIcon icon={faCookieBite} />
                  </motion.span>
                  <span className="text-[11px] font-bold tracking-tight text-[#171816] dark:text-[#f2f0ea]">
                    Cookies
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => decide(true, true)}
                  className="rounded-full bg-[#ffd100] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#171816]"
                  aria-label="Accepter tous les cookies"
                >
                  OK
                </motion.button>
              </motion.div>
            ) : mode === "compact" ? (
              /* STATE 2: SLIM ADAPTIVE MOBILE BAR */
              <motion.div
                key="compact"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <motion.span
                    animate={{ rotate: [0, -10, 10, -4, 0], y: [0, -1.5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 1.5 }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#ffd100] text-[11px] text-[#171816] shadow-sm sm:h-8 sm:w-8 sm:rounded-xl sm:text-xs"
                  >
                    <FontAwesomeIcon icon={faCookieBite} />
                  </motion.span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-xs font-bold tracking-[-0.02em] text-[#171816] sm:text-sm dark:text-[#f2f0ea]">
                        Cookies & expérience
                      </p>
                      <button
                        type="button"
                        onClick={() => setMode("docked")}
                        aria-label="Réduire en bulle"
                        className="grid h-6 w-6 place-items-center rounded-full text-[10px] text-black/45 transition hover:bg-black/5 hover:text-black dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <FontAwesomeIcon icon={faChevronDown} />
                      </button>
                    </div>
                    <p className="hidden text-[11px] leading-4 text-black/60 sm:line-clamp-2 sm:block dark:text-white/60">
                      Essentiels & mesure d'audience pour fluidifier votre visite.
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1.5 sm:mt-2.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => decide(false, false)}
                    className="h-8 rounded-lg border border-black/15 px-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#171816] transition hover:border-[#ffd100] sm:px-2.5 sm:tracking-[0.08em] dark:border-white/20 dark:text-[#f2f0ea]"
                  >
                    Refuser
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMode("custom")}
                    aria-label="Options des cookies"
                    className="inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-lg border border-black/15 text-[10px] font-bold uppercase tracking-[0.08em] text-[#171816] transition hover:border-[#ffd100] sm:w-auto sm:px-2.5 dark:border-white/20 dark:text-[#f2f0ea]"
                  >
                    <FontAwesomeIcon icon={faSliders} className="text-[10px] text-[#98741b] dark:text-[#ffd100]" />
                    <span className="hidden sm:inline">Options</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => decide(true, true)}
                    className="h-8 flex-1 rounded-lg bg-[#ffd100] px-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#171816] shadow-sm transition hover:bg-[#ffe36b] sm:px-3 sm:tracking-[0.1em]"
                  >
                    Accepter
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              /* STATE 3: CUSTOM PREFERENCES DRAWER */
              <motion.div
                key="custom"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#ffd100] text-xs text-[#171816]">
                      <FontAwesomeIcon icon={faSliders} />
                    </span>
                    <h2 className="font-display text-sm font-bold tracking-[-0.02em] text-[#171816] dark:text-[#f2f0ea]">
                      Personnaliser les cookies
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => (existing ? onClose() : setMode("compact"))}
                    aria-label="Fermer les options"
                    className="grid h-7 w-7 place-items-center rounded-full text-xs text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>

                <motion.ul
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06 } },
                  }}
                  className="mt-3 divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10"
                >
                  {[
                    {
                      title: "Essentiels",
                      desc: "Thème, sécurité et navigation.",
                      locked: true,
                      checked: true,
                      onChange: undefined,
                    },
                    {
                      title: "Audience",
                      desc: "Pages consultées et performance.",
                      locked: false,
                      checked: stats,
                      onChange: setStats,
                    },
                    {
                      title: "Marketing",
                      desc: "Offres moto personnalisées.",
                      locked: false,
                      checked: marketing,
                      onChange: setMarketing,
                    },
                  ].map((item) => (
                    <motion.li
                      key={item.title}
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 },
                      }}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div>
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#171816] dark:text-[#f2f0ea]">
                          {item.title}
                          {item.locked && (
                            <FontAwesomeIcon icon={faLock} className="text-[9px] text-black/35 dark:text-white/35" />
                          )}
                        </p>
                        <p className="text-[10px] text-black/50 dark:text-white/50">{item.desc}</p>
                      </div>
                      <Switch
                        checked={item.checked}
                        disabled={item.locked}
                        onChange={item.onChange}
                        label={`Cookies ${item.title}`}
                      />
                    </motion.li>
                  ))}
                </motion.ul>

                <div className="mt-3 flex items-center gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => decide(stats, marketing)}
                    className="h-9 flex-1 rounded-lg border border-black/15 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#171816] transition hover:border-[#ffd100] dark:border-white/20 dark:text-[#f2f0ea]"
                  >
                    Enregistrer
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => decide(true, true)}
                    className="h-9 flex-1 rounded-lg bg-[#ffd100] px-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#171816] transition hover:bg-[#ffe36b]"
                  >
                    Tout accepter
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
