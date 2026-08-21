import { useMemo, useState } from "react";
import {
  Filter,
  Heart,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { money } from "@/data/commerce";
import { useStoreProducts } from "@/lib/store-products";
import { StorePage } from "./StoreHeader";
import { toast, Toaster } from "sonner";
export function ShopPage() {
  const products = useStoreProducts();
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const [category, setCategory] = useState(params.get("category") || "All"),
    [query, setQuery] = useState(params.get("q") || ""),
    [sort, setSort] = useState("featured"),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [ready, setReady] = useState(false),
    [filters, setFilters] = useState(false),
    [saved, setSaved] = useState<string[]>([]);
  const categories = ["All", ...new Set(products.map((p) => p.category))];
  const shown = useMemo(
    () =>
      products
        .filter(
          (p) =>
            (category === "All" || p.category === category) &&
            `${p.name} ${p.category}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (!min || p.price >= Number(min)) &&
            (!max || p.price <= Number(max)) &&
            (!ready || p.id !== "p1"),
        )
        .sort((a, b) =>
          sort === "low"
            ? a.price - b.price
            : sort === "high"
              ? b.price - a.price
              : b.rating - a.rating,
        ),
    [category, query, sort, min, max, ready],
  );
  const toggle = (id: string) => {
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    toast.success(
      saved.includes(id) ? "Removed from wishlist" : "Saved to wishlist",
    );
  };
  const filterContent = (
    <>
      <div className="mobile-filter-head">
        <h2>Filters</h2>
        <button onClick={() => setFilters(false)}>
          <X />
        </button>
      </div>
      <h3>Categories</h3>
      {categories.map((x) => (
        <button
          className={x === category ? "active" : ""}
          onClick={() => setCategory(x)}
          key={x}
        >
          {x}
          <span>
            {x === "All"
              ? products.length
              : products.filter((p) => p.category === x).length}
          </span>
        </button>
      ))}
      <hr />
      <h3>Availability</h3>
      <label>
        <input type="checkbox" checked readOnly /> In stock
      </label>
      <label>
        <input
          type="checkbox"
          checked={ready}
          onChange={(e) => setReady(e.target.checked)}
        />{" "}
        Ready to ship
      </label>
      <hr />
      <h3>Price</h3>
      <div className="price-range">
        <input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          inputMode="numeric"
          placeholder="₹ Min"
        />
        <span>—</span>
        <input
          value={max}
          onChange={(e) => setMax(e.target.value)}
          inputMode="numeric"
          placeholder="₹ Max"
        />
      </div>
      <button
        className="clear-filter"
        onClick={() => {
          setCategory("All");
          setMin("");
          setMax("");
          setReady(false);
        }}
      >
        Clear all filters
      </button>
    </>
  );
  return (
    <StorePage>
      <Toaster richColors />
      <main className="shop-page">
        <section className="shop-intro">
          <p className="eyebrow">The complete collection</p>
          <h1>Objects with purpose.</h1>
          <p>
            Made carefully, selected thoughtfully, and designed to stay in your
            life.
          </p>
        </section>
        <div className="catalog-tools">
          <label>
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories, brands…"
            />
          </label>
          <button onClick={() => setFilters(true)}>
            <Filter /> Filters
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>
        <div className="catalog-layout">
          <aside>{filterContent}</aside>
          <section>
            <div className="results-title">
              <span>{shown.length} products</span>
              <button onClick={() => setFilters(true)}>
                <SlidersHorizontal /> Refine
              </button>
            </div>
            {shown.length ? (
              <div className="catalog-grid">
                {shown.map((p) => (
                  <article key={p.id}>
                    <a
                      href={`/product/${p.id}`}
                      className="catalog-art"
                      style={{ background: p.tone }}
                    >
                      {p.image ? (
                        <img src={p.image} alt={p.imageAlt || p.name} loading="lazy" />
                      ) : (
                        <span>{p.glyph}</span>
                      )}
                      {p.badge && <em>{p.badge}</em>}
                    </a>
                    <button
                      aria-label={`Save ${p.name}`}
                      onClick={() => toggle(p.id)}
                      className={`catalog-heart ${saved.includes(p.id) ? "active" : ""}`}
                    >
                      <Heart />
                    </button>
                    <a href={`/product/${p.id}`}>
                      <small>{p.category}</small>
                      <h2>{p.name}</h2>
                      <div className="rating">
                        <Star /> {p.rating} <span>({p.reviews})</span>
                      </div>
                      <p>
                        {money(p.price)} <s>{money(p.mrp)}</s>
                      </p>
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <Search />
                <h2>No products found</h2>
                <p>Try clearing filters or using a broader search.</p>
                <button
                  onClick={() => {
                    setQuery("");
                    setMin("");
                    setMax("");
                    setCategory("All");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </div>
        {filters && (
          <>
            <button
              className="filter-backdrop"
              onClick={() => setFilters(false)}
            />
            <aside className="mobile-filters">{filterContent}</aside>
          </>
        )}
      </main>
    </StorePage>
  );
}
