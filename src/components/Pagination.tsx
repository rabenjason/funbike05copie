import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";

type Props = {
  id: string;
  page: number;
  total: number;
  onChange: (page: number) => void;
};

export default function Pagination({ id, page, total, onChange }: Props) {
  if (total <= 1) return null;
  const pages = Array.from({ length: total }, (_, i) => i + 1);

  const arrow =
    "inline-flex min-h-11 items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#171816] transition hover:text-[#98741b] disabled:pointer-events-none disabled:opacity-30 dark:text-[#f2f0ea] dark:hover:text-[#ffd100]";

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between gap-3 border-t border-black/15 pt-4 dark:border-white/15"
    >
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className={arrow}>
        <FontAwesomeIcon icon={faArrowLeft} />
        <span className="hidden sm:inline">Précédent</span>
      </button>

      <div className="flex items-center gap-1">
        {pages.map((n) => {
          const active = n === page;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              aria-label={`Page ${n}`}
              aria-current={active ? "page" : undefined}
              className={
                "relative grid h-11 w-11 place-items-center font-display text-xs font-semibold transition " +
                (active ? "text-[#171816]" : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white")
              }
            >
              {active && (
                <motion.span
                  layoutId={`${id}-page`}
                  className="absolute inset-0 bg-[#ffd100]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{String(n).padStart(2, "0")}</span>
            </button>
          );
        })}
      </div>

      <button onClick={() => onChange(page + 1)} disabled={page === total} className={arrow}>
        <span className="hidden sm:inline">Suivant</span>
        <FontAwesomeIcon icon={faArrowRight} />
      </button>
    </nav>
  );
}
