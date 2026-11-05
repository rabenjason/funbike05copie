export type PromotionStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED" | "ARCHIVED";

export interface StaticPromotion {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: PromotionStatus;
  productIds: string[];
}

/** Aucun calendrier promotionnel explicite n'existe actuellement dans le catalogue. */
export const promotions: StaticPromotion[] = [];
