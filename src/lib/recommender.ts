import { motorcycles, brands } from "../data";
import type { Product } from "../types/product";
import type { ChatAction } from "./assistant";

/* ------------------------------------------------------------------ */
/*  Piston – Intelligent recommendation                                */
/*  Understands the real need BEFORE recommending, asks the minimum    */
/*  of questions, builds a need profile and matches it to the bike     */
/*  catalogue. Never recommends at random.                             */
/* ------------------------------------------------------------------ */

export type Usage =
  | "ville"
  | "travail"
  | "voyage"
  | "cross"
  | "enduro"
  | "tout-terrain"
  | "loisir"
  | "sport"
  | "transport"
  | "polyvalent";

export type Terrain = "route" | "piste" | "tout-terrain" | "mixte";
export type Distance = "courte" | "moyenne" | "longue";
export type Experience = "debutant" | "intermediaire" | "experimente";
export type Priority = "economie" | "confort" | "puissance" | "performance" | "maniable" | "autonomie";
export type Transport = "passager" | "marchandise";

export type NeedProfile = {
  usage: Usage | null;
  terrain: Terrain | null;
  distance: Distance | null;
  experience: Experience | null;
  priority: Priority | null;
  transport: Transport | null;
};

export type MemoryLike = {
  need?: NeedProfile | null;
  needComplete?: boolean;
  lastIds: string[];
  misses: number;
  name?: string;
};

type ReplyLike = {
  text: string;
  productIds?: string[];
  reasons?: Record<string, string>;
  quick?: string[];
  actions?: ChatAction[];
};

const emptyNeed = (): NeedProfile => ({
  usage: null,
  terrain: null,
  distance: null,
  experience: null,
  priority: null,
  transport: null,
});

/* ------------------------------------------------------------------ */
/*  Text helpers                                                       */
/* ------------------------------------------------------------------ */

const wordsOf = (t: string) => t.split(" ").filter(Boolean);

function hasAny(t: string, stems: string[]): boolean {
  const ws = wordsOf(t);
  return stems.some((s) => {
    if (s.endsWith("$")) return ws.includes(s.slice(0, -1));
    if (s.includes(" ")) return ` ${t} `.includes(` ${s}`);
    return ws.some((w) => w.startsWith(s));
  });
}

const hasNumber = (t: string) => /(?:^|\s)\d{2,3}(?:cc|cm3)?(?=\s|$)/.test(t);

/* Brand detection (self-contained to avoid a circular import). */
const BRAND_WORDS: Record<string, string[]> = {
  Sherco: ["sherco", "sef"],
  Fantic: ["fantic", "xx"],
  TVS: ["tvs", "apache", "raider", "hlx", "king"],
  Funbike: ["edition speciale", "serie limitee"],
};

export function detectBrandText(t: string): string | undefined {
  return Object.keys(BRAND_WORDS).find((b) => hasAny(t, BRAND_WORDS[b]));
}

const MODEL_WORDS = ["apache", "raider", "hlx", "king", "tuktuk", "trail", "xx", "sef", "factory", "sport", "edition"];

export function isSpecificModelRequest(t: string): boolean {
  const brand = detectBrandText(t);
  if (!brand) return false;
  const hasModel = MODEL_WORDS.some((kw) => hasAny(t, [kw]));
  return hasModel || hasNumber(t);
}

/* ------------------------------------------------------------------ */
/*  Extraction                                                         */
/* ------------------------------------------------------------------ */

