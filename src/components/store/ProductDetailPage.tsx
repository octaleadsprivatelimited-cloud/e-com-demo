import { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { money } from "@/data/commerce";
import { useCommerceCart } from "@/lib/commerce-cart";
import { useStoreProducts } from "@/lib/store-products";
import { StorePage } from "./StoreHeader";
import { toast, Toaster } from "sonner";
import { Route } from "@/routes/product.$productId";
export function ProductDetailPage() {
  const { productId } = Route.useParams();
  const products = useStoreProducts();
  const product = products.find((p) => p.id === productId);
  const [qty, setQty] = useState(1),
    [selected, setSelected] = useState<Record<string, string>>({});
  const cart = useCommerceCart();
  useEffect(() => {
    const initial =
      product?.variants?.find((variant) => variant.stock > 0) ||
      product?.variants?.[0];
    setSelected(initial?.options || {});
    setQty(1);
  }, [product?.id]);
  if (!product)
    return (
      <StorePage>
        <main className="product-page module-empty">
          <ShoppingBag />
          <h2>Loading product details…</h2>
        </main>
      </StorePage>
    );
  const selectedVariant = product.variants?.find(
    (variant) =>
      Object.keys(variant.options).length === Object.keys(selected).length &&
      Object.entries(selected).every(
        ([name, value]) => variant.options[name] === value,
      ),
  );
  const price = selectedVariant?.price ?? product.price;
  const mrp = selectedVariant?.mrp ?? product.mrp;
  const chooseOption = (name: string, value: string) => {
    const matching =
      product.variants?.find(
        (variant) =>
          variant.stock > 0 &&
          variant.options[name] === value &&
          Object.entries(selected).every(
            ([selectedName, selectedValue]) =>
              selectedName === name ||
              variant.options[selectedName] === selectedValue,
          ),
      ) ||
      product.variants?.find(
        (variant) => variant.stock > 0 && variant.options[name] === value,
      );
    setSelected(matching?.options || { ...selected, [name]: value });
    setQty(1);
  };
  const add = () => {
    if (
      !selectedVariant ||
      selectedVariant.stock < 1 ||
      !cart.add(product.id, selectedVariant.id, qty)
    ) {
      toast.error("Choose an available product option");
      return false;
    }
    toast.success("Added to your bag");
    return true;
  };
  return (
    <StorePage>
      <Toaster richColors position="bottom-center" />
      <main className="product-page">
        <div className="breadcrumbs">
          <a href="/">Home</a>
          <ChevronRight />
          <a href="/shop">Shop</a>
          <ChevronRight />
          <span>{product.name}</span>
        </div>
        <section className="product-detail">
          <div className="product-gallery">
            <div
              className="detail-art main"
              style={{ background: product.tone }}
            >
              {selectedVariant?.image || product.image ? (
                <img
                  src={selectedVariant?.image || product.image}
                  alt={
                    selectedVariant?.imageAlt ||
                    product.imageAlt ||
                    product.name
                  }
                />
              ) : product.glyph}
            </div>
            {!product.image && [1, 2, 3].map((x) => (
              <div
                className="detail-art"
                style={{ background: product.tone }}
                key={x}
              >
                {product.glyph}
              </div>
            ))}
          </div>
          <div className="buy-panel">
            <p className="eyebrow">{product.category}</p>
            <h1>{product.name}</h1>
            <div className="detail-rating">
              <Star /> {product.rating}{" "}
              <a href="#reviews">{product.reviews} reviews</a>
            </div>
            <div className="detail-price">
              {money(price)} <s>{money(mrp)}</s>
              {mrp > price && (
                <span>{Math.round((1 - price / mrp) * 100)}% off</span>
              )}
            </div>
            <p className="tax-note">Inclusive of all taxes</p>
            <p className="detail-copy">
              A considered everyday piece selected for its material honesty,
              useful form and lasting quality.
            </p>
            {product.options?.map((opt) => (
              <div className="option-picker" key={opt.name}>
                <div>
                  <b>Select {opt.name}</b>
                  <button>Size guide</button>
                </div>
                <div>
                  {opt.values.map((v) => (
                    <button
                      onClick={() => chooseOption(opt.name, v)}
                      className={selected[opt.name] === v ? "active" : ""}
                      disabled={
                        !product.variants?.some(
                          (variant) =>
                            variant.stock > 0 && variant.options[opt.name] === v,
                        )
                      }
                      key={v}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="buy-actions">
              <div className="quantity">
                <button onClick={() => setQty(Math.max(1, qty - 1))}>
                  <Minus />
                </button>
                <span>{qty}</span>
                <button
                  onClick={() =>
                    setQty(
                      Math.min(20, selectedVariant?.stock || 1, qty + 1),
                    )
                  }
                  disabled={!selectedVariant || qty >= selectedVariant.stock}
                >
                  <Plus />
                </button>
              </div>
              <button
                className="add-bag"
                onClick={add}
                disabled={!selectedVariant || selectedVariant.stock < 1}
              >
                <ShoppingBag /> Add to bag
              </button>
              <button className="save">
                <Heart />
              </button>
            </div>
            <a
              className="buy-now"
              href="/checkout"
              onClick={(event) => {
                if (!add()) event.preventDefault();
              }}
            >
              Buy it now
            </a>
            <div className="delivery-box">
              <div>
                <Truck />
                <span>
                  <b>Free delivery</b>
                  <small>For orders over ₹5,000 · 3–6 business days</small>
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  <b>Secure checkout</b>
                  <small>Encrypted payments and verified providers</small>
                </span>
              </div>
              <div>
                <Check />
                <span>
                  <b>Easy returns</b>
                  <small>Return within 14 days in original condition</small>
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="product-description">
          <div>
            <p className="eyebrow">Designed to endure</p>
            <h2>
              Useful beauty,
              <br />
              honestly made.
            </h2>
          </div>
          <div>
            <p>
              We choose products that balance form, function and responsible
              production. Materials are selected for how they age, not just how
              they look on day one.
            </p>
            <dl>
              <div>
                <dt>Materials</dt>
                <dd>Natural and responsibly sourced</dd>
              </div>
              <div>
                <dt>Care</dt>
                <dd>Care instructions included</dd>
              </div>
              <div>
                <dt>Origin</dt>
                <dd>Made in small batches in India</dd>
              </div>
              <div>
                <dt>SKU</dt>
                <dd>{selectedVariant?.sku || `AR-${product.id.toUpperCase()}-001`}</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>
    </StorePage>
  );
}
