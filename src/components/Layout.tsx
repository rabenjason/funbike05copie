import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faArrowUp,
  faBars,
  faClock,
  faCookieBite,
  faEnvelope,
  faGears,
  faHelmetSafety,
  faLocationDot,
  faMoon,
  faMotorcycle,
  faPhone,
  faStore,
  faSun,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import { LOGO } from "../data";
import { content } from "../constants/content";
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_HOURS, CONTACT_PHONE, CONTACT_PHONE_HREF } from "../data/contact";

export type Route = { page: string; id?: string };

export const NAV = [
  { key: "home", label: content.navigation.accueil },
  { key: "motos", label: content.navigation.motos },
  { key: "equipements", label: content.navigation.equipements },
  { key: "spares", label: content.navigation.piecesDetachees },
  { key: "revendeurs", label: content.navigation.revendeurs },
  { key: "contact", label: content.navigation.contact },
];

function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <img
      src={LOGO}
      alt={content.site.logoAlt}
      className={
        "logo-clean block w-auto object-contain " +
        (large
          ? "h-[clamp(2.5rem,2.1rem+1.2vw,3.5rem)] max-w-[210px]"
          : "h-[clamp(1.85rem,1.65rem+0.6vw,2.3rem)] max-w-[150px]")
      }
    />
  );
}

