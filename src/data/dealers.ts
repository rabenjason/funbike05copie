import type { Dealer } from "../types";

/**
 * Données centralisées des revendeurs FunBike.
 *
 * La page Revendeurs génère automatiquement ses onglets de villes, sa fiche
 * détaillée, son slider de fiches et ses liens Itinéraire à partir de ces
 * listes. Pour ajouter un revendeur : ajouter une entrée ci-dessous, aucun
 * autre fichier à modifier — la fiche apparaît automatiquement.
 *
 * Chaque revendeur porte son identifiant unique, son nom, son type, sa ville,
 * son adresse, ses coordonnées GPS (latitude/longitude), son téléphone, son
 * e-mail, ses horaires, sa description et ses services.
 */

// Verify contact details and exact street coordinates before publishing.
export const OFFICIAL_DEALERS: Dealer[] = [
  { key: "antananarivo", city: "Antananarivo", name: "Funbike Showroom", kind: "Showroom principal", address: "Ambodivona, Antananarivo", hours: "Lun – Sam · 8h30 – 17h30", phone: "+261 34 00 000 00", email: "contact@funbike.mg", desc: "Le point de départ de votre prochaine aventure. Retrouvez les motos, les équipements et notre atelier à la même adresse.", lat: -18.8792, lon: 47.5079, services: ["Motos", "Essais", "Atelier", "Pièces"] },
  { key: "toamasina", city: "Toamasina", name: "Funbike Est", kind: "Point de vente", address: "Boulevard Joffre, Toamasina", hours: "Lun – Ven · 9h – 17h", phone: "+261 34 11 111 11", email: "est@funbike.mg", desc: "Sur la côte est, une équipe à vos côtés pour choisir votre moto, vous équiper et assurer l'entretien courant.", lat: -18.1492, lon: 49.4023, services: ["Motos", "Équipements", "Entretien"] },
  { key: "mahajanga", city: "Mahajanga", name: "Funbike Nord-Ouest", kind: "Point de vente", address: "Avenue de France, Mahajanga", hours: "Lun – Ven · 9h – 17h", phone: "+261 34 22 222 22", email: "ouest@funbike.mg", desc: "Votre relais Funbike dans le nord-ouest pour les motos, les essais et les commandes de pièces.", lat: -15.7167, lon: 46.3167, services: ["Motos", "Essais", "Pièces"] },
  { key: "fianarantsoa", city: "Fianarantsoa", name: "Atelier Partenaire", kind: "Atelier partenaire", address: "Route nationale 7, Fianarantsoa", hours: "Lun – Sam · 8h – 16h", phone: "+261 34 33 333 33", email: "sud@funbike.mg", desc: "Sur la RN7, un atelier partenaire pour l'entretien, les réparations et le montage de pièces.", lat: -21.4527, lon: 47.0857, services: ["Atelier", "Pièces", "Entretien"] },
];

/* ------------------------------------------------------------------------ */
/* FICHE DE DÉMONSTRATION — INFORMATIONS FICTIVES                             */
/*                                                                            */
/* Fiche de test ajoutée pour vérifier l'adaptation de la page Revendeurs à   */
/* l'ajout d'un nouveau revendeur. Elle est volontairement séparée des        */
/* revendeurs réels et marquée isDemo : ne pas la présenter comme un          */
/* véritable revendeur officiel.                                              */
/*                                                                            */
/* Pour la supprimer ou la remplacer par les vraies informations de           */
/* Fort-Dauphin : supprimer ce bloc DEMO_DEALERS et remplacer la composition  */
/* de DEALERS par [...OFFICIAL_DEALERS] ci-dessous.                           */
/* Coordonnées GPS : approximations du centre de Fort-Dauphin (Taolagnaro).   */
/* ------------------------------------------------------------------------ */
export const DEMO_DEALERS: Dealer[] = [
  {
    key: "dealer-demo-fort-dauphin",
    isDemo: true,
    city: "Fort-Dauphin",
    name: "FunBike Fort-Dauphin — Démonstration",
    kind: "Revendeur de démonstration",
    address: "Adresse de démonstration",
    hours: "À titre de démonstration",
    phone: "000 00 000 00",
    email: "demo@funbike.mg",
    desc: "Revendeur de démonstration FunBike à Fort-Dauphin.",
    lat: -25.0319,
    lon: 46.9878,
    services: ["Vente et renseignements"],
  },
];

/** Liste complète affichée par la page Revendeurs : revendeurs réels, puis fiche de démonstration. */
export const DEALERS: Dealer[] = [...OFFICIAL_DEALERS, ...DEMO_DEALERS];
