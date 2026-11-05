import { AnimatePresence, motion } from "framer-motion";
import { LOGO } from "../data";

/** Short branded splash shown while the first hero image preloads. */
export function SplashLoader({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-[100] grid place-items-center bg-white dark:bg-[#141513]"
          role="status"
          aria-label="Chargement du site"
        >
          <div className="flex flex-col items-center gap-5">
            <motion.img
              src={LOGO}
              alt="Funbike Madagascar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="logo-clean h-12 w-auto sm:h-14"
            />
            <div className="h-[3px] w-40 overflow-hidden bg-black/10 dark:bg-white/10">
              <motion.div
                className="h-full bg-[#ffd100]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.9, ease: "easeInOut" }}
              />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-black/40 dark:text-white/40">
              Mise en route
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Thin yellow progress line replayed on every page change. */
export function RouteProgress() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px] bg-[#ffd100]"
      initial={{ width: "0%", opacity: 1 }}
      animate={{ width: ["0%", "72%", "100%"], opacity: [1, 1, 0] }}
      transition={{ duration: 0.65, times: [0, 0.6, 1], ease: "easeOut" }}
    />
  );
}
