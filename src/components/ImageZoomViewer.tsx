import { useEffect, useState, type MouseEvent, type PointerEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faRotateLeft,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import SmartImage from "./SmartImage";

type Props = {
  open: boolean;
  images: string[];
  active: number;
  alt: string;
  onActiveChange: (index: number) => void;
  onClose: () => void;
};

const LEVELS = [1, 1.5, 2, 2.5, 3];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function ImageZoomViewer({ open, images, active, alt, onActiveChange, onClose }: Props) {
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  function resetZoom() {
    setZoom(1);
    setOrigin({ x: 50, y: 50 });
  }

  function changeImage(index: number) {
    const total = images.length;
    onActiveChange((index + total) % total);
    resetZoom();
  }

  function changeZoom(direction: 1 | -1) {
    const current = LEVELS.findIndex((level) => level === zoom);
    const nearest = current >= 0 ? current : LEVELS.findIndex((level) => level > zoom);
    const next = clamp((nearest < 0 ? LEVELS.length - 1 : nearest) + direction, 0, LEVELS.length - 1);
    setZoom(LEVELS[next]);
    if (LEVELS[next] === 1) setOrigin({ x: 50, y: 50 });
  }

  function locate(event: PointerEvent<HTMLElement> | WheelEvent<HTMLElement> | MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && images.length > 1) changeImage(active - 1);
      if (event.key === "ArrowRight" && images.length > 1) changeImage(active + 1);
      if (event.key === "+" || event.key === "=") changeZoom(1);
      if (event.key === "-") changeZoom(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, active, images.length]);

  useEffect(() => {
    if (open) resetZoom();
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Visionneuse de ${alt}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[110] flex flex-col bg-white text-[#171816] dark:bg-[#10110f] dark:text-[#f2f0ea]"
        >
          {/* Toolbar */}
          <header className="flex min-h-14 items-center gap-2 border-b border-black/10 px-3 sm:min-h-16 sm:px-5 dark:border-white/10">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{alt}</p>
              <p className="text-[11px] text-black/45 dark:text-white/45">
                Photo {active + 1} / {images.length}
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-full border border-black/10 p-1 dark:border-white/10">
              <button
                type="button"
                onClick={() => changeZoom(-1)}
                disabled={zoom === LEVELS[0]}
                aria-label="Réduire le zoom"
                className="grid h-10 w-10 place-items-center rounded-full text-sm transition hover:bg-black/5 disabled:opacity-25 dark:hover:bg-white/10"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
              </button>
              <span className="w-12 text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => changeZoom(1)}
                disabled={zoom === LEVELS[LEVELS.length - 1]}
                aria-label="Agrandir l’image"
                className="grid h-10 w-10 place-items-center rounded-full text-sm transition hover:bg-black/5 disabled:opacity-25 dark:hover:bg-white/10"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                disabled={zoom === 1}
                aria-label="Réinitialiser le zoom"
                className="grid h-10 w-10 place-items-center rounded-full text-sm transition hover:bg-black/5 disabled:opacity-25 dark:hover:bg-white/10"
              >
                <FontAwesomeIcon icon={faRotateLeft} />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la visionneuse"
              className="ml-1 grid h-11 w-11 place-items-center rounded-full border border-black/10 text-lg transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </header>

          {/* Zoom stage */}
          <main
            onPointerDown={zoom > 1 ? locate : undefined}
            onPointerMove={(event) => {
              if (zoom > 1 && (event.pointerType === "mouse" || event.buttons === 1)) locate(event);
            }}
            onWheel={(event) => {
              event.preventDefault();
              locate(event);
              changeZoom(event.deltaY < 0 ? 1 : -1);
            }}
            onDoubleClick={(event) => {
              locate(event);
              setZoom((value) => (value === 1 ? 2.5 : 1));
            }}
            onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              locate(event);
              setZoom((value) => (value === 1 ? 2 : 1));
            }}
            className={
              "relative min-h-0 flex-1 overflow-hidden bg-white " +
              (zoom === 1 ? "cursor-zoom-in" : "cursor-crosshair touch-none")
            }
          >
            <motion.div
              key={images[active]}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1, scale: zoom }}
              transition={{ opacity: { duration: 0.25 }, scale: { type: "spring", stiffness: 260, damping: 30 } }}
              style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
              className="pointer-events-none absolute inset-0"
            >
              <SmartImage src={images[active]} alt={`${alt}, photo ${active + 1}`} eager className="h-full w-full" imgClassName="object-contain p-3 sm:p-8" />
            </motion.div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    changeImage(active - 1);
                  }}
                  aria-label="Photo précédente"
                  className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/85 text-sm shadow backdrop-blur transition hover:bg-white sm:left-5 sm:h-12 sm:w-12 dark:border-white/10 dark:bg-black/60 dark:hover:bg-black/80"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    changeImage(active + 1);
                  }}
                  aria-label="Photo suivante"
                  className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/85 text-sm shadow backdrop-blur transition hover:bg-white sm:right-5 sm:h-12 sm:w-12 dark:border-white/10 dark:bg-black/60 dark:hover:bg-black/80"
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </>
            )}

            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-center text-[11px] text-white backdrop-blur sm:bottom-5">
              {zoom === 1 ? "Cliquez ou double-cliquez pour zoomer" : "Déplacez le pointeur pour explorer"}
            </div>
          </main>

          {/* Thumbnails */}
          {images.length > 1 && (
            <footer className="flex shrink-0 justify-center overflow-x-auto border-t border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#10110f]">
              <div className="flex gap-2">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => changeImage(index)}
                    aria-label={`Afficher la photo ${index + 1}`}
                    aria-current={active === index}
                    className={
                      "shrink-0 border-2 p-0.5 transition " +
                      (active === index ? "border-[#ffd100]" : "border-transparent opacity-55 hover:opacity-100")
                    }
                  >
                    <SmartImage src={image} alt="" className="h-12 w-16 bg-[#f3f3f0] sm:h-14 sm:w-20 dark:bg-[#242521]" imgClassName="object-contain p-1" />
                  </button>
                ))}
              </div>
            </footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}