export function extractNeed(t: string): NeedProfile {
  const p = emptyNeed();

  // usage – most specific first
  if (hasAny(t, ["cross", "motocross", "piste"])) p.usage = "cross";
  else if (hasAny(t, ["enduro", "rallye", "raid"])) p.usage = "enduro";
  else if (hasAny(t, ["transport", "passager", "passagers", "taxi", "marchandise", "marchandises", "charge", "charges", "famille", "epouse", "personne", "personnes"])) p.usage = "transport";
  else if (hasAny(t, ["travail", "travailler", "livraison", "livrer", "coursier", "delivery", "boulot", "client", "boulot"])) p.usage = "travail";
  else if (hasAny(t, ["voyage", "voyager", "long trajet", "longs trajets", "routier", "vacances", "tourisme", "tour"])) p.usage = "voyage";
  else if (hasAny(t, ["tout terrain", "tout-terrain", "off road", "offroad", "terre", "boue", "sentier", "champ", "foret", "foret"])) p.usage = "tout-terrain";
  else if (hasAny(t, ["ville", "urbain", "urbaine", "centre ville", "centre-ville"])) p.usage = "ville";
  else if (hasAny(t, ["loisir", "balade", "balades", "plaisir", "fun", "divertissement"])) p.usage = "loisir";
  else if (hasAny(t, ["sport", "sportif", "sportive", "racing"])) p.usage = "sport";
  else if (hasAny(t, ["polyvalent", "polyvalente", "mixte", "partout", "tout type", "toutes"])) p.usage = "polyvalent";

  // terrain
  if (hasAny(t, ["mixte", "polyvalent", "partout", "route et terre", "et terre", "tout type"])) p.terrain = "mixte";
  else if (hasAny(t, ["piste", "motocross", "cross"])) p.terrain = "piste";
  else if (hasAny(t, ["terre", "tout terrain", "off road", "offroad", "boue", "piste"])) p.terrain = "tout-terrain";
  else if (hasAny(t, ["route", "bitume", "asphalte", "ville", "urbain"])) p.terrain = "route";

  // distance
  if (hasAny(t, ["long", "longs", "longue", "longues", "long trajet", "longs trajets", "voyage", "voyager", "routier", "grande distance"])) p.distance = "longue";
  else if (hasAny(t, ["moyen", "moyenne", "moyens", "moyennes", "trajets moyens"])) p.distance = "moyenne";
  else if (hasAny(t, ["court", "courts", "courte", "courtes", "quotidien", "quotidiens", "petits trajets", "petit trajet", "petite distance"])) p.distance = "courte";

  // experience
  if (hasAny(t, ["debutant", "debuter", "debut", "premiere moto", "premiere", "jamais", "novice", "apprendre", "apprends", "commence", "commencer", "jeune", "petit niveau"])) p.experience = "debutant";
  else if (hasAny(t, ["experimente", "expert", "pro$", "pro", "confirme", "confirmé", "vieux loup", "confirm", "depis longtemps", "beaucoup"])) p.experience = "experimente";
  else if (hasAny(t, ["intermediaire", "intermediate", "intermedi", "un peu", "quelque temps", "quelques annees", "depis un"])) p.experience = "intermediaire";

  // priority
  if (hasAny(t, ["economie", "economique", "economiser", "consomm", "pas cher", "pas cher", "bon marche", "bon marche", "petit prix", "economique"])) p.priority = "economie";
  else if (hasAny(t, ["autonomie", "reservoir", "reservoir", "grande distance", "longue distance", "autonomie"])) p.priority = "autonomie";
  else if (hasAny(t, ["puissance", "puissant", "puissante", "fort"])) p.priority = "puissance";
  else if (hasAny(t, ["performance", "performant", "performante", "sport", "sportif", "sportive", "racing"])) p.priority = "performance";
  else if (hasAny(t, ["confort", "confortable", "confort"])) p.priority = "confort";
  else if (hasAny(t, ["maniable", "maniabilite", "maniable", "leger", "legere", "legere", "agile", "manoeuvr", "facile"])) p.priority = "maniable";

  // transport
  if (hasAny(t, ["marchandise", "marchandises", "charge", "charges", "livraison", "colis", "commerce", "business"])) p.transport = "marchandise";
  else if (hasAny(t, ["passager", "passagers", "taxi", "famille", "epouse", "ami", "personnes", "2 personnes"])) p.transport = "passager";

  return p;
}

function mergeNeed(target: NeedProfile, source: NeedProfile): void {
  Object.assign(target, {
    usage: source.usage ?? target.usage,
    terrain: source.terrain ?? target.terrain,
    distance: source.distance ?? target.distance,
    experience: source.experience ?? target.experience,
    priority: source.priority ?? target.priority,
    transport: source.transport ?? target.transport,
  });
}

const ROAD_USAGE: Usage[] = ["ville", "travail", "transport", "polyvalent"];
const OFFROAD_USAGE: Usage[] = ["cross", "enduro", "tout-terrain"];

function inferTerrain(p: NeedProfile): void {
  if (p.terrain || !p.usage) return;
  if (p.usage === "cross") p.terrain = "piste";
  else if (p.usage === "enduro" || p.usage === "tout-terrain") p.terrain = "tout-terrain";
  else if (ROAD_USAGE.includes(p.usage)) p.terrain = "route";
}

/* ------------------------------------------------------------------ */
/*  Bike knowledge base                                                */
/* ------------------------------------------------------------------ */

type BikeTags = {
  usage: Usage[];
  terrain: Terrain[];
  distance: Distance[];
  experience: Experience[];
  priority: Priority[];
  transport: Transport[];
  pitch: string;
};

