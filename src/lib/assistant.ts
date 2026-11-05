import { motorcycles, helmets, spareParts, brands } from "../data";
import type { Product } from "../types/product";
import { runRecommender, isSpecificModelRequest, detectBrandText, type NeedProfile } from "./recommender";

const TROY_LEE_HELMETS = helmets.filter((product) => product.brandId === "troy-lee-designs");
const TVS_COMPATIBLE_PARTS = spareParts.filter((product) => product.compatibleBrandIds?.includes("tvs"));
type BikeFamily = "Off-road" | "Urbain" | "3 roues";
const bikeBrand = (bike: Product) => brands.find((brand) => brand.id === bike.brandId)?.name ?? "Marque non renseignée";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ChatActionIcon = "catalog" | "contact" | "parts" | "phone" | "product" | "gear";

export type ChatAction = { label: string; page: string; id?: string; icon?: ChatActionIcon };

export type BotReply = {
  text: string;
  productIds?: string[];
  reasons?: Record<string, string>;
  compare?: [string, string];
  actions?: ChatAction[];
  quick?: string[];
};

export type Memory = {
  name?: string;
  /** Bikes mentioned in the last answer, most relevant first */
  lastIds: string[];
  /** Consecutive answers where the question was not understood */
  misses: number;
  /** In-progress need profile for the recommendation flow */
  need?: NeedProfile | null;
  /** True once a recommendation has been delivered for the current need */
  needComplete?: boolean;
};

export const EMPTY_MEMORY: Memory = { lastIds: [], misses: 0 };

/* ------------------------------------------------------------------ */
/*  Text helpers                                                       */
/* ------------------------------------------------------------------ */

