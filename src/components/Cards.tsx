import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import type { Product } from "../types/product";
import { brands, mainProductImage, productGallery, productTypes } from "../data";
import SmartImage from "./SmartImage";

const brandName = (product: Product) => brands.find((brand) => brand.id === product.brandId)?.name ?? "Marque non renseignée";

export function BikeCard({ bike, go }: { bike: Product; go: (p: string, id?: string) => void }) {
  const gallery = productGallery(bike);
  const [active, setActive] = useState(0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fb-card group flex min-w-0 flex-col overflow-hidden text-left"
    >
      <div className="fb-stage-white relative aspect-[4/3] overflow-hidden">
        <button
          type="button"
          onClick={() => go("product", bike.id)}
          aria-label={`Découvrir ${bike.name}`}
          className="absolute inset-0 block"
        >
          <SmartImage
            src={gallery[active] ?? mainProductImage(bike)?.url ?? ""}
            alt={mainProductImage(bike)?.altText ?? bike.name}
            className="absolute inset-0"
            imgClassName="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04] sm:p-5"
          />
        </button>

        {gallery.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5">
            {gallery.map((_, index) => (
              <button
                key={`${bike.id}-image-${index}`}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Voir la photo ${index + 1}`}
                aria-current={active === index}
                className="grid h-7 min-w-7 place-items-center px-1"
              >
                <span
                  className={
                    "block h-[3px] transition-all " +
                    (active === index
                      ? "w-6 bg-[#171816] dark:bg-white"
                      : "w-1.5 bg-black/25 hover:bg-black/50 dark:bg-white/35 dark:hover:bg-white/70")
                  }
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t border-black/[0.07] p-4 sm:p-5 dark:border-white/[0.07]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
          {brandName(bike)}{bike.family ? ` · ${bike.family}` : ""}
        </p>
        <h3 className="mt-2 font-display text-[clamp(1.25rem,1.05rem+0.7vw,1.6rem)] font-bold uppercase leading-[1.05] tracking-[-0.02em] text-[#171816] dark:text-white">
          {bike.name}
        </h3>
        <p className="fluid-body mt-2.5 line-clamp-2 text-black/55 dark:text-white/55">{bike.description}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => go("product", bike.id)}
            className="fluid-btn inline-flex min-h-10 items-center gap-2.5 border border-black/25 px-4 py-2.5 font-bold uppercase text-[#171816] transition hover:border-[#171816] hover:bg-[#171816] hover:text-white dark:border-white/30 dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-[#171816]"
          >
            Découvrir
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px]" />
          </motion.button>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/60">
            {bike.price ?? "Sur devis"}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function partEyebrow(product: Product): string {
  const brand = brandName(product);
  if (product.categoryId === "pieces-detachees") {
    return brand === "Marque non renseignée" ? "Pièce détachée" : `Pièce ${brand}`;
  }
  const type = productTypes.find((item) => item.id === product.productTypeId)?.name;
  return type ? `${brand} / ${type}` : brand;
}

export function PartCard({
  part,
  go,
  onEnquire,
}: {
  part: Product;
  go?: (p: string, id?: string) => void;
  onEnquire?: (part: Product) => void;
}) {
  const openDetail = () => go?.("accessory", part.id);
  const image = mainProductImage(part);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="fb-card group min-w-0 overflow-hidden p-1.5 sm:p-2"
    >
      <button type="button" onClick={openDetail} aria-label={`Voir les détails de ${part.name}`} className="block w-full cursor-pointer text-left">
        <SmartImage
          src={image?.url ?? ""}
          alt={image?.altText ?? part.name}
          className="fb-card-media-white aspect-square"
          imgClassName="object-contain p-2 transition-transform duration-500 group-hover:scale-105 sm:p-3"
        />
      </button>
      <div className="px-1 pb-1 pt-2.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#98741b] dark:text-[#ffd100]">{partEyebrow(part)}</p>
        <button type="button" onClick={openDetail} className="mt-1 block w-full cursor-pointer text-left">
          <h3 className="line-clamp-2 text-xs font-semibold leading-5 text-[#171816] transition group-hover:underline dark:text-[#f2f0ea]">{part.name}</h3>
        </button>
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-black/45 dark:text-white/45">{part.price ?? "Sur devis"}</p>
        {onEnquire && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEnquire(part); }}
            className="mt-2.5 flex min-h-10 w-full items-center justify-between gap-1 border-t border-black/10 pt-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-black/55 transition hover:text-[#171816] dark:border-white/10 dark:text-white/55 dark:hover:text-white"
          >
            Se renseigner <FontAwesomeIcon icon={faArrowRight} />
          </button>
        )}
      </div>
    </motion.article>
  );
}
