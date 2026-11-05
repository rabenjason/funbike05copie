export interface Dealer {
  key: string;
  city: string;
  name: string;
  kind: string;
  address: string;
  hours: string;
  phone: string;
  email: string;
  desc: string;
  lat: number;
  lon: number;
  services: string[];
  /** Fiche de démonstration (informations fictives) : ne pas présenter comme un revendeur officiel. */
  isDemo?: boolean;
}