export function norm(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const wordsOf = (t: string) => t.split(" ").filter(Boolean);

/**
 * Stem match: "casq" matches "casque", "casques".
 * "cher$" = exact word only (so "chercher" does not match).
 * Multi-word stems ("tout terrain") use a word-aligned substring.
 */
function hasAny(t: string, stems: string[]): boolean {
  const ws = wordsOf(t);
  return stems.some((s) => {
    if (s.endsWith("$")) return ws.includes(s.slice(0, -1));
    if (s.includes(" ")) return ` ${t} `.includes(` ${s}`);
    return ws.some((w) => w.startsWith(s));
  });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const byId = (id: string) => motorcycles.find((b) => b.id === id);

/* ------------------------------------------------------------------ */
/*  Shop facts (single source of truth for the assistant)              */
/* ------------------------------------------------------------------ */

export const SHOP = {
  phone: "+261 34 00 000 00",
  email: "contact@funbike.mg",
  city: "Antananarivo",
  hours: "du lundi au samedi, de 8h à 17h30",
};

/** Opening status computed in Madagascar time (UTC+3). */
export function shopStatus(now = new Date()): { open: boolean; text: string } {
  let weekday = "";
  let minutes = 0;
  try {
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Indian/Antananarivo",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    weekday = (parts.find((p) => p.type === "weekday")?.value ?? "").toLowerCase();
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    minutes = h * 60 + m;
  } catch {
    weekday = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][now.getDay()];
    minutes = now.getHours() * 60 + now.getMinutes();
  }

  const OPEN = 8 * 60;
  const CLOSE = 17 * 60 + 30;
  const sunday = weekday.startsWith("dim");
  const saturday = weekday.startsWith("sam");

  if (!sunday && minutes >= OPEN && minutes < CLOSE) {
    const left = CLOSE - minutes;
    const soon = left <= 60 ? ` (fermeture dans ${left} min)` : " jusqu'à 17h30";
    return { open: true, text: `Le showroom est **ouvert en ce moment**${soon}.` };
  }
  if (!sunday && minutes < OPEN) return { open: false, text: "Le showroom est fermé pour l'instant, il **ouvre aujourd'hui à 8h**." };
  if (sunday) return { open: false, text: "Le showroom est fermé le dimanche, **réouverture lundi à 8h**." };
  if (saturday) return { open: false, text: "Le showroom est fermé, **réouverture lundi à 8h**." };
  return { open: false, text: "Le showroom est fermé, **réouverture demain à 8h**." };
}

/* ------------------------------------------------------------------ */
/*  Catalogue understanding                                            */
/* ------------------------------------------------------------------ */

const FAMILY_WORDS: Record<BikeFamily, string[]> = {
  "Off-road": ["enduro", "cross", "motocross", "offroad", "off road", "tout terrain", "piste", "trail", "rallye", "competition", "boue", "terre", "hors piste", "sentier"],
  Urbain: ["ville", "urbain", "urbaine", "quotidien", "trajet", "bureau", "route", "econom", "consomm", "deplacement", "citadin", "roadster", "sportive urbaine"],
  "3 roues": ["tuktuk", "tuk", "3 roues", "trois roues", "taxi", "bajaj", "tricycle"],
};

const BRAND_WORDS: Record<string, string[]> = {
  Sherco: ["sherco", "sef"],
  Fantic: ["fantic", "xx"],
  TVS: ["tvs", "apache", "raider", "hlx", "king"],
  Funbike: ["edition speciale", "serie limitee"],
};

const INDEX = motorcycles.map((bike) => ({
  bike,
  name: norm(bike.name),
  hay: norm(`${bike.name} ${bikeBrand(bike)} ${bike.family ?? ""} ${bike.description} ${bike.specifications.map((spec) => spec.value).join(" ")}`),
}));

function detectFamily(t: string): BikeFamily | undefined {
  return (Object.keys(FAMILY_WORDS) as BikeFamily[]).find((f) => hasAny(t, FAMILY_WORDS[f]));
}

function detectBrand(t: string): string | undefined {
  return Object.keys(BRAND_WORDS).find((b) => hasAny(t, BRAND_WORDS[b]));
}

const STOP = new Set(["moto", "motos", "pour", "avec", "vous", "avez", "est", "quel", "quelle", "quels", "une", "des", "les", "la", "le", "de", "du", "et", "je", "veux", "voudrais", "cherche", "recherche", "bonjour", "salut", "svp", "merci", "plus", "tres", "bien", "cette", "celle"]);

/** Scores every bike against the question, best match first. */
const MODEL_WORDS = ["apache", "raider", "hlx", "king", "tuktuk", "trail", "xx", "sef", "factory", "sport", "edition"];

export function searchBikes(t: string): Product[] {
  const family = detectFamily(t);
  const brand = detectBrand(t);
  // "250", "125cc", "300 cm3"…
  const numbers = Array.from(t.matchAll(/(?:^|\s)(\d{2,3})(?:cc|cm3)?(?=\s|$)/g))
    .map((m) => m[1])
    .filter((n) => Number(n) >= 50 && Number(n) <= 500);
  const tokens = wordsOf(t).filter((w) => w.length >= 4 && !STOP.has(w));

  const scored = INDEX.map(({ bike, name, hay }) => {
    let score = 0;
    if (brand && bikeBrand(bike) === brand) score += 5;
    MODEL_WORDS.forEach((kw) => {
      if (hasAny(t, [kw]) && new RegExp(`\\b${kw}`).test(name)) score += 6;
    });
    if (family && bike.family === family) score += 3;
    numbers.forEach((n) => {
      if (new RegExp(`\\b${n}\\b`).test(name)) score += 7;
      else if (hay.includes(`${n} cc`)) score += 4;
    });
    tokens.forEach((w) => {
      if (name.includes(w)) score += 2;
      else if (hay.includes(w)) score += 1;
    });
    return { bike, score };
  });

  return scored
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.bike);
}

/** "la première", "la 2e", "celle-ci" … resolved against the last answer. */
function resolveReference(t: string, mem: Memory): Product | undefined {
  if (!mem.lastIds.length) return undefined;
  const ordinals: [RegExp, number][] = [
    [/\b(premiere|1ere|1re|premier|1er)\b/, 0],
    [/\b(deuxieme|2eme|2e|seconde|second)\b/, 1],
    [/\b(troisieme|3eme|3e)\b/, 2],
    [/\b(quatrieme|4eme|4e)\b/, 3],
  ];
  for (const [re, idx] of ordinals) if (re.test(t) && mem.lastIds[idx]) return byId(mem.lastIds[idx]);
  if (/\b(derniere|dernier)\b/.test(t)) return byId(mem.lastIds[mem.lastIds.length - 1]);
  if (/\b(celle ci|celle la|cette moto|ce modele|elle|la meme|celui ci|celui la)\b/.test(t)) return byId(mem.lastIds[0]);
  return undefined;
}

