/** Données éditoriales, de sélection et de présentation de la page d’accueil. */
export interface Highlight {
  productId: string;
  badge: string;
  eyebrow: string;
  bullets: string[];
  targetPage: "product" | "equipements";
  targetId?: string;
}

export const homepageHighlights: Highlight[] = [
  {
    productId: "sherco-sef-250-factory-2026",
    badge: "Nouveauté 2026",
    eyebrow: "Sherco / Enduro",
    bullets: ["Suspensions KYB", "Deux cartographies", "Freinage Galfer"],
    targetPage: "product",
  },
  {
    productId: "tvs-200-4v",
    badge: "Arrivage",
    eyebrow: "TVS / Urbain sportif",
    bullets: ["ABS", "Modes de conduite", "Tableau de bord digital"],
    targetPage: "product",
  },
  {
    // t1 est une référence existante de la collection Troy Lee Designs ; la carte mène à la gamme.
    productId: "t1",
    badge: "Collection 2026",
    eyebrow: "Troy Lee Designs / Pilote",
    bullets: ["Coque légère", "Ventilation travaillée", "Graphismes inédits"],
    targetPage: "equipements",
    targetId: "tld",
  },
];


export const homepageContent = {
    hero: {
      localisation: "Madagascar / Motos, équipement, liberté",
      titreLigne1: "Le terrain est",
      titreLigne2: "votre point de départ.",
      description:
        "Sherco, Fantic et TVS. Des motos faites pour aller plus loin, des pièces et de l'équipement pour suivre.",
      sloganPrefix: "Une moto faite pour",
      usages: ["la ville", "le travail", "le cross", "l'enduro", "les voyages", "les balades"],
      boutonCatalogue: "Explorer le catalogue",
      aLaUne: "À la une",
      annee: "2026",
      choisirModele: "Choisir le modèle mis en avant",
      afficherModele: "Afficher",
    },
    univers: {
      surTitre: "Choisir son univers",
      titre: "Pas de mauvaise direction.",
    },
    sherco: {
      surTitre: "L'univers Sherco / À partir de 50 cc",
      titreLigne1: "La première piste",
      titreLigne2: "est la plus belle.",
      description:
        "Découvrez l'esprit Sherco avec Funbike. Pour les jeunes pilotes, les familles et les amoureux du tout-terrain.",
      bouton: "Explorer les motos Sherco",
      imageAlt: "Moto Sherco 50 cc tout-terrain",
    },
    distributeur: {
      surTitre: "Distributeur exclusif / Madagascar",
      titre: "Nos marques officielles.",
      boutonToutVoir: "Tout voir →",
      boutonToutesMotos: "Voir toutes les motos →",
      logoPrefix: "Logo",
    },
    nouveautes: {
      surTitre: "Nouveautés / Arrivages",
      titre: "Frais de l'atelier.",
      description: "Trois nouveautés sélectionnées par l'équipe Funbike. Disponibilités sur demande.",
      tarif: "Tarif",
      boutonCatalogue: "Parcourir le catalogue",
      decouvrirPrefix: "Découvrir",
      // Les produits sont sélectionnés par ID dans homepageHighlights.
    },
    motos: {
      numero: "01 / Motos",
      titre: "À chaque terrain, sa machine.",
      description: "Une sélection de modèles disponibles chez Funbike.",
      bouton: "Toutes les motos",
    },
    atelier: {
      surTitre: "Atelier / Essentiels",
      titre: "Prêt pour la suite.",
      description: "Pièces, casques et blousons : TVS équipe aussi le pilote, pas seulement sa moto.",
      bouton: "Voir tous les équipements",
    },
    partenaires: {
      titre: "Nos partenaires",
      description: "Des marques qui roulent avec nous",
      logoPrefix: "Logo",
    },
  } as const;

export const homepageExclusiveBrands = [
  { brandId: "tvs", tagline: "Robustesse garantie" },
  { brandId: "fantic", tagline: "Performance italienne" },
  { brandId: "sherco", tagline: "ADN Compétition" },
] as const;

export const homepage = {
  ...homepageContent,
  featuredProductIds: homepageHighlights.map(({ productId }) => productId),
  heroFeaturedProductIds: ["sherco-sef-250-factory-2026", "sherco-sef-300-factory-2026", "xx-125-2026"],
  heroProductLabels: {
    "sherco-sef-250-factory-2026": "SEF 250 Factory",
    "sherco-sef-300-factory-2026": "SEF 300 Factory",
    "xx-125-2026": "XX 125 Off-Road",
  },
  highlights: homepageHighlights,
};

/** Cartes de navigation illustrées de l'accueil (pas des catégories catalogue). */
export const homepageCategories = [
  {
    title: "Motos TVS & Urbain",
    desc: "Mobilité quotidienne, robuste et économique.",
    src: "https://funbike.mg/wp-content/themes/funbike/images/raider.png",
    to: "motos",
  },
  {
    title: "Casques & Protections",
    desc: "Sécurité homologuée, confort longue distance.",
    src: "https://funbike.mg/wp-content/themes/funbike/images/tld-casque.png",
    to: "equipements",
    brand: "tld",
  },
  {
    title: "Pièces détachées",
    desc: "Pneus, kits chaîne, freinage et consommables.",
    src: "https://funbike.mg/wp-content/themes/funbike/images/piece.jpg",
    to: "spares",
  },
  {
    title: "Tenues & Équipements",
    desc: "Équipements pilote Troy Lee Designs.",
    src: "https://funbike.mg/wp-content/themes/funbike/images/tenu.jpg",
    to: "equipements",
    brand: "tld",
  },
] as const;
