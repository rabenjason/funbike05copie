import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faArrowUpRightFromSquare,
  faClock,
  faEnvelope,
  faLocationCrosshairs,
  faLocationDot,
  faMinus,
  faPhone,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

import type { Dealer } from "../types";
import { DEALERS } from "../data/dealers";

export type { Dealer };
export { DEALERS };

const ZOOMS = [0.22, 0.12, 0.065, 0.035];
const osmEmbed = (lat: number, lon: number, d: number) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lon}`;
const directionsLink = (d: Dealer) => `https://www.google.com/maps/dir/?api=1&destination=${d.lat},${d.lon}`;
const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

const ICON = "w-4 shrink-0 text-[#98741b] dark:text-[#ffd100]";
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40 dark:text-white/40";

export default function Dealers({ go, initialCity }: { go: (p: string, id?: string) => void; initialCity?: string }) {
  const valid = DEALERS.some((d) => d.key === initialCity);
  const [activeKey, setActiveKey] = useState(valid ? initialCity! : DEALERS[0].key);
  const [zoom, setZoom] = useState(1);
  const [mapReady, setMapReady] = useState(false);
  const [mapEnabled, setMapEnabled] = useState(false);
  const locatorRef = useRef<HTMLDivElement>(null);
  const dealerTrackRef = useRef<HTMLUListElement>(null);
  const [sliderAtStart, setSliderAtStart] = useState(true);
  const [sliderAtEnd, setSliderAtEnd] = useState(false);
  const dealer = DEALERS.find((d) => d.key === activeKey)!;

  useEffect(() => {
    if (initialCity && DEALERS.some((d) => d.key === initialCity)) select(initialCity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCity]);

  function select(key: string, scroll = false) {
    if (key !== activeKey) {
      setActiveKey(key);
      setZoom(1);
      setMapReady(false);
      setMapEnabled(false);
    }
    if (scroll) requestAnimationFrame(() => locatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function changeZoom(delta: 1 | -1) {
    setZoom((z) => Math.max(0, Math.min(ZOOMS.length - 1, z + delta)));
    setMapReady(false);
  }

  /* Slider des fiches revendeurs : les flèches parcourent la liste générée
     depuis src/data/dealers.ts, quel que soit le nombre de revendeurs. */
  function updateSliderEdges() {
    const el = dealerTrackRef.current;
    if (!el) return;
    setSliderAtStart(el.scrollLeft <= 4);
    setSliderAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  function scrollDealers(direction: 1 | -1) {
    const el = dealerTrackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 240), behavior: "smooth" });
  }

  useEffect(() => {
    updateSliderEdges();
    window.addEventListener("resize", updateSliderEdges);
    return () => window.removeEventListener("resize", updateSliderEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-x-hidden bg-white text-[#171816] dark:bg-[#141513] dark:text-[#f2f0ea]">
      <div className="mx-auto w-full max-w-(--container-site) px-4 pb-10 pt-6 sm:px-7 sm:pb-10 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">
        {/* ---------------- Locator ---------------- */}
        <div ref={locatorRef} className="scroll-mt-20">
          <h1 className="mb-4 font-display text-[clamp(1.45rem,1.2rem+1.1vw,2.15rem)] font-semibold leading-tight tracking-[-0.05em]">
            Choisissez votre ville.
          </h1>

          {/* Phones: 2×2 segmented grid (every city visible, no hidden scroll).
              ≥640px: underlined tabs on one row. Styles live in index.css (.dealer-city). */}
          <div
            role="tablist"
            aria-label="Choisir une ville"
            className="mb-4 grid grid-cols-2 gap-2 border-black/10 sm:flex sm:gap-0 sm:border-y dark:border-white/10"
          >
            {DEALERS.map((d) => (
              <button
                key={d.key}
                type="button"
                role="tab"
                aria-selected={activeKey === d.key}
                aria-controls="dealer-panel"
                onClick={() => select(d.key)}
                className="dealer-city"
              >
                <span className="truncate">{d.city}</span>
                {activeKey === d.key && (
                  <motion.span
                    layoutId="dealer-city-indicator"
                    className="absolute inset-x-0 bottom-0 hidden h-[3px] bg-[#ffd100] sm:block"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Map + selected dealer: stacked on phones, side by side from 1024px */}
          <div
            id="dealer-panel"
            role="tabpanel"
            className="grid overflow-hidden border border-black/10 bg-white lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] dark:border-white/10 dark:bg-[#1b1c19]"
          >
            <div className="relative aspect-[16/10] bg-[#e4e7dc] sm:aspect-auto sm:h-[320px] md:h-[340px] lg:h-full lg:min-h-[400px] dark:bg-[#232722]">
              {!mapReady && <div className="skeleton absolute inset-0" aria-hidden="true" />}
              <iframe
                key={`${dealer.key}-${zoom}`}
                title={`Carte OpenStreetMap de ${dealer.city}`}
                src={osmEmbed(dealer.lat, dealer.lon, ZOOMS[zoom])}
                loading="lazy"
                onLoad={() => setMapReady(true)}
                className="absolute inset-0 h-full w-full border-0 transition-opacity duration-300 dark:[filter:invert(0.9)_hue-rotate(180deg)_saturate(0.4)]"
                style={{ opacity: mapReady ? 1 : 0, pointerEvents: mapEnabled ? "auto" : "none" }}
              />

              {/* Tap to activate: lets the page scroll normally on touch screens */}
              {!mapEnabled && (
                <button
                  type="button"
                  onClick={() => setMapEnabled(true)}
                  aria-label={`Activer la carte interactive de ${dealer.city}`}
                  className="absolute inset-0 z-10 flex items-end justify-start p-3 text-left sm:p-4"
                >
                  <span className="inline-flex min-h-10 items-center gap-2 bg-[#171816] px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow-lg dark:bg-white dark:text-[#171816]">
                    <FontAwesomeIcon icon={faLocationCrosshairs} /> Explorer la carte
                  </span>
                </button>
              )}

              <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-4.5rem)] items-center gap-2 bg-white/95 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#171816] shadow-md backdrop-blur dark:bg-[#171816]/95 dark:text-white">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#ffd100]" />
                <span className="truncate">{dealer.city}</span>
              </div>

              <div className="absolute right-3 top-3 z-20 flex flex-col border border-black/10 bg-white shadow-md dark:border-white/10 dark:bg-[#171816]">
                <button
                  type="button"
                  aria-label="Zoomer sur la carte"
                  onClick={() => changeZoom(1)}
                  disabled={zoom === ZOOMS.length - 1}
                  className="grid h-10 w-10 place-items-center text-sm disabled:opacity-30"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
                <span className="h-px bg-black/10 dark:bg-white/10" />
                <button
                  type="button"
                  aria-label="Dézoomer la carte"
                  onClick={() => changeZoom(-1)}
                  disabled={zoom === 0}
                  className="grid h-10 w-10 place-items-center text-sm disabled:opacity-30"
                >
                  <FontAwesomeIcon icon={faMinus} />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={dealer.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex min-w-0 flex-col border-t border-black/10 p-4 sm:p-6 lg:border-l lg:border-t-0 lg:p-7 dark:border-white/10"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#876914] dark:text-[#ffd100]">{dealer.kind}</p>
                <h2 className="mt-1.5 font-display text-[clamp(1.4rem,1.15rem+1.4vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.05em]">
                  {dealer.name}
                </h2>
                <p className="mt-2 text-[14px] leading-6 text-black/60 dark:text-white/60">{dealer.desc}</p>

                <dl className="mt-4 divide-y divide-black/10 border-y border-black/10 text-[14px] dark:divide-white/10 dark:border-white/10">
                  <div className="flex gap-3 py-3">
                    <FontAwesomeIcon icon={faLocationDot} className={"mt-1 " + ICON} />
                    <div className="min-w-0">
                      <dt className={LABEL}>Adresse</dt>
                      <dd className="break-words">{dealer.address}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3 py-3">
                    <FontAwesomeIcon icon={faClock} className={"mt-1 " + ICON} />
                    <div className="min-w-0">
                      <dt className={LABEL}>Horaires</dt>
                      <dd>{dealer.hours}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3 py-3">
                    <FontAwesomeIcon icon={faPhone} className={"mt-1 " + ICON} />
                    <div className="min-w-0">
                      <dt className={LABEL}>Téléphone</dt>
                      <dd>
                        <a href={telHref(dealer.phone)} className="hover:underline">{dealer.phone}</a>
                      </dd>
                    </div>
                  </div>
                </dl>

                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Services">
                  {dealer.services.map((s) => (
                    <li
                      key={s}
                      className="border border-black/10 px-2 py-1 text-[11px] font-medium text-black/60 dark:border-white/10 dark:text-white/60"
                    >
                      {s}
                    </li>
                  ))}
                </ul>

                {/* Phones: primary action full width + two equal 48px buttons.
                    ≥640px: compact inline actions. */}
                <div className="mt-auto grid grid-cols-2 gap-2 pt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3">
                  <a
                    href={directionsLink(dealer)}
                    target="_blank"
                    rel="noreferrer"
                    className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 bg-[#ffd100] px-4 text-[12px] font-bold uppercase tracking-[0.08em] text-[#171816] transition active:scale-[0.98] hover:bg-[#ffe36b] sm:min-h-11 sm:text-[11px]"
                  >
                    Itinéraire <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  </a>
                  <a
                    href={telHref(dealer.phone)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 border border-black/15 text-[12px] font-bold uppercase tracking-[0.08em] transition active:scale-[0.98] sm:min-h-11 sm:border-0 sm:border-b sm:border-black/30 sm:text-[11px] dark:border-white/20"
                  >
                    <FontAwesomeIcon icon={faPhone} /> Appeler
                  </a>
                  <a
                    href={`mailto:${dealer.email}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 border border-black/15 text-[12px] font-bold uppercase tracking-[0.08em] transition active:scale-[0.98] sm:min-h-11 sm:border-0 sm:border-b sm:border-black/30 sm:text-[11px] dark:border-white/20"
                  >
                    <FontAwesomeIcon icon={faEnvelope} /> Écrire
                  </a>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="mt-2 text-[10px] leading-4 text-black/40 dark:text-white/40">
            Carte ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
              OpenStreetMap
            </a>{" "}
            et ses contributeurs. Confirmez l'adresse exacte avant de vous déplacer.
          </p>
        </div>

        {/* ---------------- Directory ---------------- */}
        <section className="mt-12 sm:mt-20" aria-labelledby="network-heading">
          <div className="mb-4 flex flex-col gap-1 border-t border-black/15 pt-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-3 dark:border-white/15">
            <h2 id="network-heading" className="font-display text-[clamp(1.4rem,1.15rem+1.5vw,2.7rem)] font-semibold tracking-[-0.05em]">
              D'une ville à l'autre.
            </h2>
            {/* Flèches du slider de fiches (voir plus bas) */}
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <p className="text-[13px] text-black/50 sm:text-sm dark:text-white/50">Touchez une adresse pour la situer sur la carte.</p>
              <div className="flex shrink-0 items-center border border-black/10 bg-white shadow-md dark:border-white/10 dark:bg-[#171816]">
                <button
                  type="button"
                  onClick={() => scrollDealers(-1)}
                  disabled={sliderAtStart}
                  aria-label="Fiches des revendeurs précédentes"
                  className="grid h-10 w-10 place-items-center text-sm disabled:opacity-30"
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                </button>
                <span className="h-5 w-px bg-black/10 dark:bg-white/10" />
                <button
                  type="button"
                  onClick={() => scrollDealers(1)}
                  disabled={sliderAtEnd}
                  aria-label="Fiches des revendeurs suivantes"
                  className="grid h-10 w-10 place-items-center text-sm disabled:opacity-30"
                >
                  <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            </div>
          </div>

          {/* Slider de fiches : une fiche par revendeur, générée depuis
              src/data/dealers.ts — s'adapte automatiquement au nombre de
              revendeurs, sur ordinateur, tablette et mobile. */}
          <ul
            ref={dealerTrackRef}
            onScroll={updateSliderEdges}
            aria-label="Fiches des revendeurs"
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none]"
          >
            {DEALERS.map((d) => {
              const selected = d.key === activeKey;
              return (
                <li key={d.key} className="w-[min(16.5rem,78%)] shrink-0 snap-start sm:w-[19rem] lg:w-[20rem]">
                  <button
                    type="button"
                    onClick={() => select(d.key, true)}
                    aria-current={selected ? "true" : undefined}
                    className="group relative flex min-h-[7.5rem] w-full flex-col items-start gap-1 border border-black/10 bg-white py-4 pl-4 pr-3 text-left transition hover:bg-black/[0.025] active:bg-black/[0.04] dark:border-white/10 dark:bg-[#1b1c19] dark:hover:bg-white/[0.03] dark:active:bg-white/[0.05]"
                  >
                    <span
                      aria-hidden="true"
                      className={"absolute inset-y-3 left-0 w-[3px] transition " + (selected ? "bg-[#ffd100]" : "bg-transparent")}
                    />
                    <span className="flex w-full items-start justify-between gap-2">
                      <span className="min-w-0 font-display text-[clamp(1.02rem,0.92rem+0.55vw,1.3rem)] font-semibold leading-tight">{d.city}</span>
                      <span className="grid h-10 w-10 shrink-0 place-items-center text-xs text-black/40 transition group-hover:translate-x-1 group-hover:text-[#98741b] dark:text-white/40 dark:group-hover:text-[#ffd100]">
                        <FontAwesomeIcon icon={faArrowRight} />
                      </span>
                    </span>
                    <span className="mt-0.5 block w-full truncate text-[12px] text-black/50 sm:hidden dark:text-white/50">
                      {d.name} · {d.address}
                    </span>
                    <span className="hidden w-full truncate text-sm text-black/60 sm:block dark:text-white/60">{d.name}</span>
                    <span className="hidden w-full truncate text-sm text-black/45 sm:block dark:text-white/45">{d.kind}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------------- Become a dealer ---------------- */}
        <section className="mt-12 border-t border-black/15 pt-8 sm:mt-20 sm:py-12 dark:border-white/15">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <h2 className="max-w-lg font-display text-[clamp(1.35rem,1.1rem+2vw,3rem)] font-semibold leading-[1.1] tracking-[-0.05em]">
              Et si la prochaine adresse était la vôtre ?
            </h2>
            {/* Phones: solid full-width button (48px) */}
            <button
              type="button"
              onClick={() => go("contact")}
              className="inline-flex min-h-12 w-full items-center justify-between gap-4 bg-[#171816] px-4 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition active:scale-[0.98] sm:hidden dark:bg-[#ffd100] dark:text-[#171816]"
            >
              Devenir revendeur <FontAwesomeIcon icon={faArrowRight} />
            </button>
            {/* Tablet / desktop: editorial underlined link */}
            <button
              type="button"
              onClick={() => go("contact")}
              className="hidden min-h-11 items-center gap-4 border-b-2 border-[#171816] text-[11px] font-bold uppercase tracking-[0.12em] transition hover:text-[#98741b] sm:inline-flex dark:border-[#ffd100] dark:hover:text-[#ffd100]"
            >
              Devenir revendeur <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