const SPEC_KEYS: { stems: string[]; label: string }[] = [
  { stems: ["poids", "lourd", "leger", "kg"], label: "poids" },
  { stems: ["cylindr", "moteur", "cc", "temps", "puissan"], label: "cylindr" },
  { stems: ["frein", "abs"], label: "frein" },
  { stems: ["suspens", "fourche", "amorti"], label: "suspension" },
  { stems: ["refroid"], label: "refroid" },
  { stems: ["cartograph", "mapping", "mode"], label: "cartograph" },
  { stems: ["boite", "vitesse", "rapport"], label: "boite" },
  { stems: ["place", "passager"], label: "places" },
  { stems: ["couleur", "coloris"], label: "coloris" },
  { stems: ["consomm", "econom", "litre"], label: "consommation" },
];

function specAnswer(bike: Product, t: string): string | undefined {
  for (const key of SPEC_KEYS) {
    if (!hasAny(t, key.stems)) continue;
    const spec = bike.specifications.find((spec) => norm(spec.key).includes(key.label));
    if (spec) return `Sur la **${bike.name}**, ${spec.key.toLowerCase()} : **${spec.value}**.`;
    return `Je n'ai pas cette information pour la **${bike.name}** dans ma fiche. L'équipe peut vous la confirmer.`;
  }
  return undefined;
}

function specList(bike: Product): string {
  return `Fiche **${bike.name}** :\n${bike.specifications.map((spec) => `• ${spec.key} : ${spec.value}`).join("\n")}`;
}

/* ------------------------------------------------------------------ */
/*  Intents                                                            */
/* ------------------------------------------------------------------ */

const I = {
  greet: ["bonjour", "salut", "hello", "coucou", "bonsoir", "hey$", "slt$", "bjr$", "salama", "manao ahoana"],
  thanks: ["merci", "misaotra", "thanks"],
  thanksShort: ["top$", "super$", "parfait", "genial", "cool$", "ok$", "d accord"],
  bye: ["au revoir", "bye$", "a plus", "a bientot", "veloma", "bonne journee", "bonne soiree", "ciao"],
  human: ["conseiller", "humain", "quelqu un", "vendeur", "commercial", "whatsapp", "appeler", "telephone", "numero", "joindre", "parler a"],
  hours: ["horaire", "heure", "ouvert", "ouvre", "fermez", "fermeture", "ferme$", "adresse", "ou etes", "situe", "localis", "vous trouver", "showroom", "magasin", "boutique", "venir chez", "plan$"],
  dealers: ["revendeur", "point de vente", "points de vente", "toamasina", "tamatave", "mahajanga", "majunga", "fianar", "antsirabe", "diego", "tulear", "tana$"],
  price: ["prix", "tarif", "combien", "cout$", "coute", "cher$", "chere$", "budget", "ariary", "devis", "promo", "remise", "reduction"],
  credit: ["credit", "facilite", "echelon", "mensualit", "plusieurs fois", "financement", "leasing"],
  test: ["essai", "essayer", "tester", "test ride", "rouler avec"],
  service: ["entretien", "revision", "repar", "atelier", "vidange", "panne", "sav$", "garantie", "mecanicien", "diagnostic"],
  parts: ["piece", "frein", "plaquette", "disque", "chaine", "filtre", "huile", "pneu", "kit$", "consommable", "bougie", "embrayage", "galfer", "bihr"],
  gear: ["casque", "tenue", "gant", "botte", "blouson", "veste", "jacket", "maillot", "protection", "equipement", "accessoire", "troy", "tld$", "gaerne", "mt helmet", "mt$", "lunette", "pantalon"],
  size: ["taille", "pointure", "mesure", "size$"],
  compare: ["compar", "difference", "vs$", "versus", "entre la", "ou bien", "mieux entre"],
  recommend: ["conseil", "recommand", "propos", "quelle moto", "choisir", "meilleur", "ideal", "adapte", "pour moi", "suggest", "hesit", "laquelle"],
  specs: ["fiche", "caracter", "spec", "detail", "technique", "poids", "cylindr", "moteur", "frein", "suspens", "refroid", "boite", "vitesse", "coloris", "couleur", "consomm", "places"],
  open: ["voir", "ouvr", "montre", "affiche", "lien", "page"],
  catalog: ["moto", "catalogue", "gamme", "modele", "vous avez quoi", "vendez", "dispo", "stock", "nouveaute"],
};

const DEFAULT_QUICK = ["Quelle moto pour débuter ?", "Motos Sherco", "Horaires du showroom", "Pièces pour ma moto"];

