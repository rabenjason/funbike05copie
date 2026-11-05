import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faArrowUp,
  faCheck,
  faCheckDouble,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faEnvelope,
  faGears,
  faHelmetSafety,
  faLayerGroup,
  faMotorcycle,
  faPhone,
  faRotateLeft,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { motorcycles, brands, mainProductImage } from "../data";
import type { Product } from "../types/product";
import SmartImage from "./SmartImage";
import {
  EMPTY_MEMORY,
  greetingText,
  initialQuick,
  respond,
  shopStatus,
  typingDelay,
  type BotReply,
  type ChatAction,
  type ChatActionIcon,
  type Memory,
} from "../lib/assistant";

/* ------------------------------------------------------------------ */
/*  Launcher positioning (stays just above the hero buttons on mobile) */
/* ------------------------------------------------------------------ */

const GAP_ABOVE_ANCHOR = 12;
const REST_BOTTOM_MOBILE = 16;
const REST_BOTTOM_DESKTOP = 24;

function useAnchoredBottom(anchorId: string) {
  const bottom = useMotionValue(REST_BOTTOM_MOBILE);
  const anchoredRef = useRef<boolean | null>(null);
  const leftHeroTopRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    const compute = () => {
      frame = 0;
      const mobile = window.matchMedia("(max-width: 639px)").matches;
      const rest = mobile ? REST_BOTTOM_MOBILE : REST_BOTTOM_DESKTOP;
      const scrollY = window.scrollY;

      // Only stack Piston above the hero actions on the initial viewport.
      // Once the visitor scrolls, detach it so the launcher stays in the corner.
      if (mobile && scrollY > 8) leftHeroTopRef.current = true;
      if (mobile && scrollY < 4) leftHeroTopRef.current = false;
      const anchor = mobile && !leftHeroTopRef.current ? document.getElementById(anchorId) : null;

      let target = rest;
      let anchored = false;
      if (anchor) {
        const rect = anchor.getBoundingClientRect();
        const aboveAnchor = window.innerHeight - rect.top + GAP_ABOVE_ANCHOR;
        if (rect.bottom > 0 && rect.top < window.innerHeight && aboveAnchor < window.innerHeight * 0.62) {
          target = aboveAnchor;
          anchored = true;
        }
      }

      if (anchoredRef.current === anchored && anchored) bottom.set(target);
      else if (anchoredRef.current !== anchored || bottom.get() !== target)
        animate(bottom, target, { type: "spring", stiffness: 260, damping: 28 });
      anchoredRef.current = anchored;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const poll = window.setInterval(schedule, 400);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.clearInterval(poll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [anchorId, bottom]);

  return bottom;
}

function useIsMobile() {
  const query = "(max-width: 639px)";
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

/* ------------------------------------------------------------------ */
/*  Messages model & persistence                                       */
/* ------------------------------------------------------------------ */

type Msg = {
  id: string;
  from: "bot" | "me";
  text: string;
  time: number;
  productIds?: string[];
  reasons?: Record<string, string>;
  compare?: [string, string];
  actions?: ChatAction[];
  seen?: boolean;
};

type Stored = { messages: Msg[]; memory: Memory; quick: string[] };

const STORE_KEY = "fb_chat_v2";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const botMsg = (reply: BotReply): Msg => ({
  id: uid(),
  from: "bot",
  text: reply.text,
  time: Date.now(),
  productIds: reply.productIds,
  reasons: reply.reasons,
  compare: reply.compare,
  actions: reply.actions,
});

const greetMsg = (name?: string): Msg => botMsg({ text: greetingText(name) });

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Stored;
    if (!Array.isArray(data.messages) || !data.messages.length) return null;
    return { messages: data.messages, memory: { ...EMPTY_MEMORY, ...data.memory }, quick: data.quick ?? [] };
  } catch {
    return null;
  }
}

const clock = (time: number) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(time);
const bikeById = (id: string) => motorcycles.find((bike) => bike.id === id);

const ACTION_ICONS: Record<ChatActionIcon, IconDefinition> = {
  catalog: faLayerGroup,
  contact: faEnvelope,
  parts: faGears,
  phone: faPhone,
  product: faMotorcycle,
  gear: faHelmetSafety,
};

/* ------------------------------------------------------------------ */
/*  Small presentational pieces                                        */
/* ------------------------------------------------------------------ */

