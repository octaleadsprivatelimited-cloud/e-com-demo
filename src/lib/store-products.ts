import { useSyncExternalStore } from "react";
import {
  products as fallbackProducts,
  type Product,
  type VariantOption,
} from "@/data/commerce";
import { commerceApi } from "./commerce-api";

type StoreProduct = {
  id: string;
  name: string;
  category: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  media?: Array<{
    url: string;
    alt: string;
    type: "IMAGE" | "VIDEO";
    position: number;
    variantId?: string;
  }>;
  variants: Array<{
    id: string;
    sku: string;
    title?: string;
    price: number;
    mrp: number;
    stock: number;
    reserved?: number;
    attributes: Record<string, string>;
  }>;
};

const tones = ["#d7c5ac", "#c4c7b6", "#a5a28f", "#b9aaa0", "#d4c9b9", "#8d9288"];
const glyphs = ["◒", "◐", "▰", "◉", "◕", "◇"];

function mapProduct(item: StoreProduct, index: number): Product {
  const available = item.variants.map((entry) => ({
    ...entry,
    available: Math.max(0, entry.stock - (entry.reserved || 0)),
  }));
  const variant = available.find((entry) => entry.available > 0) || available[0];
  const optionValues = new Map<string, Set<string>>();
  available.forEach((entry) =>
    Object.entries(entry.attributes).forEach(([name, value]) => {
      if (!optionValues.has(name)) optionValues.set(name, new Set());
      optionValues.get(name)!.add(value);
    }),
  );
  const options: VariantOption[] = [...optionValues].map(([name, values]) => ({
    name,
    values: [...values],
  }));
  const images =
    item.media
      ?.filter((media) => media.type === "IMAGE")
      .sort((a, b) => a.position - b.position) || [];
  const image = images.find((media) => !media.variantId) || images[0];
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: variant?.price || 0,
    mrp: variant?.mrp || variant?.price || 0,
    rating: 0,
    reviews: 0,
    badge: available.some((entry) => entry.available > 0) ? undefined : "Sold out",
    tone: tones[index % tones.length]!,
    glyph: glyphs[index % glyphs.length]!,
    image: image?.url,
    imageAlt: image?.alt || item.name,
    options,
    variants: available.map((entry) => {
      const variantImage = images.find((media) => media.variantId === entry.id);
      return {
        id: entry.id,
        sku: entry.sku,
        title: entry.title,
        options: entry.attributes,
        price: entry.price,
        mrp: entry.mrp,
        stock: entry.available,
        image: variantImage?.url || image?.url,
        imageAlt: variantImage?.alt || image?.alt || item.name,
      };
    }),
  };
}

let catalog = fallbackProducts;
let catalogRequest: Promise<void> | undefined;
const catalogListeners = new Set<() => void>();

function loadCatalog() {
  if (catalogRequest) return catalogRequest;
  catalogRequest = commerceApi<StoreProduct[]>("/api/v1/products")
    .then((products) => {
      if (!products.length) return;
      catalog = products.map(mapProduct);
      catalogListeners.forEach((listener) => listener());
    })
    .catch(() => undefined);
  return catalogRequest;
}

function subscribe(listener: () => void) {
  catalogListeners.add(listener);
  void loadCatalog();
  return () => catalogListeners.delete(listener);
}

/** The live catalog snapshot also keeps cart mutations independent of hook timing. */
export function getStoreProductsSnapshot() {
  return catalog;
}

export function useStoreProducts() {
  return useSyncExternalStore(subscribe, getStoreProductsSnapshot, () => fallbackProducts);
}