const CONTACT_ACTION: ChatAction = { label: "Demander un devis", page: "contact", icon: "contact" };

/* ------------------------------------------------------------------ */
/*  Main entry                                                         */
/* ------------------------------------------------------------------ */

export function greetingText(name?: string): string {
  const hour = new Date().getHours();
  const hello = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
  return `${hello}${name ? ` ${name}` : ""} ! Je suis **Piston**, le conseiller virtuel de Funbike.\nJe connais tout le catalogue : motos, pièces et équipements. Que recherchez-vous ?`;
}

export function initialQuick(): string[] {
  return DEFAULT_QUICK;
}

function withBikes(reply: BotReply, bikes: Product[], mem: Memory, max = 4): BotReply {
  const list = bikes.slice(0, max);
  mem.lastIds = list.map((b) => b.id);
  return { ...reply, productIds: list.map((b) => b.id) };
}

export function respond(raw: string, memIn: Memory): { reply: BotReply; memory: Memory } {
  const mem: Memory = { ...memIn, lastIds: [...memIn.lastIds] };
  const t = norm(raw);
  const ws = wordsOf(t);
  const you = mem.name ? ` ${mem.name}` : "";

  const done = (reply: BotReply) => {
    mem.misses = 0;
    return { reply, memory: mem };
  };

  if (!t) return done({ text: "Je vous écoute ! Posez-moi votre question.", quick: DEFAULT_QUICK });

  /* --- Name ---------------------------------------------------------- */
  const nameMatch = raw.match(/(?:je m'?\s?appelle|mon (?:nom|prénom|prenom) (?:est|c'est)|moi c'?\s?est)\s+([A-Za-zÀ-ÿ-]{2,20})/i);
  if (nameMatch) {
    mem.name = capitalize(nameMatch[1]);
    return done({
      text: `Enchanté ${mem.name} ! Dites-moi ce que vous cherchez : une moto, une pièce ou un équipement ?`,
      quick: ["Une moto", "Une pièce", "Un casque"],
    });
  }

  /* --- Small talk ---------------------------------------------------- */
  if (hasAny(t, I.greet) && ws.length <= 4) {
    const malagasy = hasAny(t, ["salama", "manao ahoana"]);
    return done({
      text: malagasy
        ? `Salama${you} ! Tongasoa eto amin'ny Funbike. Je peux vous aider en français : quelle moto vous intéresse ?`
        : `${pick(["Bonjour", "Hello", "Ravi de vous lire"])}${you} ! Comment puis-je vous aider aujourd'hui ?`,
      quick: DEFAULT_QUICK,
    });
  }
  if (hasAny(t, I.bye)) return done({ text: `Merci de votre visite${you} ! À très bientôt chez Funbike, et bonne route.` });
  if ((hasAny(t, I.thanks) && ws.length <= 5) || (hasAny(t, I.thanksShort) && ws.length <= 2))
    return done({ text: pick([`Avec plaisir${you} !`, "Je vous en prie !", "Toujours là pour aider !"]) + " Autre chose ?", quick: DEFAULT_QUICK });

  /* --- Human / contact ---------------------------------------------- */
  if (hasAny(t, I.human)) {
    return done({
      text: `Bien sûr, l'équipe est joignable directement :\n• Téléphone : **${SHOP.phone}**\n• Email : **${SHOP.email}**\n${shopStatus().text}`,
      actions: [{ label: "Écrire à l'équipe", page: "contact", icon: "contact" }],
    });
  }

  /* --- Dealers ----------------------------------------------------- */
  if (hasAny(t, I.dealers)) {
    const cityHit: Record<string, string> = {
      toamasina: "toamasina",
      tamatave: "toamasina",
      mahajanga: "mahajanga",
      majunga: "mahajanga",
      fianar: "fianarantsoa",
      antsirabe: "fianarantsoa",
      diego: "mahajanga",
      tulear: "fianarantsoa",
      tana: "antananarivo",
      antananarivo: "antananarivo",
    };
    const hitKey = Object.keys(cityHit).find((c) => hasAny(t, [c]));
    const hit = hitKey ? cityHit[hitKey] : undefined;
    const names: Record<string, string> = {
      antananarivo: "Antananarivo (showroom principal, Ambodivona)",
      toamasina: "Toamasina (Funbike Est, boulevard Joffre)",
      mahajanga: "Mahajanga (Funbike Nord-Ouest, avenue de France)",
      fianarantsoa: "Fianarantsoa (atelier partenaire, RN7)",
    };
    return done({
      text: hit
        ? `Oui, retrouvez-nous à **${names[hit]}** ! Voici la carte, les horaires et les contacts du point de vente.`
        : `Nous avons **4 points de vente** à Madagascar : **Antananarivo** (showroom principal), **Toamasina**, **Mahajanga** et **Fianarantsoa**. Voici la carte et toutes les adresses.`,
      actions: [
        {
          label: "Voir nos revendeurs",
          page: "revendeurs",
          ...(hit ? { id: hit } : {}),
          icon: "contact",
        },
      ],
      quick: ["Horaires du showroom", "Réserver un essai"],
    });
  }

  /* --- Hours & location -------------------------------------------- */
  if (hasAny(t, I.hours)) {
    return done({
      text: `Showroom & atelier Funbike à **${SHOP.city}**, ${SHOP.hours}.\n${shopStatus().text}`,
      actions: [
        { label: "Tous nos revendeurs", page: "revendeurs", icon: "contact" },
        { label: "Nous contacter", page: "contact", icon: "contact" },
      ],
      quick: ["Réserver un essai", "Motos disponibles"],
    });
  }

  /* --- Intelligent bike recommendation (Piston) --------------------- */
  // Never recommend at random: understand the need first, ask the minimum
  // of questions, build a profile, then match it to the catalogue.
  {
    const isPartsOrGear = hasAny(t, I.parts) || hasAny(t, I.gear);
    const isPriceIntent = hasAny(t, I.price);
    const isSpecificModel = isSpecificModelRequest(t);
    const brandMention = detectBrandText(t);
    const inSession = Boolean(mem.need) && !mem.needComplete;
    const genericSeek =
      (hasAny(t, I.recommend) ||
        /cherche|achet|prend|veux|voudrais|besoin|quel(le)?\s+moto|une\s+moto|une\s+motocyc/i.test(t) ||
        (Boolean(brandMention) && /une|veux|achet|cherch|besoin/i.test(t))) &&
      !isSpecificModel &&
      !isPartsOrGear &&
      !isPriceIntent;
    const sessionBlocked =
      isPartsOrGear || isPriceIntent || isSpecificModel || hasAny(t, I.hours) || hasAny(t, I.compare) || hasAny(t, I.human);

    if ((inSession && !sessionBlocked) || (genericSeek && !inSession)) {
      if (genericSeek && !inSession && mem.needComplete) {
        // A brand new request: start a clean consultation.
        mem.need = undefined;
        mem.needComplete = false;
      }
      const { reply } = runRecommender(t, mem);
      return { reply, memory: mem };
    }
  }

  const found = searchBikes(t);
  const ref = resolveReference(t, mem);
  // Short follow-ups ("Prix", "Voir la fiche", "son poids ?") refer to the bike just discussed
  const followUp =
    mem.lastIds.length > 0 && hasAny(t, [...I.price, ...I.specs, ...I.open, ...I.test]) ? byId(mem.lastIds[0]) : undefined;
  const target = found[0] ?? ref ?? followUp;

  /* --- Price (never invented) --------------------------------------- */
  if (hasAny(t, I.price)) {
    if (hasAny(t, I.gear) && hasAny(t, ["tvs", "apache", "raider"])) {
      return done({
        text: "Pour les **casques, blousons et gants TVS**, le prix et la disponibilité à Madagascar sont à confirmer auprès de Funbike. Vous pouvez consulter les références puis demander un devis pour celle qui vous intéresse.",
        actions: [{ label: "Équipements TVS", page: "equipements", id: "tvs", icon: "gear" }],
      });
    }
    const text = target
      ? `Le prix de la **${target.name}** est communiqué **sur devis** : il dépend de la finition, des options et du stock du moment. Je vous prépare la demande ?`
      : "Nos prix sont communiqués **sur devis**, selon le modèle, la finition et le stock. Dites-moi quel modèle vous intéresse et je vous oriente.";
    const reply: BotReply = { text, actions: [CONTACT_ACTION], quick: target ? ["Voir la fiche", "Réserver un essai"] : ["Motos Sherco", "Motos TVS"] };
    return done(target ? withBikes(reply, [target], mem, 1) : reply);
  }

  /* --- Financing ----------------------------------------------------- */
  if (hasAny(t, I.credit)) {
    return done({
      text: "Les modalités de paiement se discutent directement avec l'équipe commerciale, selon le modèle choisi. Envoyez une demande et on vous répond avec les options possibles.",
      actions: [CONTACT_ACTION],
    });
  }

  /* --- Test ride ----------------------------------------------------- */
  if (hasAny(t, I.test)) {
    return done({
      text: `Excellente idée${you} ! Les essais se réservent auprès du showroom${target ? ` pour la **${target.name}**` : ""}. Laissez vos coordonnées, l'équipe vous rappelle pour fixer un créneau.\n${shopStatus().text}`,
      actions: [{ label: "Réserver un essai", page: "contact", icon: "contact" }],
    });
  }

  /* --- Workshop ------------------------------------------------------ */
  if (hasAny(t, I.service)) {
    return done({
      text: `Notre atelier s'occupe de l'entretien, des révisions et des réparations${target ? `, y compris sur la **${target.name}**` : ""}. Indiquez le modèle et l'année de votre moto pour un diagnostic rapide.`,
      actions: [{ label: "Contacter l'atelier", page: "contact", icon: "contact" }],
      quick: ["Pièces pour ma moto", "Horaires du showroom"],
    });
  }

  /* --- Compare ------------------------------------------------------- */
  if (hasAny(t, I.compare)) {
    const pool = [...found];
    mem.lastIds.forEach((id) => {
      const b = byId(id);
      if (b && !pool.includes(b)) pool.push(b);
    });
    if (pool.length >= 2) {
      const [a, b] = pool;
      mem.lastIds = [a.id, b.id];
      return done({
        text: `Voici la comparaison **${a.name}** vs **${b.name}** :`,
        compare: [a.id, b.id],
        quick: [`Fiche ${a.name.split(" ").slice(0, 3).join(" ")}`, "Laquelle pour débuter ?"],
      });
    }
    return done({ text: "Dites-moi les deux modèles à comparer, par exemple : « compare la SEF 250 et la SEF 300 ».", quick: ["Compare SEF 250 et SEF 300"] });
  }

  /* --- Spec follow-up ------------------------------------------------ */
  if (hasAny(t, I.specs) && target) {
    const answer = specAnswer(target, t) ?? specList(target);
    return done(withBikes({ text: answer, quick: ["Prix de ce modèle", "Réserver un essai", "Comparer"] }, [target], mem, 1));
  }

  /* --- Open a product ------------------------------------------------ */
  if (hasAny(t, I.open) && target) {
    return done(
      withBikes(
        {
          text: `Voici la **${target.name}**. Touchez la carte pour ouvrir la fiche complète.`,
          actions: [{ label: "Ouvrir la fiche", page: "product", id: target.id, icon: "product" }],
        },
        [target],
        mem,
        1,
      ),
    );
  }

  /* --- Sizing -------------------------------------------------------- */
  if (hasAny(t, I.size)) {
    return done({
      text: "Pour un **casque** : mesurez votre tour de tête avec un mètre ruban, environ 2 cm au-dessus des sourcils. Le casque doit serrer uniformément, sans point de pression.\nPour des **bottes** : partez de votre pointure habituelle.\nLe plus sûr reste l'essayage au showroom, l'équipe vous guide.",
      actions: [
        { label: "Casques Troy Lee", page: "equipements", id: "tld", icon: "gear" },
        { label: "Bottes Gaerne", page: "equipements", id: "gaerne", icon: "gear" },
      ],
    });
  }

  /* --- Gear ---------------------------------------------------------- */
  if (hasAny(t, I.gear)) {
    if (hasAny(t, ["tvs", "apache", "raider"])) {
      return done({
        text: "TVS propose aussi des **casques, blousons et gants** pour les pilotes. Retrouvez les références officielles dans la gamme TVS ; tailles, prix et disponibilité chez Funbike sont à confirmer.",
        actions: [{ label: "Voir les équipements TVS", page: "equipements", id: "tvs", icon: "gear" }],
        quick: ["Un casque TVS", "Un blouson TVS", "Prix des équipements TVS"],
      });
    }
    const boots = hasAny(t, ["botte", "gaerne", "chaussure"]);
    const mt = hasAny(t, ["mt helmet", "mt$"]);
    return done({
      text: boots
        ? "Pour les bottes, nous travaillons avec **Gaerne** (tout-terrain et route). Donnez votre pointure et votre pratique, l'équipe vérifie la disponibilité."
        : `Côté équipement pilote : **${TROY_LEE_HELMETS.length} références Troy Lee Designs**, des casques **MT Helmets**, des bottes **Gaerne** et des **casques, blousons et gants TVS**.`,
      actions: [
        { label: boots ? "Voir Gaerne" : mt ? "Voir MT Helmets" : "Casques Troy Lee", page: "equipements", id: boots ? "gaerne" : mt ? "mt" : "tld", icon: "gear" },
        ...(boots ? [] : [{ label: "Équipements TVS", page: "equipements", id: "tvs", icon: "gear" as const }]),
      ],
      quick: ["Quelle taille choisir ?", "Pièces pour ma moto"],
    });
  }

  /* --- Parts --------------------------------------------------------- */
  if (hasAny(t, I.parts)) {
    const requestedBrand = detectBrandText(t);
    if (requestedBrand === "TVS") {
      return done({
        text: `La sélection **pièces détachées TVS** comprend notamment des pneus, kits chaîne, plaquettes et disques de frein, filtres, câbles et kits d’entretien (${TVS_COMPATIBLE_PARTS.length} références simulées). Indiquez le modèle et l’année pour confirmer les dimensions et la compatibilité.`,
        actions: [{ label: "Voir les pièces TVS", page: "spares", id: "spare-tvs", icon: "parts" }],
        quick: ["Pneu TVS", "Kit chaîne TVS", "Freinage TVS"],
      });
    }
    return done({
      text: `Nous proposons des **pièces détachées moto** : pneus, kits chaîne, freinage Galfer, filtration, pièces mécaniques et consommables${target ? ` compatibles avec la **${target.name}**` : ""}. Précisez le modèle et l'année de votre moto pour vérifier la compatibilité et la disponibilité.`,
        actions: [{ label: "Voir les pièces", page: "spares", icon: "parts" }],
      quick: ["Plaquettes de frein", "Kit chaîne", "Contacter l'atelier"],
    });
  }

  /* --- Catalogue search --------------------------------------------- */
  if (found.length) {
    const brand = detectBrand(t);
    const family = detectFamily(t);
    const label = brand ? `les motos **${brand}**` : family ? `la gamme **${family}**` : "ce que j'ai trouvé";
    return done(
      withBikes(
        {
          text: `Voici ${label} (${Math.min(found.length, 4)} sur ${found.length}) :`,
          quick: ["Comparer les deux premières", "Laquelle pour débuter ?", "Prix"],
          actions: [{ label: "Tout le catalogue", page: "motos", icon: "catalog" }],
        },
        found,
        mem,
      ),
    );
  }

  /* --- Catalogue overview ------------------------------------------ */
  if (hasAny(t, I.catalog)) {
    const count = (f: BikeFamily) => motorcycles.filter((b) => b.family === f).length;
    return done({
      text: `Notre catalogue compte **${motorcycles.length} véhicules** :\n• ${count("Off-road")} motos off-road (Sherco, Fantic)\n• ${count("Urbain")} motos urbaines (TVS)\n• ${count("3 roues")} tuktuk 3 roues\nQuelle famille vous intéresse ?`,
      quick: ["Enduro / off-road", "Motos TVS", "Tuktuk 3 roues"],
      actions: [{ label: "Voir le catalogue", page: "motos", icon: "catalog" }],
    });
  }

  /* --- Fallback ------------------------------------------------------ */
  mem.misses += 1;
  if (mem.misses >= 2) {
    return {
      reply: {
        text: `Je préfère ne pas vous répondre au hasard${you}. Un conseiller Funbike pourra vous aider précisément : **${SHOP.phone}**.`,
        actions: [{ label: "Contacter un conseiller", page: "contact", icon: "phone" }],
        quick: DEFAULT_QUICK,
      },
      memory: mem,
    };
  }
  return {
    reply: {
      text: "Je n'ai pas bien saisi. Vous pouvez me demander par exemple une moto (« enduro 250 »), une pièce, un casque, les horaires ou un devis.",
      quick: DEFAULT_QUICK,
    },
    memory: mem,
  };
}

/** Human-like typing time, proportional to the answer length. */
export function typingDelay(reply: BotReply): number {
  const base = 450 + reply.text.length * 11 + (reply.productIds?.length ?? 0) * 120 + (reply.compare ? 300 : 0);
  return Math.min(2300, Math.max(650, base));
}
