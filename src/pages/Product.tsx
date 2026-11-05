import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight, faCheck, faMagnifyingGlassPlus, faPhone } from "@fortawesome/free-solid-svg-icons";
import { brands, motorcycles, productGallery, mainProductImage } from "../data";
import { Section } from "../components/Layout";
import { BikeCard } from "../components/Cards";
import SmartImage from "../components/SmartImage";
import ImageZoomViewer from "../components/ImageZoomViewer";

export default function Product({
  id,
  go,
  back,
  backLabel,
}: {
  id?: string;
  go: (p: string, i?: string) => void;
  back: (fallback?: import("../components/Layout").Route) => void;
  canGoBack?: boolean;
  backLabel?: string;
}) {
  const bike = motorcycles.find((item) => item.id === id) ?? motorcycles[0];
  const gallery = productGallery(bike);
  const brand = brands.find((item) => item.id === bike.brandId)?.name ?? "Marque non renseignée";
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const related = motorcycles.filter((item) => item.id !== bike.id && item.family === bike.family).slice(0, 4);

  return (
    <div className="overflow-x-hidden bg-white dark:bg-[#141513]">
      <div className="mx-auto w-full max-w-(--container-site) px-4 pt-4 sm:px-7 sm:pt-6 lg:px-10">
        <button
          type="button"
          onClick={() => back()}
          className="inline-flex min-h-11 max-w-full items-center gap-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-black/50 transition hover:text-[#98741b] sm:tracking-[0.14em] dark:text-white/50 dark:hover:text-[#ffd100]"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="shrink-0" />
          <span className="truncate">Retour{backLabel ? ` — ${backLabel}` : ""}</span>
        </button>
      </div>

      <div className="mx-auto grid min-w-0 w-full max-w-(--container-site) gap-7 px-4 pb-8 pt-3 sm:px-7 sm:py-8 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-10">
        <div className="min-w-0 lg:col-span-7">
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            aria-label={`Agrandir ${bike.name}`}
            className="glass-panel product-media-stage group relative block aspect-[4/3] w-full min-w-0 cursor-zoom-in overflow-hidden p-2 text-left sm:aspect-[16/10]"
          >
            <SmartImage
              src={gallery[active]}
              alt={mainProductImage(bike)?.altText ?? bike.name}
              eager
              className="h-full w-full"
              imgClassName="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.025] sm:p-5"
            />
            <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate border border-white/60 bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#171816] shadow-sm backdrop-blur-xl sm:bottom-5 sm:left-5 sm:tracking-[0.14em]">
              {brand} / {bike.family}
            </span>
            <span className="absolute right-3 top-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#171816] shadow-sm backdrop-blur transition group-hover:bg-white dark:border-white/10 dark:bg-black/55 dark:text-white dark:group-hover:bg-black/75">
              <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
              <span className="hidden sm:inline">Agrandir</span>
            </span>
          </button>
          {gallery.length > 1 && (
            <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {gallery.map((image, index) => (
                <button
                  key={image}
                  onClick={() => setActive(index)}
                  aria-label={`Voir la photo ${index + 1}`}
                  aria-pressed={active === index}
                  className={"shrink-0 snap-start border-b-2 bg-white p-1 transition " + (active === index ? "border-[#ffd100] opacity-100" : "border-transparent opacity-60 hover:opacity-100")}
                >
                  <SmartImage src={image} alt={`${bike.name}, vue ${index + 1}`} className="h-14 w-[5.25rem] sm:h-16 sm:w-24" imgClassName="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="min-w-0 lg:col-span-5 lg:py-4"
        >
          <p className="fluid-eyebrow break-words font-bold uppercase leading-relaxed text-[#98741b] dark:text-[#ffd100]">
            {brand} / {bike.family} {bike.badge ? `/ ${bike.badge}` : ""}
          </p>
          <h1 className="fluid-h1 mt-2.5 break-words font-display font-semibold text-[#171816] [overflow-wrap:anywhere] dark:text-[#f2f0ea] sm:mt-3">
            {bike.name}
          </h1>
          <p className="fluid-body mt-3.5 max-w-xl text-pretty text-black/60 dark:text-white/60 sm:mt-4">{bike.description}</p>

          <dl className="mt-6 min-w-0 border-t border-black/15 dark:border-white/15 sm:mt-7">
            {bike.specifications.map((spec, index) => (
              <div key={spec.key} className="grid min-w-0 grid-cols-[1.75rem_minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-1.5 border-b border-black/15 py-3 dark:border-white/15 sm:grid-cols-[2.2rem_1fr_1.2fr] sm:gap-2">
                <span className="font-display text-[10px] text-black/35 dark:text-white/35">0{index + 1}</span>
                <dt className="min-w-0 break-words text-[9px] font-bold uppercase leading-4 tracking-[0.07em] text-black/50 dark:text-white/50 sm:text-[10px] sm:tracking-[0.1em]">{spec.key}</dt>
                <dd className="min-w-0 break-words text-right text-[11px] font-semibold leading-4 text-[#171816] dark:text-[#f2f0ea] sm:text-xs">{spec.value}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-6 min-w-0 border-y border-black/15 dark:border-white/15 sm:mt-8" aria-label="Prix et contact">
            {/* Desktop: price and CTA share one aligned row. Mobile: CTA fills the width. */}
            <div className="grid min-w-0 gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                  Prix & disponibilité
                </p>
                <p className="mt-1 font-display text-[clamp(1.25rem,1.1rem+0.6vw,1.65rem)] font-semibold leading-none text-[#171816] dark:text-[#f2f0ea]">
                  {bike.price ?? "Sur devis"}
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => go("contact")}
                className="fluid-btn inline-flex min-h-12 w-full min-w-0 items-center justify-between gap-4 bg-[#ffd100] px-4 py-3 text-left font-bold uppercase text-[#171816] transition hover:bg-[#ffe36b] lg:min-w-[210px] lg:w-auto lg:px-5 sm:px-4"
              >
                Demander un devis
                <FontAwesomeIcon icon={faArrowRight} className="shrink-0" />
              </motion.button>
            </div>

            {/* Reassurance and secondary contact stay visually attached to the CTA. */}
            <div className="flex min-w-0 flex-col gap-3 border-t border-black/[0.07] py-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
              <p className="flex min-w-0 items-start gap-2 text-[11px] leading-5 text-black/50 dark:text-white/50">
                <FontAwesomeIcon icon={faCheck} className="mt-1 shrink-0 text-[#98741b] dark:text-[#ffd100]" />
                <span>Un conseiller confirme le modèle, le stock et les options disponibles.</span>
              </p>

              <button
                type="button"
                onClick={() => go("contact")}
                className="inline-flex min-h-10 max-w-full shrink-0 items-center gap-2 self-start border-b border-black/25 text-[10px] font-bold uppercase tracking-[0.08em] text-black/60 transition hover:border-[#98741b] hover:text-[#98741b] dark:border-white/25 dark:text-white/60 dark:hover:border-[#ffd100] dark:hover:text-[#ffd100] sm:self-auto sm:tracking-[0.1em]"
              >
                <FontAwesomeIcon icon={faPhone} />
                Contacter l'équipe
              </button>
            </div>
          </section>
          {bike.brandId === "tvs" && (
            <button
              type="button"
              onClick={() => go("equipements", "tvs")}
              className="mt-4 inline-flex min-h-11 items-center gap-2 border-b border-black/20 text-[11px] font-bold uppercase tracking-[0.08em] text-black/65 transition hover:text-[#98741b] dark:border-white/20 dark:text-white/65 dark:hover:text-[#ffd100]"
            >
              Casques, blousons et gants TVS
              <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
            </button>
          )}
        </motion.div>
      </div>

      {related.length > 0 && (
        <Section title="Dans le même esprit" subtitle="D'autres modèles à découvrir." number="À explorer / 02">
          <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {related.map((item) => <BikeCard key={item.id} bike={item} go={go} />)}
          </div>
        </Section>
      )}

      <ImageZoomViewer
        open={viewerOpen}
        images={gallery}
        active={active}
        alt={bike.name}
        onActiveChange={setActive}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}