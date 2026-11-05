import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGears, faMagnifyingGlass, type IconDefinition } from "@fortawesome/free-solid-svg-icons";
import {
  motorcycles,
  brands,
  spareParts,
  helmets,
  ridingGear,
  accessories,
  productTypes,
} from "../data";
import type { Product } from "../types/product";
import { Section } from "../components/Layout";
import { BikeCard, PartCard } from "../components/Cards";
import { BikeCardSkeleton, PartCardSkeleton } from "../components/Skeletons";
import Pagination from "../components/Pagination";
import { useBriefLoading } from "../hooks/useBriefLoading";
import {
  ACCESSORY_BRANDS,
  AccessoryBrandSelector,
  BrandVisual,
  type AccessoryBrand,
  type AccessoryBrandKey,
} from "../components/AccessoryBrands";

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const FAMILIES = ["Tous", "Off-road", "Urbain", "3 roues"] as const;
const BIKES_PER_PAGE = 6;
const PARTS_PER_PAGE = 8;

const brandProducts = (brandId: string) => [...helmets, ...ridingGear, ...accessories].filter((product) => product.brandId === brandId);
const GEAR_BY_BRAND: Record<AccessoryBrandKey, Product[]> = {
  tld: brandProducts("troy-lee-designs"),
  gaerne: brandProducts("gaerne"),
  mt: brandProducts("mt-helmets"),
  tvs: brandProducts("tvs"),
  bihr: [],
};

const TVS_CATEGORIES = ["Tous", "Casques", "Blousons", "Gants"] as const;

const SPARE_BRANDS = ["Toutes", "TVS", "Sherco", "Fantic", "BIHR"] as const;
type SpareBrand = (typeof SPARE_BRANDS)[number];

const SPARE_BRAND_TABS: { key: SpareBrand; name: string; logo?: string; icon?: IconDefinition }[] = [
  { key: "Toutes", name: "Toutes", icon: faGears },
  ...(["TVS", "Sherco", "Fantic", "BIHR"] as const).map((name) => ({
    key: name as SpareBrand,
    name,
    logo: brands.find((brand) => brand.name.toLowerCase() === name.toLowerCase())?.logoUrl ?? "",
  })),
];

const SPARE_TYPES = ["Toutes", "Pneus", "Freinage", "Transmission", "Filtration", "Pièces moteur", "Consommables"] as const;
type SpareType = (typeof SPARE_TYPES)[number];
const SPARE_TYPE_IDS: Partial<Record<SpareType, string>> = {
  Pneus: "pneus", Freinage: "freinage", Transmission: "transmission", Filtration: "filtration",
  "Pièces moteur": "pieces-moteur", Consommables: "consommables",
};

const ALL_ITEMS = [...spareParts, ...helmets, ...ridingGear, ...accessories];
const normalizeSearch = (value: string) => value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const containsAll = (text: string, terms: string[]) => {
  const normalized = normalizeSearch(text);
  return terms.every((term) => normalized.includes(term));
};
const getBrandName = (id: string) => brands.find((brand) => brand.id === id)?.name ?? "Marque non renseignée";
const getTypeName = (id: string) => productTypes.find((type) => type.id === id)?.name ?? "";
const itemLabel = (product: Product) => [
  product.name,
  getBrandName(product.brandId),
  getTypeName(product.productTypeId),
  ...(product.compatibleBrandIds ?? []).map(getBrandName),
].join(" ");
const productTypeForTvsCategory: Record<string, string> = {
  Casques: "casque", Blousons: "blousons", Gants: "gants",
};

function scrollToRef(ref: React.RefObject<HTMLDivElement | null>) {
  const el = ref.current;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top, behavior: "smooth" });
}

/* ------------------------------------------------------------------ */
/*  Panneau « marque partenaire » (produits sur demande)               */
/* ------------------------------------------------------------------ */

