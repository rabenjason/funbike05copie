import { homepageContent, homepageExclusiveBrands } from "../data/homepage";
import { brands } from "../data";
import { motion, type Variants } from "framer-motion";
import SmartImage from "./SmartImage";

const EXCLUSIVE_BRANDS = homepageExclusiveBrands.flatMap(({ brandId, tagline }) => {
  const brand = brands.find((item) => item.id === brandId);
  return brand?.logoUrl ? [{ key: brand.id, name: brand.name, tagline, image: brand.logoUrl }] : [];
});

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function BrandExclusif({ go }: { go: (p: string, id?: string) => void }) {
  return (
    <section className="py-10 sm:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-(--container-site) px-4 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-xl text-center sm:mx-0 sm:max-w-none sm:text-left">
          <div className="mb-6 flex flex-col items-center justify-center gap-2 border-t border-black/15 pt-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pt-8 dark:border-white/15">
            <div className="w-full text-center sm:w-auto sm:text-left">
              <p className="fluid-eyebrow font-bold uppercase tracking-[0.2em] text-[#876914] dark:text-[#ffd100]">
                {homepageContent.distributeur.surTitre}
              </p>
              <h2 className="mt-1.5 font-display text-[clamp(1.35rem,1.1rem+1.8vw,2.2rem)] font-semibold leading-tight tracking-[-0.04em] text-[#171816] dark:text-[#f2f0ea]">
                {homepageContent.distributeur.titre}
              </h2>
            </div>
            <button
              onClick={() => go("motos")}
              className="fluid-btn hidden items-center gap-2 border-b border-black/30 pb-0.5 font-bold uppercase text-black/50 transition hover:border-[#98741b] hover:text-[#98741b] dark:border-white/30 dark:text-white/50 dark:hover:border-[#ffd100] dark:hover:text-[#ffd100] sm:inline-flex"
            >
              {homepageContent.distributeur.boutonToutVoir}
            </button>
          </div>

          <motion.div
            variants={list}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-3 gap-2.5 sm:gap-5"
          >
            {EXCLUSIVE_BRANDS.map((brand) => (
              <motion.button
                key={brand.key}
                variants={item}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => go("motos", brand.name)}
                type="button"
                className="group flex flex-col items-center justify-between overflow-hidden border border-black/10 bg-white p-2.5 text-center shadow-xs transition hover:border-[#ffd100] hover:shadow-md sm:p-4 dark:border-white/10 dark:bg-[#1b1c19] dark:hover:border-[#ffd100]/60"
              >
                <div className="flex h-14 w-full items-center justify-center sm:h-20">
                  <SmartImage
                    src={brand.image}
                    alt={`${homepageContent.distributeur.logoPrefix} ${brand.name}`}
                    className="h-9 w-full max-w-[90px] sm:h-12 sm:max-w-[130px]"
                    imgClassName="object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="mt-2 w-full border-t border-black/[0.06] pt-2 dark:border-white/[0.06]">
                  <h3 className="truncate font-display text-[11px] font-bold uppercase tracking-wider text-[#171816] sm:text-xs dark:text-[#f2f0ea]">
                    {brand.name}
                  </h3>
                  <p className="mt-0.5 hidden truncate text-[10px] text-black/45 sm:block dark:text-white/45">
                    {brand.tagline}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>

          <div className="mt-5 text-center sm:hidden">
            <button
              onClick={() => go("motos")}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-black/55 transition hover:text-[#98741b] dark:text-white/55 dark:hover:text-[#ffd100]"
            >
              {homepageContent.distributeur.boutonToutesMotos} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
