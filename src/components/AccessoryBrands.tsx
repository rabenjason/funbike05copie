import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { brands } from "../data";

export type AccessoryBrandKey = "tld" | "gaerne" | "mt" | "tvs" | "bihr";

export type AccessoryBrand = {
  key: AccessoryBrandKey;
  name: string;
  logo?: string;
  icon?: IconDefinition;
  alt: string;
};

const logoOf = (name: string) => brands.find((brand) => brand.name === name)?.logoUrl ?? "";

/** Marques d'équipements pilote. */
export const ACCESSORY_BRANDS: AccessoryBrand[] = [
  {
    key: "tld",
    name: "Troy Lee Designs",
    logo: logoOf("Troy Lee Designs"),
    alt: "Logo Troy Lee Designs",
  },
  { key: "gaerne", name: "Gaerne", logo: logoOf("Gaerne"), alt: "Logo Gaerne" },
  { key: "mt", name: "MT Helmets", logo: logoOf("MT Helmets"), alt: "Logo MT Helmets" },
  { key: "tvs", name: "TVS", logo: logoOf("TVS"), alt: "Logo TVS" },
  { key: "bihr", name: "BIHR", logo: logoOf("Bihr"), alt: "Logo Bihr" },
];

/** Brand mark in one fixed-size slot so every selector logo has the same footprint. */
export function BrandVisual({ brand }: { brand: Pick<AccessoryBrand, "logo" | "icon"> }) {
  if (brand.icon) {
    return (
      <span className="brand-logo-slot text-sm text-[#98741b] dark:text-[#ffd100]" aria-hidden="true">
        <FontAwesomeIcon icon={brand.icon} />
      </span>
    );
  }

  return (
    <span className="brand-logo-slot">
      <img src={brand.logo} alt="" className="partner-logo" />
    </span>
  );
}

export function AccessoryBrandSelector({
  active,
  onSelect,
}: {
  active: AccessoryBrandKey;
  onSelect: (brand: AccessoryBrandKey) => void;
}) {
  return (
    <div className="no-scrollbar flex overflow-x-auto border-b border-black/15 dark:border-white/15">
      {ACCESSORY_BRANDS.map((brand) => {
        const selected = active === brand.key;
        return (
          <button
            key={brand.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(brand.key)}
            className={
              "relative flex min-w-max items-center gap-2.5 px-3 py-3 text-left transition sm:px-5 " +
              (selected ? "bg-[#ffd100]/15" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]")
            }
          >
            <BrandVisual brand={brand} />
            <span
              className={
                "block truncate text-xs font-bold " +
                (selected ? "text-[#171816] dark:text-[#f2f0ea]" : "text-black/50 dark:text-white/50")
              }
            >
              {brand.name}
            </span>
            {selected && (
              <>
                <motion.span
                  aria-hidden="true"
                  layoutId="accessory-brand-border"
                  className="pointer-events-none absolute inset-0 border border-[#ffd100]"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
                <motion.span
                  aria-hidden="true"
                  layoutId="accessory-brand-active"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[#ffd100]"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AccessoryBrandQuickLinks({ onSelect }: { onSelect: (brand: AccessoryBrandKey) => void }) {
  return (
    <div className="grid grid-cols-2 border-y border-black/15 sm:flex sm:flex-wrap dark:border-white/15">
      {ACCESSORY_BRANDS.map((brand, index) => (
        <motion.button
          key={brand.key}
          type="button"
          onClick={() => onSelect(brand.key)}
          whileHover={{ x: 3 }}
          className={
            "group grid w-full min-w-0 grid-cols-[3.25rem_minmax(0,1fr)_1rem] items-center gap-1.5 border-b border-r border-black/10 px-2 py-2.5 text-left transition hover:bg-white/50 even:border-r-0 sm:w-auto sm:flex-none sm:grid-cols-[3.25rem_auto_1rem] sm:gap-2 sm:border-b-0 sm:px-4 sm:even:border-r sm:last:border-r-0 dark:border-white/10 dark:hover:bg-white/[0.04] " +
            (index === ACCESSORY_BRANDS.length - 1 && ACCESSORY_BRANDS.length % 2 ? "col-span-2 sm:col-span-1" : "")
          }
        >
          <BrandVisual brand={brand} />
          <span className="min-w-0 truncate text-[10px] font-bold text-black/65 dark:text-white/65">{brand.name}</span>
          <FontAwesomeIcon
            icon={faArrowUpRightFromSquare}
            className="justify-self-end text-[10px] text-black/35 transition group-hover:text-[#98741b] dark:text-white/35 dark:group-hover:text-[#ffd100]"
          />
        </motion.button>
      ))}
    </div>
  );
}
