import { homepage, homepageContent, homepageCategories } from "../data/homepage";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faGears,
  faHelmetSafety,
  faLocationDot,
  faMotorcycle,
  faShirt,
} from "@fortawesome/free-solid-svg-icons";
import { motorcycles, brands, spareParts, helmets, ridingGear, mainProductImage } from "../data";
import type { Product } from "../types/product";
import { Section } from "../components/Layout";
import { BikeCard, PartCard } from "../components/Cards";
import { AccessoryBrandQuickLinks } from "../components/AccessoryBrands";
import ShercoBanner from "../components/ShercoBanner";
import BrandExclusif from "../components/BrandExclusif";
import NewArrivals from "../components/NewArrivals";
import TypedText from "../components/TypedText";

const HERO_PRODUCTS = homepage.heroFeaturedProductIds.map((id) => motorcycles.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
const brandName = (product: Product) => brands.find((brand) => brand.id === product.brandId)?.name ?? "Marque non renseignée";
const shortName = (product: Product) => homepage.heroProductLabels[product.id as keyof typeof homepage.heroProductLabels] ?? product.name;

const CATEGORY_ICONS = [faMotorcycle, faHelmetSafety, faGears, faShirt];

export default function Home({ go }: { go: (p: string, id?: string) => void }) {
  const [activeHero, setActiveHero] = useState(0);
  const current = HERO_PRODUCTS[activeHero];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHero((index) => (index + 1) % HERO_PRODUCTS.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="overflow-hidden bg-white text-[#171816] dark:bg-[#141513] dark:text-[#f2f0ea]">
      {/* Full-bleed hero image with a smooth contrast veil for the headline */}
      <section className="relative isolate min-h-[max(560px,calc(100svh-64px))] overflow-hidden bg-[#22231f] sm:min-h-[720px] lg:min-h-[min(820px,calc(100svh-68px))]">
        <AnimatePresence initial={false} mode="sync">
          <motion.img
            key={current.id}
            src={mainProductImage(current)?.url ?? ""}
            alt={mainProductImage(current)?.altText ?? current.name}
            initial={{ opacity: 0, scale: 1.035 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.7 }, scale: { duration: 7, ease: "linear" } }}
            className="absolute inset-0 h-full w-full object-cover object-[center_52%]"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/20 lg:via-black/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

        {/* Mobile order: text → "À la une" bar → buttons at the very bottom.
            Desktop order: text → buttons → "À la une" bar. */}
        <div className="relative z-10 mx-auto flex min-h-[max(560px,calc(100svh-64px))] w-full max-w-(--container-site) flex-col px-5 pb-4 pt-10 sm:min-h-[720px] sm:px-7 sm:pb-9 sm:pt-16 lg:min-h-[min(820px,calc(100svh-68px))] lg:px-10 lg:pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="order-1 w-full max-w-[820px]"
          >
            <p className="fluid-eyebrow flex items-center gap-2 font-bold uppercase leading-snug text-white/75">
              <FontAwesomeIcon icon={faLocationDot} className="shrink-0 text-[#ffd100]" />
              <span>{homepageContent.hero.localisation}</span>
            </p>
            <h1 className="fluid-hero mt-4 max-w-xl text-balance font-display font-semibold text-white sm:mt-7">
              {homepageContent.hero.titreLigne1}
              <br className="hidden sm:inline" /> {homepageContent.hero.titreLigne2}
            </h1>
            <p className="fluid-body mt-3.5 max-w-md text-pretty text-white/80 sm:mt-4">
              {homepageContent.hero.description}
            </p>
            <p className="fluid-body mt-3 flex items-center text-white/90">
              {homepageContent.hero.sloganPrefix}&nbsp;
              <TypedText strings={[...homepageContent.hero.usages]} className="font-semibold text-[#ffd100]" />
            </p>
          </motion.div>

          {/* Buttons — mobile: full-width, stacked, anchored at the bottom (chat sits right above) */}
          <motion.div
            id="hero-cta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="order-3 mt-3 grid w-full grid-cols-1 gap-2.5 sm:order-2 sm:mt-8 sm:flex sm:w-auto sm:flex-wrap sm:gap-3"
          >
            <button
              onClick={() => go("catalogue")}
              className="fluid-btn inline-flex min-h-12 w-full items-center justify-center gap-3 bg-[#ffd100] px-5 py-3 text-center font-bold uppercase text-[#171816] transition active:scale-[0.98] hover:bg-white sm:min-h-11 sm:w-auto"
            >
              {homepageContent.hero.boutonCatalogue} <FontAwesomeIcon icon={faArrowRight} className="shrink-0" />
            </button>
            <button
              onClick={() => go("product", current.id)}
              className="hero-secondary-cta glass-panel fluid-btn inline-flex min-h-12 w-full items-center justify-center gap-3 border-white/40 bg-white/10 px-5 py-3 text-center font-bold uppercase text-white transition active:scale-[0.98] hover:border-[#ffd100] hover:text-[#ffd100] sm:min-h-11 sm:w-auto"
            >
              <span className="truncate">{shortName(current)}</span>
              <FontAwesomeIcon icon={faArrowRight} className="shrink-0" />
            </button>
          </motion.div>

          <div className="order-2 mt-auto flex items-center justify-between gap-3 border-t border-white/30 pr-16 pt-3 sm:order-3 sm:items-end sm:gap-4 sm:pr-0 sm:pt-5">
            <div className="min-w-0 text-white">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.id + "caption"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ffd100]">{homepageContent.hero.aLaUne} / {brandName(current)}</p>
                  <p className="mt-0.5 truncate font-display text-sm font-semibold sm:mt-1 sm:text-base">
                    {shortName(current)} · {homepageContent.hero.annee}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              <span className="font-display text-[11px] font-semibold text-white/70 sm:mr-1 sm:text-xs">
                0{activeHero + 1}
              </span>
              <div className="flex items-center" aria-label={homepageContent.hero.choisirModele}>
                {HERO_PRODUCTS.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveHero(index)}
                    aria-label={`${homepageContent.hero.afficherModele} ${shortName(item)}`}
                    aria-pressed={activeHero === index}
                    className="group grid h-11 w-8 place-items-center px-1.5 sm:h-9"
                  >
                    <span className="block h-[3px] w-full bg-white/45 transition-all group-aria-pressed:bg-[#ffd100]" />
                  </button>
                ))}
              </div>
              <span className="font-display text-[11px] font-semibold text-white/50 sm:text-xs">03</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category index: compact links instead of large category tiles */}
      <section className="mx-auto w-full max-w-(--container-site) px-4 py-10 sm:px-7 sm:py-12 lg:px-10 lg:py-16">
        <div className="grid gap-5 border-t border-black/15 pt-4 dark:border-white/15 sm:grid-cols-[0.75fr_1.25fr] sm:gap-8">
          <div>
            <p className="fluid-eyebrow mb-2 font-bold uppercase text-[#98741b] dark:text-[#ffd100]">
              {homepageContent.univers.surTitre}
            </p>
            <h2 className="fluid-h2 font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">
              {homepageContent.univers.titre}
            </h2>
          </div>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {homepageCategories.map((category, index) => (
              <motion.button
                key={category.title}
                onClick={() => go(category.to, "brand" in category ? category.brand : undefined)}
                whileHover={{ x: 4 }}
                className="group flex min-h-14 items-center gap-3 border-b border-black/10 px-2 py-3 text-left transition hover:bg-white/65 hover:backdrop-blur-xl dark:border-white/15 dark:hover:bg-white/[0.035]"
              >
                <span className="w-7 font-display text-[10px] text-black/40 dark:text-white/40">0{index + 1}</span>
                <FontAwesomeIcon icon={CATEGORY_ICONS[index]} className="w-4 text-[12px] text-[#98741b] dark:text-[#ffd100]" />
                <span className="flex-1 font-display text-sm font-semibold text-[#171816] dark:text-[#f2f0ea]">{category.title}</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-[10px] text-black/40 transition group-hover:translate-x-1 group-hover:text-[#98741b] dark:text-white/40 dark:group-hover:text-[#ffd100]" />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <ShercoBanner go={go} />

      <BrandExclusif go={go} />

      <NewArrivals go={go} />

      <Section
        title={homepageContent.motos.titre}
        subtitle={homepageContent.motos.description}
        number={homepageContent.motos.numero}
      >
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8">
          {HERO_PRODUCTS.map((product) => <BikeCard key={product.id} bike={product} go={go} />)}
        </div>
        <button
          onClick={() => go("motos")}
          className="mt-8 inline-flex items-center gap-2 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
        >
          {homepageContent.motos.bouton} <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </Section>

      <section className="border-y border-[#e8d574]/50 bg-[#fff9df]/65 backdrop-blur-2xl dark:border-white/10 dark:bg-[#1c1d19]">
        <div className="mx-auto w-full max-w-(--container-site) px-4 py-10 sm:px-7 sm:py-12 lg:px-10 lg:py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-t border-black/15 pt-4 dark:border-white/15 sm:mb-7">
            <div>
              <p className="fluid-eyebrow mb-2 font-bold uppercase text-[#98741b] dark:text-[#ffd100]">{homepageContent.atelier.surTitre}</p>
              <h2 className="fluid-h2 font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">
                {homepageContent.atelier.titre}
              </h2>
            </div>
            <p className="fluid-body max-w-sm text-black/55 dark:text-white/55">
              {homepageContent.atelier.description}
            </p>
          </div>

          <div className="mb-6">
            <AccessoryBrandQuickLinks onSelect={(brand) => go("equipements", brand)} />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-5">
            {[...spareParts.filter((product) => product.compatibleBrandIds?.includes("tvs")).slice(0, 2), [...helmets, ...ridingGear].filter((product) => product.brandId === "tvs")[0], [...helmets, ...ridingGear].filter((product) => product.brandId === "tvs")[2]].map((part) => (
              <PartCard
                key={part.id}
                part={part}
                go={go}
                onEnquire={() => go("contact", part.id)}
              />
            ))}
          </div>
          <button
            onClick={() => go("equipements")}
          className="mt-8 inline-flex items-center gap-2 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
          >
            {homepageContent.atelier.bouton} <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </section>

      <section className="glass-header overflow-hidden border-y border-white/70 py-10 dark:border-white/10">
        <div className="mx-auto w-full max-w-(--container-site) px-4 sm:px-7 lg:px-10">
          <div className="mb-5 flex items-center justify-between border-t border-black/15 pt-3 dark:border-white/15">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/45 dark:text-white/45">{homepageContent.partenaires.titre}</p>
            <span className="text-[9px] uppercase tracking-[0.16em] text-black/35 dark:text-white/35">{homepageContent.partenaires.description}</span>
          </div>
          <div className="group/marquee relative overflow-hidden">
            {/* Fade edges so logos slide in and out smoothly */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-24 dark:from-[#141513]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-24 dark:from-[#141513]"
            />

            <div className="fb-partner-track flex w-max items-center gap-6 pr-6 sm:gap-10 sm:pr-10">
              {[...brands.filter((brand) => brand.logoUrl), ...brands.filter((brand) => brand.logoUrl)].map((brand, index) => (
                <motion.div
                  key={`${brand.name}-${index}`}
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 320, damping: 20 }}
                  className="brand-logo-tile shrink-0"
                >
                  <img
                    src={brand.logoUrl ?? ""}
                    alt={`${homepageContent.partenaires.logoPrefix} ${brand.name}`}
                    loading="lazy"
                    className="partner-logo h-full w-full object-contain transition-opacity hover:opacity-100"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}