/** Supports **bold** and line breaks (bullets start with •). */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className={"block " + (line.startsWith("•") ? "pl-1" : "") + (i > 0 && !line.startsWith("•") ? " mt-1.5" : "")}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
            seg.startsWith("**") && seg.endsWith("**") ? (
              <strong key={j} className="font-semibold">
                {seg.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{seg}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
}

function Avatar({ size = "h-8 w-8" }: { size?: string }) {
  return (
    <span className={"grid shrink-0 place-items-center rounded-full bg-[#ffd100] " + size} aria-hidden="true">
      <CatFace className="h-[72%] w-[72%]" />
    </span>
  );
}

/** Horizontal slide carousel: keeps the chat layout intact while browsing bikes. */
function ProductStrip({
  ids,
  reasons,
  onOpen,
}: {
  ids: string[];
  reasons?: Record<string, string>;
  onOpen: (bike: Product) => void;
}) {
  const bikes = ids.map(bikeById).filter((b): b is Product => Boolean(b));
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (!bikes.length) return null;
  const single = bikes.length === 1;
  const hasReasons = Boolean(reasons && Object.keys(reasons).length > 0);
  const multi = bikes.length > 1;

  function scrollToIndex(next: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[next] as HTMLElement | undefined;
    if (!card) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
    setIndex(next);
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const children = Array.from(track.children) as HTMLElement[];
    if (!children.length) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let best = Infinity;
    children.forEach((child, i) => {
      const c = child.offsetLeft - track.offsetLeft + child.clientWidth / 2;
      const d = Math.abs(c - center);
      if (d < best) {
        best = d;
        closest = i;
      }
    });
    setIndex(closest);
  }

  return (
    <div className="mt-2">
      <div className="relative">
        {/* Slide viewport */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none]"
        >
          {bikes.map((bike) => (
            <motion.button
              key={bike.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpen(bike)}
              className={
                "fb-card group w-[min(13rem,78%)] shrink-0 snap-center overflow-hidden rounded-xl text-left sm:w-[min(14rem,62%)] " +
                (single ? "w-[min(15rem,100%)]" : "")
              }
            >
              <SmartImage
                src={mainProductImage(bike)?.url ?? ""}
                alt={mainProductImage(bike)?.altText ?? bike.name}
                className="fb-card-media aspect-[4/3]"
                imgClassName="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45 dark:text-white/45">
                  {brands.find((item) => item.id === bike.brandId)?.name ?? "Marque non renseignée"} · {bike.family}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-[#171816] dark:text-[#f2f0ea]">
                  {bike.name}
                </p>
                {hasReasons && reasons?.[bike.id] && (
                  <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-black/55 dark:text-white/55">
                    <span className="font-semibold text-black/75 dark:text-white/75">Pourquoi&nbsp;:</span> {reasons[bike.id]}.
                  </p>
                )}
                <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-black/60 transition group-hover:text-black dark:text-white/60 dark:group-hover:text-white">
                  Voir la fiche <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Slide arrows */}
        {multi && (
          <>
            <button
              type="button"
              aria-label="Moto précédente"
              onClick={() => scrollToIndex(Math.max(0, index - 1))}
              disabled={index === 0}
              className="absolute -left-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/95 text-[11px] text-[#171816] shadow-md backdrop-blur transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 dark:border-white/10 dark:bg-[#1c1d19]/95 dark:text-white"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button
              type="button"
              aria-label="Moto suivante"
              onClick={() => scrollToIndex(Math.min(bikes.length - 1, index + 1))}
              disabled={index === bikes.length - 1}
              className="absolute -right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/95 text-[11px] text-[#171816] shadow-md backdrop-blur transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 dark:border-white/10 dark:bg-[#1c1d19]/95 dark:text-white"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </>
        )}
      </div>

      {/* Slide indicators */}
      {multi && (
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden="true">
          {bikes.map((bike, i) => (
            <button
              key={bike.id}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Voir ${bike.name}`}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === index ? "w-5 bg-[#ffd100]" : "w-1.5 bg-black/20 dark:bg-white/25")
              }
            />
          ))}
          <span className="ml-1.5 text-[10px] font-semibold tabular-nums text-black/40 dark:text-white/40">
            {index + 1}/{bikes.length}
          </span>
        </div>
      )}
    </div>
  );
}

function CompareTable({ ids }: { ids: [string, string] }) {
  const a = bikeById(ids[0]);
  const b = bikeById(ids[1]);
  if (!a || !b) return null;
  const labels = Array.from(new Set([...a.specifications, ...b.specifications].map((spec) => spec.key)));
  const value = (bike: Product, label: string) => bike.specifications.find((spec) => spec.key === label)?.value ?? "—";
  const short = (bike: Product) => bike.name.replace(/ 2026$/, "");
  return (
    <div className="no-scrollbar mt-2 overflow-x-auto rounded-xl border border-black/10 text-[12px] dark:border-white/10">
      <div className="min-w-[24rem]">
      <div className="grid grid-cols-[0.9fr_1fr_1fr] bg-black/[0.04] font-semibold dark:bg-white/[0.05]">
        <span className="px-2.5 py-2 text-black/45 dark:text-white/45">Critère</span>
        <span className="min-w-0 break-words px-2.5 py-2">{short(a)}</span>
        <span className="min-w-0 break-words px-2.5 py-2">{short(b)}</span>
      </div>
      {labels.map((label) => (
        <div key={label} className="grid grid-cols-[0.9fr_1fr_1fr] border-t border-black/[0.06] dark:border-white/[0.06]">
          <span className="min-w-0 break-words px-2.5 py-2 text-black/50 dark:text-white/50">{label}</span>
          <span className="min-w-0 break-words px-2.5 py-2">{value(a, label)}</span>
          <span className="min-w-0 break-words px-2.5 py-2">{value(b, label)}</span>
        </div>
      ))}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] text-black/55 transition hover:bg-black/[0.05] hover:text-black dark:text-white/55 dark:hover:bg-white/[0.07] dark:hover:text-white"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat                                                               */
/* ------------------------------------------------------------------ */

export default function CatChat({
  go,
  hiddenOnMobile = false,
}: {
  go: (page: string, id?: string) => void;
  hiddenOnMobile?: boolean;
}) {
  const [stored] = useState(loadStored);
  const [messages, setMessages] = useState<Msg[]>(() => stored?.messages ?? [greetMsg()]);
  const [memory, setMemory] = useState<Memory>(() => stored?.memory ?? EMPTY_MEMORY);
  const [quick, setQuick] = useState<string[]>(() => (stored ? stored.quick : initialQuick()));
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(!stored);
  const [unread, setUnread] = useState(stored ? 0 : 1);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const isMobile = useIsMobile();
  const bottom = useAnchoredBottom("hero-cta");

  const memoryRef = useRef(memory);
  const openRef = useRef(open);
  const pending = useRef(0);
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  openRef.current = open;

  /* Persist the conversation */
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ messages: messages.slice(-40), memory, quick }));
    } catch {
      /* private mode: ignore */
    }
  }, [messages, memory, quick]);

  /* Clean timers on unmount */
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  /* Teaser bubble disappears after a while */
  useEffect(() => {
    if (!teaser) return;
    const timer = window.setTimeout(() => setTeaser(false), 9000);
    return () => window.clearTimeout(timer);
  }, [teaser]);

  /* Auto-scroll to the latest message */
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, typing, open]);

  /* Open: clear unread, lock page scroll on mobile, focus composer on desktop, Esc closes */
  useEffect(() => {
    if (!open) return;
    setUnread(0);
    setTeaser(false);
    if (!isMobile) window.setTimeout(() => inputRef.current?.focus(), 250);
    const previous = document.body.style.overflow;
    if (isMobile) document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, isMobile]);

  function autoSize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function send(text: string) {
    const value = text.trim();
    if (!value) return;

    setMessages((list) => [...list, { id: uid(), from: "me", text: value, time: Date.now(), seen: false }]);
    setInput("");
    setQuick([]);
    window.requestAnimationFrame(autoSize);

    const { reply, memory: next } = respond(value, memoryRef.current);
    memoryRef.current = next;
    setMemory(next);

    const readAfter = 380 + Math.random() * 250;
    pending.current += 1;

    timers.current.push(
      window.setTimeout(() => {
        setMessages((list) => list.map((m) => (m.from === "me" ? { ...m, seen: true } : m)));
        setTyping(true);
      }, readAfter),
      window.setTimeout(() => {
        pending.current -= 1;
        if (pending.current <= 0) setTyping(false);
        setMessages((list) => [...list, botMsg(reply)]);
        setQuick(reply.quick ?? []);
        if (!openRef.current) setUnread((n) => n + 1);
      }, readAfter + typingDelay(reply)),
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  }

  function runAction(action: ChatAction) {
    go(action.page, action.id);
    if (isMobile) setOpen(false);
  }

  function reset() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    pending.current = 0;
    const fresh = { ...EMPTY_MEMORY, name: memoryRef.current.name };
    memoryRef.current = fresh;
    setMemory(fresh);
    setTyping(false);
    setMessages([greetMsg(fresh.name)]);
    setQuick(initialQuick());
  }

  const status = shopStatus();
  const statusText = typing ? "écrit…" : status.open ? "En ligne · répond instantanément" : "En ligne · équipe disponible dès 8h";

  const panelMotion = isMobile
    ? {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { type: "spring" as const, stiffness: 340, damping: 36 },
      }
    : {
        initial: { opacity: 0, y: 16, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 12, scale: 0.97 },
        transition: { type: "spring" as const, stiffness: 380, damping: 32 },
      };

  return (
    <>
      {/* ---------------- Panel ---------------- */}
      <AnimatePresence>
        {open && (
          <motion.section
            key="chat-panel"
            role="dialog"
            aria-modal={isMobile}
            aria-label="Discussion avec Piston, conseiller Funbike"
            {...panelMotion}
            style={{ transformOrigin: "bottom right" }}
            className="fixed inset-0 z-[70] flex h-[100dvh] flex-col overflow-hidden bg-white text-[#171816] dark:bg-[#161714] dark:text-[#f2f0ea] sm:inset-auto sm:bottom-[92px] sm:right-6 sm:h-[min(620px,calc(100dvh-116px))] sm:w-[380px] sm:rounded-2xl sm:border sm:border-black/10 sm:shadow-[0_24px_70px_-12px_rgba(0,0,0,0.35)] lg:h-[min(660px,calc(100dvh-116px))] lg:w-[400px] dark:border-white/10"
          >
            {/* Header */}
            <header
              className="flex items-center gap-2.5 border-b border-black/[0.07] bg-white/95 px-2 py-2 backdrop-blur dark:border-white/[0.07] dark:bg-[#161714]/95 sm:px-3"
              style={isMobile ? { paddingTop: "max(0.5rem, env(safe-area-inset-top))" } : undefined}
            >
              {isMobile && (
                <IconButton label="Réduire la discussion" onClick={() => setOpen(false)}>
                  <FontAwesomeIcon icon={faChevronDown} />
                </IconButton>
              )}
              <div className="relative ml-1">
                <Avatar size="h-10 w-10" />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161714]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight">
                  Piston
                  <span className="rounded-full bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/55 dark:bg-white/10 dark:text-white/60">
                    Funbike
                  </span>
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={statusText}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.15 }}
                    className={"truncate text-[12px] " + (typing ? "text-emerald-600 dark:text-emerald-400" : "text-black/50 dark:text-white/50")}
                  >
                    {statusText}
                  </motion.p>
                </AnimatePresence>
              </div>
              <IconButton label="Nouvelle conversation" onClick={reset}>
                <FontAwesomeIcon icon={faRotateLeft} />
              </IconButton>
              {!isMobile && (
                <IconButton label="Fermer la discussion" onClick={() => setOpen(false)}>
                  <FontAwesomeIcon icon={faXmark} />
                </IconButton>
              )}
            </header>

            {/* Messages */}
            <div
              ref={listRef}
              aria-live="polite"
              className="flex-1 overflow-y-auto overscroll-contain bg-[#fafaf8] px-3 py-4 dark:bg-[#121311] sm:px-4"
            >
              <div className="mb-4 flex items-center gap-3 text-[11px] font-medium text-black/35 dark:text-white/35">
                <span className="h-px flex-1 bg-black/[0.07] dark:bg-white/[0.07]" />
                Aujourd'hui
                <span className="h-px flex-1 bg-black/[0.07] dark:bg-white/[0.07]" />
              </div>

              <div className="space-y-1">
                {messages.map((m, i) => {
                  const next = messages[i + 1];
                  const lastOfGroup = !next || next.from !== m.from;
                  const mine = m.from === "me";
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className={(mine ? "flex justify-end" : "flex items-end gap-2") + (lastOfGroup ? " pb-2.5" : "")}
                    >
                      {!mine && (lastOfGroup ? <Avatar /> : <span className="w-8 shrink-0" />)}

                      <div className={"flex min-w-0 flex-col " + (mine ? "max-w-[82%] items-end" : "max-w-[86%] items-start")}>
                        <div
                          className={
                            "px-3.5 py-2.5 text-[15px] leading-[1.45] sm:text-[14px] " +
                            (mine
                              ? "rounded-2xl rounded-br-md bg-[#171816] text-white dark:bg-[#f2f0ea] dark:text-[#171816]"
                              : "rounded-2xl rounded-bl-md border border-black/[0.05] bg-white text-[#171816] shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.05] dark:bg-[#232420] dark:text-[#f2f0ea]")
                          }
                        >
                          <RichText text={m.text} />
                        </div>

                        {m.compare && <CompareTable ids={m.compare} />}
                        {m.productIds && (
                          <ProductStrip ids={m.productIds} reasons={m.reasons} onOpen={(bike) => runAction({ label: bike.name, page: "product", id: bike.id })} />
                        )}

                        {m.actions && m.actions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {m.actions.map((action, k) => (
                              <motion.button
                                key={action.label + k}
                                type="button"
                                whileTap={{ scale: 0.96 }}
                                onClick={() => runAction(action)}
                                className={
                                  "inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition " +
                                  (k === 0
                                    ? "bg-[#171816] text-white hover:bg-black dark:bg-[#f2f0ea] dark:text-[#171816] dark:hover:bg-white"
                                    : "border border-black/15 text-[#171816] hover:border-black/35 dark:border-white/15 dark:text-[#f2f0ea] dark:hover:border-white/35")
                                }
                              >
                                <FontAwesomeIcon icon={ACTION_ICONS[action.icon ?? "catalog"]} className="text-[11px]" />
                                {action.label}
                              </motion.button>
                            ))}
                          </div>
                        )}

                        {lastOfGroup && (
                          <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-black/40 dark:text-white/40">
                            {clock(m.time)}
                            {mine && (
                              <FontAwesomeIcon
                                icon={m.seen ? faCheckDouble : faCheck}
                                className={"text-[10px] " + (m.seen ? "text-emerald-500" : "")}
                                aria-label={m.seen ? "Lu" : "Envoyé"}
                              />
                            )}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                <AnimatePresence>
                  {typing && (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex items-end gap-2 pb-2.5"
                      aria-label="Piston est en train d'écrire"
                    >
                      <Avatar />
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-black/[0.05] bg-white px-4 py-3.5 dark:border-white/[0.05] dark:bg-[#232420]">
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={dot}
                            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
                            className="h-2 w-2 rounded-full bg-black/45 dark:bg-white/55"
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Quick replies */}
            <AnimatePresence initial={false}>
              {!typing && quick.length > 0 && (
                <motion.div
                  key={quick.join("|")}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-black/[0.06] bg-white dark:border-white/[0.06] dark:bg-[#161714]"
                >
                  <div className="flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] sm:px-4">
                    {quick.map((q, k) => (
                      <motion.button
                        key={q}
                        type="button"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: k * 0.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => send(q)}
                        className="min-h-9 shrink-0 rounded-full border border-black/12 bg-white px-3.5 text-[13px] font-medium text-[#171816] transition hover:border-black/35 hover:bg-black/[0.02] dark:border-white/15 dark:bg-transparent dark:text-[#f2f0ea] dark:hover:border-white/35"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Composer */}
            <form
              onSubmit={onSubmit}
              className="flex items-end gap-2 border-t border-black/[0.06] bg-white px-3 pt-2.5 dark:border-white/[0.06] dark:bg-[#161714] sm:px-4"
              style={{ paddingBottom: isMobile ? "max(0.625rem, env(safe-area-inset-bottom))" : "0.625rem" }}
            >
              <label className="flex min-h-11 flex-1 items-end rounded-[22px] border border-black/10 bg-[#f4f4f1] px-4 outline-none transition focus-within:border-black/30 focus-within:bg-white dark:border-white/10 dark:bg-[#22231f] dark:focus-within:border-white/30 dark:focus-within:bg-[#262722]">
                <span className="sr-only">Votre message</span>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoSize();
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Écrivez votre message…"
                  enterKeyHint="send"
                  className="chat-composer max-h-[120px] w-full resize-none border-0 bg-transparent py-[10px] text-base leading-6 text-[#171816] outline-none ring-0 placeholder:text-black/40 focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none dark:text-[#f2f0ea] dark:placeholder:text-white/40 sm:text-[14px]"
                />
              </label>
              <motion.button
                type="submit"
                disabled={!input.trim()}
                whileTap={{ scale: 0.9 }}
                aria-label="Envoyer le message"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#171816] text-[15px] text-white transition disabled:opacity-30 dark:bg-[#ffd100] dark:text-[#171816]"
              >
                <FontAwesomeIcon icon={faArrowUp} />
              </motion.button>
            </form>
            <p
              className="bg-white px-4 pb-2 text-center text-[10px] text-black/35 dark:bg-[#161714] dark:text-white/35"
              style={isMobile ? { paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" } : undefined}
            >
              Assistant automatique · prix et disponibilités confirmés par l'équipe
            </p>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ---------------- Launcher ---------------- */}
      <motion.div
        style={{ bottom }}
        className={
          "fixed right-4 z-50 flex-col items-end gap-2.5 sm:right-6 " +
          (hiddenOnMobile || (open && isMobile) ? "hidden sm:flex" : "flex")
        }
      >
        <AnimatePresence>
          {!open && teaser && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative flex max-w-[15rem] items-start gap-2 rounded-2xl rounded-br-md border border-black/10 bg-white py-2.5 pl-3.5 pr-2 text-[13px] leading-snug text-[#171816] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-[#1c1d1a] dark:text-[#f2f0ea]"
            >
              <button type="button" onClick={() => setOpen(true)} className="text-left">
                <span className="block font-semibold">Piston, conseiller Funbike</span>
                <span className="text-black/60 dark:text-white/60">Une question sur une moto ? Je réponds tout de suite.</span>
              </button>
              <button
                type="button"
                onClick={() => setTeaser(false)}
                aria-label="Masquer le message"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer la discussion" : unread ? `Ouvrir la discussion, ${unread} message non lu` : "Ouvrir la discussion"}
          aria-expanded={open}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          animate={open ? { y: 0 } : { y: [0, -4, 0] }}
          transition={open ? { duration: 0.2 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative grid h-[52px] w-[52px] place-items-center rounded-full bg-[#ffd100] shadow-[0_10px_28px_-6px_rgba(0,0,0,0.35)] sm:h-14 sm:w-14"
        >
          {!open && (
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 1.45], opacity: [0.35, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-[#ffd100]"
            />
          )}
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <FontAwesomeIcon icon={faXmark} className="text-lg text-[#171816]" />
              </motion.span>
            ) : (
              <motion.span key="cat" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                <CatFace className="h-9 w-9 sm:h-10 sm:w-10" animated />
              </motion.span>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!open && unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#e5484d] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#141513]"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </>
  );
}

export function CatFace({ className = "", animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {animated && (
        <path d="M50 44c8 2 10 8 6 12" className="animate-fb-tail" fill="none" stroke="#27272a" strokeWidth="4" strokeLinecap="round" />
      )}
      <g className={animated ? "animate-fb-ear" : ""}>
        <path d="M14 22L16 8l13 8z" fill="#27272a" />
        <path d="M50 22L48 8l-13 8z" fill="#27272a" />
      </g>
      <ellipse cx="32" cy="34" rx="22" ry="19" fill="#27272a" />
      <ellipse cx="32" cy="39" rx="13" ry="10" fill="#fde68a" />
      <g className={animated ? "animate-fb-blink" : ""}>
        <ellipse cx="24" cy="30" rx="3.4" ry="4.2" fill="#ffd100" />
        <ellipse cx="40" cy="30" rx="3.4" ry="4.2" fill="#ffd100" />
        <ellipse cx="24" cy="30" rx="1.3" ry="3.2" fill="#27272a" />
        <ellipse cx="40" cy="30" rx="1.3" ry="3.2" fill="#27272a" />
      </g>
      <path d="M32 37l-2.6-2.4h5.2z" fill="#27272a" />
      <path d="M32 38c0 2.6-2.6 2.6-3.6 1M32 38c0 2.6 2.6 2.6 3.6 1" stroke="#27272a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <g stroke="#27272a" strokeWidth="1.4" strokeLinecap="round">
        <path d="M19 37H9M19 41l-9 3M45 37h10M45 41l9 3" />
      </g>
    </svg>
  );
}
