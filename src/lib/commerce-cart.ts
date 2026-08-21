import { useEffect, useMemo, useState } from "react";
import { type Product } from "@/data/commerce";
import {
  getStoreProductsSnapshot,
  useStoreProducts,
} from "@/lib/store-products";

export type CartEntry = {
  productId: string;
  variantId?: string;
  quantity: number;
  /** Retained only while migrating carts saved before canonical variant IDs. */
  variant?: Record<string, string>;
};

const key = "aster-row-cart-v1";
const read = (): CartEntry[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};
const sameOptions = (
  left: Record<string, string>,
  right: Record<string, string>,
) => {
  const leftEntries = Object.entries(left);
  return (
    leftEntries.length === Object.keys(right).length &&
    leftEntries.every(([name, value]) => right[name] === value)
  );
};

const unavailableProduct = (productId: string): Product => ({
  id: productId,
  name: "Unavailable item",
  category: "Saved item",
  price: 0,
  mrp: 0,
  rating: 0,
  reviews: 0,
  badge: "Unavailable",
  tone: "#d8d8d2",
  glyph: "—",
  variants: [],
});

export function useCommerceCart() {
  const products = useStoreProducts();
  const [items, setItems] = useState<CartEntry[]>([]);
  const save = (next: CartEntry[]) => {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event("commerce-cart"));
  };

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener("commerce-cart", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("commerce-cart", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const current = read();
    let changed = false;
    const migrated = current.map((entry) => {
      if (entry.variantId || !entry.variant) return entry;
      const product = products.find((item) => item.id === entry.productId);
      const variant = product?.variants?.find((candidate) =>
        sameOptions(candidate.options, entry.variant || {}),
      );
      if (!variant) return entry;
      changed = true;
      return {
        productId: entry.productId,
        variantId: variant.id,
        variant: variant.options,
        quantity: entry.quantity,
      };
    });
    if (changed) save(migrated);
  }, [products]);

  const lines = useMemo(
    () =>
      items
        .map((entry, index) => {
          const catalogProduct = products.find(
            (item) => item.id === entry.productId,
          );
          const product = catalogProduct || unavailableProduct(entry.productId);
          const selectedVariant =
            product.variants?.find((variant) => variant.id === entry.variantId) ||
            product.variants?.find((variant) =>
              sameOptions(variant.options, entry.variant || {}),
            );
          return {
            entry,
            index,
            product,
            variant: selectedVariant,
            unitPrice: selectedVariant?.price ?? product.price,
            available: selectedVariant?.stock ?? 0,
            unresolved: !catalogProduct || !selectedVariant,
            missingProduct: !catalogProduct,
          };
        }),
    [items, products],
  );

  const add = (productId: string, variantId: string, quantity = 1) => {
    const product = getStoreProductsSnapshot().find(
      (item) => item.id === productId,
    );
    const variant = product?.variants?.find((item) => item.id === variantId);
    if (!product || !variant || variant.stock < 1) return false;
    const current = read();
    const index = current.findIndex(
      (entry) =>
        entry.productId === productId && entry.variantId === variantId,
    );
    const next = [...current];
    if (index >= 0) {
      const existing = next[index]!;
      next[index] = {
        ...existing,
        variant: variant.options,
        quantity: Math.min(20, variant.stock, existing.quantity + quantity),
      };
    } else {
      next.push({
        productId,
        variantId,
        variant: variant.options,
        quantity: Math.min(20, variant.stock, Math.max(1, quantity)),
      });
    }
    save(next);
    return true;
  };

  const update = (index: number, quantity: number) => {
    const current = read();
    const line = lines.find((candidate) => candidate.index === index);
    const safeQuantity = line
      ? Math.min(20, Math.max(0, line.available), quantity)
      : quantity;
    save(
      safeQuantity < 1
        ? current.filter((_, itemIndex) => itemIndex !== index)
        : current.map((entry, itemIndex) =>
            itemIndex === index
              ? { ...entry, quantity: safeQuantity }
              : entry,
          ),
    );
  };
  const clear = () => save([]);
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.entry.quantity,
    0,
  );

  return {
    items,
    lines,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    add,
    update,
    clear,
  };
}