export function Header({
  route,
  go,
  dark,
  toggle,
}: {
  route: Route;
  go: (p: string, id?: string) => void;
  dark: boolean;
  toggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="glass-header sticky top-0 z-40 border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex h-[64px] w-full max-w-(--container-site) items-center gap-4 px-4 sm:h-[68px] sm:px-7 lg:px-10">
        <button onClick={() => go("home")} aria-label={`${content.site.nom}, ${content.navigation.accueil.toLowerCase()}`} className="shrink-0">
          <BrandMark />
        </button>

        <nav className="ml-auto hidden h-full items-center gap-3 md:flex md:gap-4 lg:gap-7">
          {NAV.map((item) => {
            const active =
              route.page === item.key ||
              (route.page === "product" && item.key === "motos") ||
              (route.page === "accessory" && item.key === "equipements");
            return (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                className={
                  "fluid-btn relative flex h-full items-center font-bold uppercase transition-colors " +
                  (active
                    ? "text-[#171816] dark:text-[#f2f0ea]"
                    : "text-black/45 hover:text-black dark:text-white/50 dark:hover:text-white")
                }
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ffd100]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-7">
          <ThemeToggle dark={dark} toggle={toggle} />
          <button
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? content.navigation.fermerMenu : content.navigation.ouvrirMenu}
            className="grid h-9 w-9 place-items-center border border-black/15 text-sm text-[#171816] md:hidden dark:border-white/15 dark:text-white"
          >
            <FontAwesomeIcon icon={open ? faXmark : faBars} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="glass-header overflow-hidden border-t border-black/10 md:hidden dark:border-white/10"
          >
            <div className="px-4 pb-4 pt-2">
              {NAV.map((item, index) => (
                <motion.button
                  key={item.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.035 }}
                  onClick={() => {
                    go(item.key);
                    setOpen(false);
                  }}
                  className="fluid-h3 flex w-full items-center justify-between border-b border-black/10 py-3.5 text-left font-display font-semibold text-[#171816] dark:border-white/10 dark:text-white"
                >
                  {item.label}
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs text-[#a27b17]" />
                </motion.button>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function ThemeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label={dark ? content.navigation.modeJour : content.navigation.modeNuit}
      className="glass-panel grid h-9 w-9 place-items-center border-black/10 text-sm text-[#171816] transition hover:border-[#ffd100] hover:text-[#a57d14] dark:border-white/15 dark:text-white dark:hover:border-[#ffd100] dark:hover:text-[#ffd100]"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ opacity: 0, rotate: -45, scale: 0.75 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.75 }}
          transition={{ duration: 0.18 }}
          className="grid place-items-center"
        >
          <FontAwesomeIcon icon={dark ? faMoon : faSun} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function Footer({ go, onCookies }: { go: (p: string, id?: string) => void; onCookies: () => void }) {
  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const shopIcons = [faMotorcycle, faMotorcycle, faHelmetSafety, faGears, faStore];
  const shop = content.footer.catalogueLiens.map((item, index) => ({
    ...item,
    icon: shopIcons[index] ?? faMotorcycle,
  }));

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };
  const rise = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <footer className="relative mt-16 overflow-hidden bg-[#101210] text-[#ece9e0]">
      {/* Top golden accent line */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffd100]/80 to-transparent"
      />

      <div className="relative mx-auto w-full max-w-(--container-site) px-4 pb-24 pt-10 sm:px-7 sm:pb-12 sm:pt-14 lg:px-10">
        {/* 1. TOP CTA SECTION — Mobile first (full-width stacked buttons, 48px touch targets) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:gap-6 sm:pb-10 md:flex-row md:items-center md:justify-between"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ffd100] sm:text-[11px]">
              {content.footer.appelSurTitre}
            </p>
            <p className="mt-2 font-display text-[clamp(1.35rem,1.1rem+1.6vw,2.1rem)] font-semibold leading-tight tracking-tight text-white">
              {content.footer.appelTitre}
            </p>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-white/60 sm:text-sm">
              {content.footer.appelDescription}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2.5 sm:w-auto sm:flex sm:flex-row sm:items-stretch sm:gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => go("contact")}
              className="group inline-flex min-h-12 w-full items-center justify-between gap-3 bg-[#ffd100] px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#171816] shadow-sm transition hover:bg-[#ffe36b] active:bg-[#ffd100] sm:w-auto sm:min-w-48 sm:justify-center"
            >
              <span className="truncate">{content.footer.demanderDevis}</span>
              <FontAwesomeIcon icon={faArrowRight} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.button>
            <motion.a
              whileTap={{ scale: 0.97 }}
              href={CONTACT_PHONE_HREF}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 border border-white/20 bg-white/[0.03] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition hover:border-[#ffd100] hover:text-[#ffd100] active:bg-white/10 sm:w-auto"
            >
              <FontAwesomeIcon icon={faPhone} className="shrink-0" />
              <span className="truncate">{content.footer.appeler}</span>
            </motion.a>
          </div>
        </motion.div>

        {/* 2. MAIN FOOTER CONTENT */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid gap-8 py-8 sm:gap-10 sm:py-10 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.9fr_1fr] lg:gap-10"
        >
          {/* Brand Column */}
          <motion.div variants={rise} className="min-w-0 md:col-span-2 lg:col-span-1">
            <button
              onClick={() => go("home")}
              aria-label={content.navigation.retourAccueil}
              className="block text-left transition hover:opacity-90"
            >
              <BrandMark large />
            </button>
            <p className="mt-3.5 max-w-sm text-xs leading-relaxed text-white/60 sm:text-sm">
              {content.footer.descriptionMarque}
            </p>
            <div className="mt-4 border-t border-white/[0.08] pt-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffd100]">
                {content.footer.distributeurExclusif}
              </p>
              <p className="mt-1 text-xs font-semibold text-white/85">
                {content.footer.marquesExclusives.map((name, index) => (
                  <span key={name}>
                    {index > 0 && <span className="text-[#ffd100]"> · </span>}
                    {name}
                  </span>
                ))}
              </p>
            </div>
          </motion.div>

          {/* Links Section: On mobile, grouped into a responsive 2-column grid */}
          <div className="grid grid-cols-2 gap-6 sm:contents">
            {/* Explorer */}
            <motion.nav variants={rise} aria-label={content.footer.explorer}>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffd100]">
                {content.footer.explorer}
              </p>
              <ul className="space-y-1">
                {NAV.map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={() => go(item.key)}
                      className="group flex min-h-9 w-full items-center text-left text-xs font-medium text-white/70 transition-colors hover:text-white active:text-[#ffd100] sm:text-sm"
                    >
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.nav>

            {/* Catalogue */}
            <motion.div variants={rise}>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffd100]">
                {content.footer.catalogue}
              </p>
              <ul className="space-y-1">
                {shop.map((u) => (
                  <li key={u.label}>
                    <button
                      onClick={() => go(u.page, "id" in u ? u.id : undefined)}
                      className="group flex min-h-9 w-full items-center gap-2 text-left text-xs font-medium text-white/70 transition-colors hover:text-white active:text-[#ffd100] sm:text-sm"
                    >
                      <FontAwesomeIcon icon={u.icon} className="w-3 text-[10px] text-[#ffd100] opacity-80" />
                      <span className="truncate">{u.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Contact Details Column */}
          <motion.div variants={rise} className="min-w-0 md:col-span-2 lg:col-span-1">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffd100]">
              {content.footer.nousTrouver}
            </p>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li className="flex items-start gap-3 text-white/75">
                <FontAwesomeIcon icon={faLocationDot} className="mt-1 w-3.5 shrink-0 text-[#ffd100]" />
                <span className="leading-snug">
                  {content.footer.showroom}
                  <br />
                  <span className="text-white/50">{CONTACT_ADDRESS}</span>
                </span>
              </li>
              <li>
                <a
                  href={CONTACT_PHONE_HREF}
                  className="flex min-h-10 items-center gap-3 text-white/85 transition hover:text-[#ffd100]"
                >
                  <FontAwesomeIcon icon={faPhone} className="w-3.5 shrink-0 text-[#ffd100]" />
                  <span className="font-semibold">{CONTACT_PHONE}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex min-h-10 items-center gap-3 text-white/85 transition hover:text-[#ffd100]"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="w-3.5 shrink-0 text-[#ffd100]" />
                  <span className="break-all font-semibold">{CONTACT_EMAIL}</span>
                </a>
              </li>
              <li className="flex items-center gap-3 text-white/60">
                <FontAwesomeIcon icon={faClock} className="w-3.5 shrink-0 text-[#ffd100]" />
                <span>{CONTACT_HOURS}</span>
              </li>
            </ul>

            <button
              onClick={() => go("revendeurs")}
              className="mt-4 inline-flex min-h-10 items-center gap-2 border-b border-[#ffd100] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:text-[#ffd100]"
            >
              {content.footer.revendeurs} <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
            </button>
          </motion.div>
        </motion.div>

        {/* 3. BOTTOM BAR */}
        <div className="flex flex-col gap-4 border-t border-white/10 pt-5 text-[11px] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-[10px] uppercase tracking-[0.12em] text-white/40 sm:text-left">
            © {new Date().getFullYear()} {content.footer.droitsReserves}
          </p>

          <div className="flex items-center justify-center gap-3 sm:justify-end">
            <button
              onClick={onCookies}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70 transition hover:border-[#ffd100] hover:text-[#ffd100]"
            >
              <FontAwesomeIcon icon={faCookieBite} /> {content.footer.cookies}
            </button>
            <button
              type="button"
              onClick={scrollTop}
              aria-label={content.footer.hautDePage}
              className="grid h-10 w-10 place-items-center rounded-full bg-[#ffd100] text-xs font-bold text-[#171816] shadow-sm transition hover:bg-[#ffe36b] active:scale-95"
            >
              <FontAwesomeIcon icon={faArrowUp} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Section({
  title,
  subtitle,
  children,
  id,
  number,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  id?: string;
  number?: string;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-(--container-site) px-4 py-10 sm:px-6 sm:py-12 md:px-8 md:py-16 lg:px-10 lg:py-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-t border-black/15 pt-4 dark:border-white/15 sm:mb-8 md:mb-10">
        <div>
          <p className="fluid-eyebrow mb-2 font-bold uppercase text-[#a27b17] dark:text-[#ffd100]">
            {number ?? content.sections.numeroParDefaut}
          </p>
          <h2 className="fluid-h2 font-display font-semibold text-[#171816] dark:text-[#f2f0ea]">
            {title}
          </h2>
        </div>
        {subtitle && <p className="fluid-body max-w-sm text-black/55 dark:text-white/55">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