function BrandInfoPanel({
  logo,
  alt,
  title,
  text,
  lines,
  go,
}: {
  logo: string;
  alt: string;
  title: string;
  text: string;
  lines: string[];
  go: (page: string, id?: string) => void;
}) {
  return (
    <div className="grid gap-6 rounded-2xl border border-black/10 p-6 sm:p-8 md:grid-cols-[0.6fr_1.4fr] md:gap-12 dark:border-white/10">
      <div className="flex min-h-32 items-center justify-center">
        <img src={logo} alt={alt} className="partner-logo h-16 max-w-[200px] object-contain" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#98741b] dark:text-[#ffd100]">Marque partenaire Funbike</p>
        <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[#171816] dark:text-[#f2f0ea]">{title}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55 dark:text-white/55">{text}</p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {lines.map((line) => (
            <span key={line} className="inline-flex items-center gap-2 text-xs font-semibold text-black/65 dark:text-white/65">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffd100]" />
              {line}
            </span>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-black/10 pt-4 dark:border-white/10">
          <button
            onClick={() => go("contact")}
            className="bg-[#ffd100] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#171816] transition hover:bg-[#ffe36b]"
          >
            Demander les disponibilités
          </button>
          <span className="text-xs text-black/45 dark:text-white/45">Modèles et tarifs confirmés par notre équipe.</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tout le catalogue (aperçus)                                        */
/* ------------------------------------------------------------------ */

export function Catalogue({
  go,
  motosOnly = false,
  initialQuery,
}: {
  go: (p: string, id?: string) => void;
  motosOnly?: boolean;
  initialQuery?: string;
}) {
  const [family, setFamily] = useState<string>("Tous");
  const [query, setQuery] = useState(initialQuery ?? "");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const terms = useMemo(() => normalizeSearch(query).trim().split(/\s+/).filter(Boolean), [query]);
  const bikeList = useMemo(
    () =>
      motorcycles.filter(
        (bike) =>
          (family === "Tous" || bike.family === family) && containsAll(`${bike.name} ${getBrandName(bike.brandId)} ${bike.description} ${bike.family ?? ""}`, terms),
      ),
    [family, terms],
  );
  const partList = useMemo(
    () => (terms.length === 0 || motosOnly ? [] : ALL_ITEMS.filter((product) => containsAll(itemLabel(product), terms))),
    [terms, motosOnly],
  );

  const totalPages = Math.max(1, Math.ceil(bikeList.length / BIKES_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = bikeList.slice((safePage - 1) * BIKES_PER_PAGE, safePage * BIKES_PER_PAGE);
  const loading = useBriefLoading(`${family}-${safePage}`);

  function changePage(next: number) {
    setPage(next);
    scrollToRef(gridRef);
  }

  return (
    <div>

      <Section
        title="Véhicules"
        subtitle={`${bikeList.length} modèle(s) disponible(s) · page ${safePage} sur ${totalPages}`}
        number="01 / Motos"
      >
        <div
          ref={gridRef}
          className="mb-7 flex flex-col gap-4 border-b border-black/15 pb-4 dark:border-white/15 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {FAMILIES.map((x) => (
              <button
                key={x}
                onClick={() => {
                  setFamily(x);
                  setPage(1);
                }}
                aria-pressed={family === x}
                className={
                  "relative py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition " +
                  (family === x ? "text-[#171816] dark:text-white" : "text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white")
                }
              >
                {x}
                {family === x && <motion.span layoutId="family-filter" className="absolute inset-x-0 -bottom-[13px] h-[2px] bg-[#ffd100]" />}
              </button>
            ))}
          </div>
          <label className="flex min-h-11 w-full items-center gap-2 border-b border-black/20 pb-2 text-black/40 focus-within:border-[#a27b17] dark:border-white/20 dark:focus-within:border-[#ffd100] lg:max-w-sm">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={motosOnly ? "Rechercher une moto ou une marque" : "Motos, casques, blousons, pièces..."}
              aria-label="Rechercher dans le catalogue"
              className="min-w-0 flex-1 bg-transparent text-xs text-[#171816] outline-none placeholder:text-black/40 dark:text-[#f2f0ea] dark:placeholder:text-white/40"
            />
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {loading
            ? Array.from({ length: Math.max(visible.length, 3) }, (_, i) => <BikeCardSkeleton key={i} />)
            : visible.map((b) => <BikeCard key={b.id} bike={b} go={go} />)}
        </div>
        {!loading && bikeList.length === 0 && (
          <p className="py-12 text-center text-sm text-black/50 dark:text-white/50">
            {partList.length > 0 ? "Aucune moto correspondante. Des produits sont proposés plus bas." : "Aucun résultat pour cette recherche."}
          </p>
        )}

        <Pagination id={motosOnly ? "motos" : "catalogue"} page={safePage} total={totalPages} onChange={changePage} />
      </Section>

      {!motosOnly && (
        <>
          {partList.length > 0 && (
            <Section title="Résultats de recherche" subtitle={`${partList.length} produit(s) trouvé(s).`} number="02 / Résultats">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                {partList.map((p) => (
                  <PartCard key={p.id} part={p} go={go} onEnquire={p.categoryId === "pieces-detachees" || p.brandId === "tvs" ? () => go("contact", p.id) : undefined} />
                ))}
              </div>
            </Section>
          )}
          {!terms.length && (
            <Section title="Pièces & Consommables" subtitle="Pneus, kits chaîne, freinage, filtration et pièces mécaniques." number="02 / Atelier">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {spareParts.slice(0, 5).map((p) => (
                  <PartCard key={p.id} part={p} go={go} onEnquire={() => go("contact", p.id)} />
                ))}
              </div>
              <button
                onClick={() => go("spares")}
                className="mt-8 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
              >
                Voir toutes les pièces détachées
              </button>
            </Section>
          )}
          {!terms.length && (
            <Section title="Équipements pilote" subtitle="Casques, tenues, bottes et accessoires pour le pilote." number="03 / Équipement">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {[...GEAR_BY_BRAND.tvs.slice(0, 2), ...GEAR_BY_BRAND.tld.slice(0, 3)].map((p) => (
                  <PartCard key={p.id} part={p} go={go} onEnquire={p.brandId === "tvs" ? () => go("contact", p.id) : undefined} />
                ))}
              </div>
              <button
                onClick={() => go("equipements", "tvs")}
                className="mt-8 border-b border-[#171816] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#171816] transition hover:border-[#98741b] hover:text-[#98741b] dark:border-[#f2f0ea] dark:text-[#f2f0ea] dark:hover:text-[#ffd100]"
              >
                Voir les équipements pilote
              </button>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page ÉQUIPEMENTS                                                   */
/* ------------------------------------------------------------------ */

const GEAR_HEADING: Record<AccessoryBrandKey, { title: string; text: string }> = {
  tld: {
    title: "Troy Lee Designs",
    text: "Parcourez la collection pilote, puis contactez Funbike pour vérifier les tailles et coloris disponibles.",
  },
  gaerne: {
    title: "Bottes & chaussures moto Gaerne",
    text: "Sélectionnez votre pratique et votre pointure — l'équipe Funbike confirme la disponibilité.",
  },
  mt: {
    title: "Casques moto MT Helmets",
    text: "Choisissez un usage, puis contactez Funbike pour les tailles, coloris et tarifs disponibles.",
  },
  tvs: {
    title: "Équipements TVS",
    text: "Casques, blousons et gants TVS Racing : sélection de références issues du catalogue officiel TVS Motor.",
  },
  bihr: { title: "", text: "" },
};

export function Equipements({ go, initialBrand }: { go: (p: string, id?: string) => void; initialBrand?: string }) {
  const validBrand = ACCESSORY_BRANDS.some((brand) => brand.key === initialBrand);
  const [tab, setTab] = useState<AccessoryBrandKey>(validBrand ? (initialBrand as AccessoryBrandKey) : "tld");
  const [category, setCategory] = useState<string>("Tous");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const allItems = GEAR_BY_BRAND[tab];
  const items =
    tab === "tvs" && category !== "Tous" ? allItems.filter((item) => item.productTypeId === productTypeForTvsCategory[category]) : allItems;
  const totalPages = Math.max(1, Math.ceil(items.length / PARTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = items.slice((safePage - 1) * PARTS_PER_PAGE, safePage * PARTS_PER_PAGE);
  const loading = useBriefLoading(`gear-${tab}-${category}-${safePage}`);

  const heading = GEAR_HEADING[tab];
  const isBihr = tab === "bihr";

  return (
    <div>
      <Section
        title="Choisir une marque"
        subtitle="Touchez une marque pour afficher sa gamme et les informations utiles."
        number="01 / Équipements"
      >
        <div ref={gridRef}>
          <AccessoryBrandSelector
            active={tab}
            onSelect={(key) => {
              setTab(key);
              setCategory("Tous");
              setPage(1);
            }}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            aria-live="polite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="mt-8"
          >
            {isBihr ? (
              <BrandInfoPanel
                logo={brands.find((brand) => brand.id === "bihr")?.logoUrl ?? ""}
                alt="Logo Bihr"
                title="Équipements & accessoires Bihr"
                text="Casques, tenues, bottes, gants et accessoires pilote Bihr : sélection et disponibilité à confirmer avec l'équipe Funbike."
                lines={["Casques & tenues", "Bottes & gants", "Accessoires pilote"]}
                go={go}
              />
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[#171816] dark:text-[#f2f0ea]">{heading.title}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-black/55 dark:text-white/55">{heading.text}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
                    {items.length} références · page {safePage}/{totalPages}
                  </span>
                </div>

                {tab === "tvs" && (
                  <div role="tablist" aria-label="Catégories des équipements TVS" className="no-scrollbar mb-5 flex gap-5 overflow-x-auto border-b border-black/15 dark:border-white/15">
                    {TVS_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={category === cat}
                        onClick={() => {
                          setCategory(cat);
                          setPage(1);
                        }}
                        className={
                          "relative min-h-11 shrink-0 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors " +
                          (category === cat ? "text-[#171816] dark:text-white" : "text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white")
                        }
                      >
                        {cat}
                        {category === cat && <motion.span layoutId="tvs-category-active" className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ffd100]" />}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                  {loading
                    ? Array.from({ length: visible.length }, (_, i) => <PartCardSkeleton key={i} />)
                    : visible.map((part) => (
                        <PartCard key={part.id} part={part} go={go} onEnquire={() => go("contact", part.id)} />
                      ))}
                </div>

                {tab === "tvs" && (
                  <p className="mt-4 text-xs leading-5 text-black/50 dark:text-white/50">
                    Visuels et références du catalogue officiel TVS. Tarifs, tailles et disponibilités chez Funbike Madagascar à confirmer.
                  </p>
                )}

                <Pagination
                  id={`equipements-${tab}`}
                  page={safePage}
                  total={totalPages}
                  onChange={(next) => {
                    setPage(next);
                    scrollToRef(gridRef);
                  }}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page PIÈCES DÉTACHÉES                                               */
/* ------------------------------------------------------------------ */

const SPARE_ROUTE_MAP: Record<string, SpareBrand> = {
  "spare-tvs": "TVS",
  "spare-sherco": "Sherco",
  "spare-fantic": "Fantic",
  "spare-bihr": "BIHR",
};

function SpareBrandSelector({ active, onSelect }: { active: SpareBrand; onSelect: (brand: SpareBrand) => void }) {
  return (
    <div className="no-scrollbar flex overflow-x-auto border-b border-black/15 dark:border-white/15">
      {SPARE_BRAND_TABS.map((brand) => {
        const selected = active === brand.key;
        const visual: Pick<AccessoryBrand, "logo" | "icon"> = { logo: brand.logo, icon: brand.icon };
        return (
          <button
            key={brand.key}
            type="button"
            aria-pressed={selected}
            aria-controls="spare-parts-products"
            onClick={(event) => {
              onSelect(brand.key);
              event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            }}
            className={
              "relative flex min-w-max items-center gap-2.5 px-3 py-3 text-left transition sm:px-5 " +
              (selected ? "bg-[#ffd100]/15" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]")
            }
          >
            <BrandVisual brand={visual} />
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
                  layoutId="spare-brand-border"
                  className="pointer-events-none absolute inset-0 border border-[#ffd100]"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
                <motion.span
                  aria-hidden="true"
                  layoutId="spare-brand-active"
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

export function Spares({ go, initialBrand }: { go: (p: string, id?: string) => void; initialBrand?: string }) {
  const requested = initialBrand ? (SPARE_ROUTE_MAP[initialBrand] ?? "Toutes") : "Toutes";
  const [brand, setBrand] = useState<SpareBrand>(requested);
  const [type, setType] = useState<SpareType>("Toutes");
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      spareParts.filter(
        (part) =>
          (brand === "Toutes" || brand === "BIHR" || (part.compatibleBrandIds ?? []).includes(brand.toLowerCase())) &&
          (type === "Toutes" || part.productTypeId === SPARE_TYPE_IDS[type]),
      ),
    [brand, type],
  );

  const totalPages = Math.max(1, Math.ceil(items.length / PARTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = items.slice((safePage - 1) * PARTS_PER_PAGE, safePage * PARTS_PER_PAGE);
  const loading = useBriefLoading(`spares-${brand}-${type}-${safePage}`);

  const isBihr = brand === "BIHR";
  const title = brand === "Toutes" ? "Pièces détachées moto" : `Pièces détachées ${brand}`;
  const text =
    brand === "Toutes"
      ? "Pneus, kits chaîne, freinage, filtration, pièces mécaniques et consommables. Contactez-nous pour confirmer la compatibilité avec votre moto."
      : `Pièces et consommables compatibles ${brand}. Indiquez le modèle et l'année de votre moto pour vérifier les dimensions et la disponibilité.`;

  return (
    <div>
      <Section
        title="Choisir une marque"
        subtitle="Touchez une marque pour afficher ses pièces et consommables."
        number="01 / Pièces"
      >
        <div ref={gridRef}>
          <SpareBrandSelector
            active={brand}
            onSelect={(next) => {
              setBrand(next);
              setPage(1);
            }}
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={brand}
            aria-live="polite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="mt-8"
          >
            {isBihr ? (
              <BrandInfoPanel
                logo={brands.find((b) => b.id === "bihr")?.logoUrl ?? ""}
                alt="Logo Bihr"
                title="Pièces & consommables Bihr"
                text="Freinage, transmission, filtration et pièces mécaniques Bihr : compatibilité et disponibilité à confirmer avec l'équipe Funbike."
                lines={["Freinage", "Transmission", "Filtration", "Pièces moteur"]}
                go={go}
              />
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-[-0.04em] text-[#171816] dark:text-[#f2f0ea]">{title}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-black/55 dark:text-white/55">{text}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
                    {items.length} références · page {safePage}/{totalPages}
                  </span>
                </div>

                {/* Filtre TYPE */}
                <div role="tablist" aria-label="Type de pièce" className="no-scrollbar mb-5 flex gap-5 overflow-x-auto border-b border-black/15 dark:border-white/15">
                  {SPARE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={type === t}
                      onClick={() => {
                        setType(t);
                        setPage(1);
                      }}
                      className={
                        "relative min-h-11 shrink-0 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors " +
                        (type === t ? "text-[#171816] dark:text-white" : "text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white")
                      }
                    >
                      {t}
                      {type === t && <motion.span layoutId="spare-type-active" className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ffd100]" />}
                    </button>
                  ))}
                </div>

                <div id="spare-parts-products" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                  {loading
                    ? Array.from({ length: visible.length }, (_, i) => <PartCardSkeleton key={i} />)
                    : visible.map((part) => (
                        <PartCard key={part.id} part={part} go={go} onEnquire={() => go("contact", part.id)} />
                      ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-black/50 dark:text-white/50">
                  Produits simulés pour structurer le catalogue. Dimensions, compatibilité exacte et disponibilité à confirmer avec le modèle et l'année de la moto.
                </p>

                <Pagination
                  id={`spares-${brand}-${type}`}
                  page={safePage}
                  total={totalPages}
                  onChange={(next) => {
                    setPage(next);
                    scrollToRef(gridRef);
                  }}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </Section>
    </div>
  );
}