const TAGS: Record<string, BikeTags> = {
  "sherco-sef-250-factory-2026": {
    usage: ["enduro", "loisir", "sport"],
    terrain: ["piste", "tout-terrain", "mixte"],
    distance: ["moyenne", "longue"],
    experience: ["intermediaire", "experimente"],
    priority: ["performance"],
    transport: [],
    pitch: "une machine d'enduro performante pour la piste et le tout-terrain",
  },
  "sherco-sef-300-factory-2026": {
    usage: ["enduro", "loisir", "sport"],
    terrain: ["piste", "tout-terrain", "mixte"],
    distance: ["moyenne", "longue"],
    experience: ["intermediaire", "experimente"],
    priority: ["performance", "puissance", "autonomie"],
    transport: [],
    pitch: "plus de couple et d'autonomie pour l'enduro exigeant et les longues liaisons",
  },
  "xx-125-2026": {
    usage: ["cross", "enduro", "loisir", "sport"],
    terrain: ["piste", "tout-terrain", "mixte"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["maniable", "performance"],
    transport: [],
    pitch: "légère et facile à prendre en main, idéale pour débuter le tout-terrain",
  },
  "offroad-450": {
    usage: ["enduro", "voyage", "loisir"],
    terrain: ["piste", "tout-terrain", "mixte"],
    distance: ["longue", "moyenne"],
    experience: ["experimente", "intermediaire"],
    priority: ["autonomie", "performance", "puissance"],
    transport: [],
    pitch: "le gros cube pour les raids et les longues distances",
  },
  "offroad-trail": {
    usage: ["voyage", "loisir", "polyvalent", "travail"],
    terrain: ["mixte", "route", "tout-terrain"],
    distance: ["moyenne", "longue"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["autonomie", "confort"],
    transport: [],
    pitch: "polyvalente route et piste pour partir loin sans compromis",
  },
  "tvs-hlx-plus": {
    usage: ["travail", "ville", "polyvalent", "transport"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne", "longue"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["economie", "confort", "autonomie"],
    transport: ["marchandise", "passager"],
    pitch: "utilitaire increvable et économique pour le travail et la ville",
  },
  "tvs-bleu": {
    usage: ["ville", "loisir", "polyvalent"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire"],
    priority: ["economie", "maniable", "confort"],
    transport: ["passager"],
    pitch: "sobre et confortable pour la ville et les trajets quotidiens",
  },
  "tvs-200-4v": {
    usage: ["sport", "ville", "loisir", "voyage"],
    terrain: ["route", "mixte"],
    distance: ["moyenne", "longue"],
    experience: ["intermediaire", "experimente"],
    priority: ["performance", "puissance", "confort"],
    transport: ["passager"],
    pitch: "sportive nerveuse, ABS et confort, pour la ville comme les longs trajets",
  },
  "tvs-red": {
    usage: ["ville", "loisir", "sport"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire"],
    priority: ["maniable", "economie", "performance"],
    transport: ["passager"],
    pitch: "agile et économique, un design agressif pour la ville",
  },
  "tvs-125-hlx-5g": {
    usage: ["ville", "travail", "loisir", "polyvalent"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire"],
    priority: ["economie", "maniable"],
    transport: ["passager"],
    pitch: "économique et maniable, fiable pour rouler partout tous les jours",
  },
  "tuktuk": {
    usage: ["travail", "transport", "ville"],
    terrain: ["route"],
    distance: ["courte", "moyenne"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["economie", "confort"],
    transport: ["passager", "marchandise"],
    pitch: "le 3 roues pour transporter passagers et marchandises en ville",
  },
  "concept-urbain": {
    usage: ["ville", "loisir", "polyvalent", "voyage"],
    terrain: ["route", "mixte"],
    distance: ["courte", "moyenne", "longue"],
    experience: ["debutant", "intermediaire", "experimente"],
    priority: ["confort", "performance"],
    transport: ["passager"],
    pitch: "une série spéciale polyvalente, confortable et soignée",
  },
};

/* ------------------------------------------------------------------ */
/*  Questions                                                          */
/* ------------------------------------------------------------------ */

type Question = { field: string; text: string; quick: string[] };

const Q_USAGE: Question = {
  field: "usage",
  text: "Bien sûr 👍 Pour te conseiller correctement, tu comptes principalement l'utiliser pour quoi ?",
  quick: ["Ville / quotidien", "Travail / livraison", "Voyage / long trajet", "Cross / tout-terrain", "Enduro / loisir", "Transport de passagers"],
};

const Q_TERRAIN: Question = {
  field: "terrain",
  text: "D'accord 👍 Et tu vas principalement rouler sur quel type de terrain ?",
  quick: ["Route / bitume", "Piste / terre", "Mixte des deux"],
};

const Q_DISTANCE: Question = {
  field: "distance",
  text: "Tes trajets sont plutôt courts au quotidien ou tu prévois de faire de longs trajets ?",
  quick: ["Courts trajets quotidiens", "Trajets moyens", "Longs trajets"],
};

const Q_EXPERIENCE: Question = {
  field: "experience",
  text: "Et concernant ton expérience à moto, tu débutes ou tu as déjà de l'expérience ?",
  quick: ["Débutant", "Intermédiaire", "Expérimenté"],
};

function nextQuestion(p: NeedProfile): Question | null {
  if (!p.usage) return Q_USAGE;
  if (p.usage === "voyage" && !p.distance) return Q_DISTANCE;
  if (ROAD_USAGE.includes(p.usage) && !p.distance) return Q_DISTANCE;
  if (p.usage === "loisir" && !p.terrain) return Q_TERRAIN;
  if (OFFROAD_USAGE.includes(p.usage) && !p.experience) return Q_EXPERIENCE;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Matching                                                           */
/* ------------------------------------------------------------------ */

type Match = { bike: Product; score: number; pitch: string };

function scoreBike(bike: Product, p: NeedProfile): number {
  const tags = TAGS[bike.id];
  if (!tags) return 0;
  let score = 0;
  if (p.usage && tags.usage.includes(p.usage)) score += 5;
  if (p.terrain && tags.terrain.includes(p.terrain)) score += 4;
  if (p.distance && tags.distance.includes(p.distance)) score += 3;
  if (p.experience && tags.experience.includes(p.experience)) score += 3;
  if (p.priority && tags.priority.includes(p.priority)) score += 2;
  if (p.transport && tags.transport.includes(p.transport)) score += 2;
  return score;
}

export function recommend(p: NeedProfile, brand?: string): Match[] {
  let pool = motorcycles.filter((product) => TAGS[product.id]);
  if (brand) pool = pool.filter((product) => brands.find((item) => item.id === product.brandId)?.name === brand || product.brandId === "funbike");

  // Primary criterion: the usage must match (when the client told us the usage).
  if (p.usage) pool = pool.filter((b) => TAGS[b.id].usage.includes(p.usage as Usage));

  const matches: Match[] = pool
    .map((bike) => ({ bike, score: scoreBike(bike, p), pitch: TAGS[bike.id].pitch }))
    .filter((m) => m.score >= 7)
    .sort((a, b) => b.score - a.score);

  return matches.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/*  Phrasing                                                           */
/* ------------------------------------------------------------------ */

function introText(p: NeedProfile): string {
  const bits: string[] = [];
  if (p.usage) {
    const map: Record<Usage, string> = {
      ville: "une utilisation principalement en ville",
      travail: "un usage principal pour le travail",
      voyage: "un usage voyage / longs trajets",
      cross: "de la pratique du cross",
      enduro: "de la pratique de l'enduro",
      "tout-terrain": "un usage tout-terrain",
      loisir: "un usage loisir",
      sport: "une recherche de sensations sport",
      transport: "le transport de personnes ou de charges",
      polyvalent: "un usage polyvalent",
    };
    bits.push(map[p.usage]);
  }
  if (p.distance) bits.push(p.distance === "longue" ? "avec de longs trajets" : p.distance === "courte" ? "avec des trajets quotidiens" : "avec des trajets moyens");
  let intro = `D'après ce que tu m'as dit (${bits.join(", ") || "tes critères"}), voici les modèles qui correspondent à ton besoin :`;
  return intro;
}

/* ------------------------------------------------------------------ */
/*  Orchestration                                                      */
/* ------------------------------------------------------------------ */

export function runRecommender(t: string, mem: MemoryLike): { reply: ReplyLike; memory: MemoryLike } {
  const profile = mem.need && !mem.needComplete ? { ...mem.need } : emptyNeed();
  mergeNeed(profile, extractNeed(t));
  inferTerrain(profile);

  // A question is still needed to reach a confident recommendation.
  const q = nextQuestion(profile);
  if (q) {
    mem.need = profile;
    mem.needComplete = false;
    return { reply: { text: q.text, quick: q.quick }, memory: mem };
  }

  const brand = detectBrandText(t);
  const matches = recommend(profile, brand);
  mem.needComplete = true;
  mem.need = profile;

  if (matches.length === 0) {
    return {
      reply: {
        text: "Je n'ai pas encore trouvé de modèle qui corresponde exactement à ton besoin. Je peux élargir la recherche avec un usage proche. Dis-moi plutôt : ville, travail, voyage, cross, enduro ou transport ?",
        quick: ["Ville / quotidien", "Travail / livraison", "Voyage / long trajet", "Cross / tout-terrain"],
      },
      memory: mem,
    };
  }

  const reasons: Record<string, string> = {};
  matches.forEach((m) => (reasons[m.bike.id] = m.pitch));
  mem.lastIds = matches.map((m) => m.bike.id);

  const text =
    introText(profile) +
    "\n" +
    matches.map((m) => `• ${m.bike.name} — ${m.pitch}.`).join("\n");

  return {
    reply: {
      text,
      productIds: matches.map((m) => m.bike.id),
      reasons,
      quick: ["Comparer les deux premières", "Prix de ces modèles", "Réserver un essai"],
      actions: [{ label: "Tout le catalogue", page: "motos", icon: "catalog" }],
    },
    memory: mem,
  };
}
