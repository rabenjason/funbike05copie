export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  isMain: boolean;
  position: number;
}

export interface ProductSpecification {
  key: string;
  value: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface Model {
  id: string;
  name: string;
  brandId: string;
}

/** Unified static catalog record, also suitable for a future API adapter. */
export interface Product {
  id: string;
  name: string;
  brandId: string;
  categoryId: string;
  productTypeId: string;
  modelId?: string;
  description: string;
  subDescription?: string;
  images: ProductImage[];
  specifications: ProductSpecification[];
  status: ProductStatus;
  price?: string;
  tags?: string[];
  badge?: string;
  /** Existing vehicle family classification. */
  family?: string;
  /** Compatibility is separate from the product's manufacturer. */
  compatibleBrandIds?: string[];
  compatibilityNote?: string;
  sourceUrl?: string;
}
