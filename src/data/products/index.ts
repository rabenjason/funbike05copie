import { motorcycles } from "./motorcycles";
import { spareParts } from "./spareParts";
import { helmets } from "./helmets";
import { ridingGear } from "./ridingGear";
import { accessories } from "./accessories";
import type { Product } from "../../types/product";

export { motorcycles, spareParts, helmets, ridingGear, accessories };
export const products: Product[] = [
  ...motorcycles,
  ...spareParts,
  ...helmets,
  ...ridingGear,
  ...accessories,
];

export const findProductById = (id?: string): Product | undefined =>
  id ? products.find((product) => product.id === id) : undefined;
export const getProductsByBrand = (brandId: string): Product[] =>
  products.filter((product) => product.brandId === brandId);
export const getProductsByCategory = (categoryId: string): Product[] =>
  products.filter((product) => product.categoryId === categoryId);
export const getProductsByType = (productTypeId: string): Product[] =>
  products.filter((product) => product.productTypeId === productTypeId);
export const mainProductImage = (product: Product) =>
  [...product.images].sort((a, b) => a.position - b.position).find((image) => image.isMain) ?? product.images[0];
export const productGallery = (product: Product) =>
  [...product.images].sort((a, b) => a.position - b.position).map((image) => image.url);
