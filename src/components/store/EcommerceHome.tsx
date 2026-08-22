import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  User,
  X,
} from "lucide-react";
import { categories, money, type Product } from "@/data/commerce";
import { useStoreProducts } from "@/lib/store-products";
import { toast, Toaster } from "sonner";
import { StoreBrand, useStorefrontConfig } from "@/lib/storefront-config";
import { CampaignSlot } from "@/lib/promotions";
import { useCommerceCart } from "@/lib/commerce-cart";

const Logo = () => <StoreBrand />;
function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product, variantId: string) => void;
}) {
  const [liked, setLiked] = useState(false);
  const requiresVariantSelection =
    (product.variants?.length || 0) > 1 ||
    (product.options || []).some((option) => option.values.length > 1);
  const chosenVariant =
    product.variants?.find((variant) => variant.stock > 0) ||
    product.variants?.[0];
  return (
    <article className="product-card">
      <div className="product-art" style={{ background: product.tone }}>
        {product.badge && <span className="tag">{product.badge}</span>}
        <button
          className={`heart ${liked ? "active" : ""}`}
          onClick={() => setLiked(!liked)}
          aria-label="Save to wishlist"
        >
          <Heart />
        </button>
        {product.image ? (
          <img src={product.image} alt={product.imageAlt || product.name} loading="lazy" />
        ) : (
          <span className="art-glyph">{product.glyph}</span>
        )}
        {requiresVariantSelection ? (
          <a className="quick" href={`/product/${product.id}`}>
            Choose options <ArrowRight />
          </a>
        ) : (
          <button
            className="quick"
            disabled={!chosenVariant}
            onClick={() => chosenVariant && onAdd(product, chosenVariant.id)}
          >
            Quick add <Plus />
          </button>
        )}
      </div>
      <div className="product-info">
        <p>{product.category}</p>
        <h3>{product.name}</h3>
        <div className="rating">
          <Star /> {product.rating} <span>({product.reviews})</span>
        </div>
        <div className="price">
          {money(chosenVariant?.price ?? product.price)}{" "}
          <s>{money(chosenVariant?.mrp ?? product.mrp)}</s>
        </div>
      </div>
    </article>
  );
}

export function EcommerceHome() {
  const storefront = useStorefrontConfig(),
    products = useStoreProducts(),cart = useCommerceCart();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [cartOpen, setCartOpen] = useState(false),[email, setEmail] = useState(""),[query,setQuery]=useState(""),[collection,setCollection]=useState("All");
  const shownProducts=collection==="All"?products:products.filter(product=>product.category===collection),count=cart.count,subtotal=cart.subtotal;
  const add = (p: Product,variantId:string) => {
    if (!cart.add(p.id,variantId)) {
      toast.error("That option is currently unavailable");
      return;
    }
    toast.success(`${p.name} added to bag`);
  };
  return (
    <div id="top" className="store-shell">
      <Toaster position="bottom-center" richColors />
      <CampaignSlot placement="HOME_HERO" />
      <div className="announcement">
        <span>{storefront.announcement}</span>
        <span>Easy 14-day returns</span>
        <span>Designed with intention</span>
      </div>
      <header className="store-header">
        <button
          aria-label="Open navigation"
          className="icon-btn mobile-only"
          onClick={() => setMenu(true)}
        >
          <Menu />
        </button>
        <Logo />
        <nav>
          <a href="/shop">New in</a>
          <a href="/shop">
            Shop <ChevronDown />
          </a>
          <a href="#journal">Journal</a>
          <a href="#values">Our values</a>
        </nav>
        <div className="header-actions">
          <button aria-label="Search" onClick={() => setSearch(!search)}>
            <Search />
          </button>
          <a href="/account" className="desktop-only" title="My account">
            <User />
          </a>
          <button
            aria-label={`Open bag with ${count} items`}
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag />
            <em>{count}</em>
          </button>
        </div>
      </header>
      {search && (
        <form className="search-bar" onSubmit={event=>{event.preventDefault();if(query.trim())window.location.href=`/shop?q=${encodeURIComponent(query.trim())}`}}>
          <Search />
          <input
            aria-label="Search products"
            autoFocus
            value={query}
            onChange={event=>setQuery(event.target.value)}
            placeholder="Search pieces, rooms and collections…"
          />
          <button type="submit" aria-label="Submit search"><ArrowRight /></button>
          <button type="button" aria-label="Close search" onClick={() => setSearch(false)}>
            <X />
          </button>
        </form>
      )}
      {menu && (
        <div className="mobile-menu">
          <div>
            <Logo />
            <button
              aria-label="Close navigation"
              onClick={() => setMenu(false)}
            >
              <X />
            </button>
          </div>
          {[
            "New in",
            "Home",
            "Wardrobe",
            "Workspace",
            "Travel",
            "Journal",
            "Our values",
          ].map((x) => (
            <a key={x} href="#shop" onClick={() => setMenu(false)}>
              {x}
              <ArrowRight />
            </a>
          ))}
        </div>
      )}
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">The autumn edit · 2026</p>
            <h1>
              Objects for a<br />
              <em>considered life.</em>
            </h1>
            <p>
              Enduring pieces for home, work and everywhere between. Designed
              with restraint, made to be lived with.
            </p>
            <div>
              <a className="btn dark" href="/shop">
                Explore the collection <ArrowRight />
              </a>
              <a className="text-link" href="#values">
                Our approach
              </a>
            </div>
          </div>
          <div className="hero-art">
            <div className="sun" />
            <div className="plinth" />
            <div className="vase">
              <i />
              <i />
              <i />
            </div>
            <span className="hero-note">01 / A study in balance</span>
          </div>
        </section>
        <section className="trust-row">
          <span>
            <Truck /> Free shipping over ₹5,000
          </span>
          <span>
            <ShieldCheck /> Secure, encrypted checkout
          </span>
          <span>
            <Sparkles /> Independent makers
          </span>
          <span>↻ Easy 14-day returns</span>
        </section>
        <section id="shop" className="section categories">
          <div className="section-head">
            <div>
              <p className="eyebrow">Shop by world</p>
              <h2>Made for how you live.</h2>
            </div>
            <a href="#new">
              View all collections <ArrowRight />
            </a>
          </div>
          <div className="category-grid">
            {categories.map(([name, copy, glyph, tone], i) => (
              <a
                href={`/shop?category=${encodeURIComponent(name)}`}
                className="category-card"
                key={name}
                style={{ background: tone }}
              >
                <span className="count">0{i + 1}</span>
                <span className="category-glyph">{glyph}</span>
                <div>
                  <h3>{name}</h3>
                  <p>{copy}</p>
                  <ArrowRight />
                </div>
              </a>
            ))}
          </div>
        </section>
        <section id="new" className="section products">
          <div className="section-head">
            <div>
              <p className="eyebrow">The edit</p>
              <h2>New and noteworthy.</h2>
            </div>
            <div className="filter-pills">
              {["All","Home","Wardrobe","Travel"].map(item=><button className={collection===item?"selected":""} onClick={()=>setCollection(item)} key={item}>{item}</button>)}
            </div>
          </div>
          <div className="product-grid">
            {shownProducts.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={add} />
            ))}
          </div>
          <a href="/shop" className="btn outline">
            Browse all products <ArrowRight />
          </a>
        </section>
        <section id="values" className="story">
          <div className="story-art">
            <span>
              FORM
              <br />
              FOLLOWS
              <br />
              <i>FEELING.</i>
            </span>
          </div>
          <div className="story-copy">
            <p className="eyebrow">Our point of view</p>
            <h2>
              Less, but better.
              <br />
              Always.
            </h2>
            <p>
              We partner with independent studios and responsible workshops to
              bring you objects with purpose. Every piece is selected for
              material honesty, everyday usefulness and staying power.
            </p>
            <div className="principles">
              <div>
                <b>01</b>
                <span>
                  <strong>Natural materials</strong>Chosen for character and
                  longevity.
                </span>
              </div>
              <div>
                <b>02</b>
                <span>
                  <strong>Thoughtful production</strong>Small batches. Fair
                  partnerships.
                </span>
              </div>
              <div>
                <b>03</b>
                <span>
                  <strong>Designed to endure</strong>Beyond seasons and trends.
                </span>
              </div>
            </div>
            <a className="text-link" href="#journal">
              Read our story <ArrowRight />
            </a>
          </div>
        </section>
        <section id="journal" className="section newsletter">
          <p className="eyebrow">Notes from the studio</p>
          <h2>A quieter kind of inbox.</h2>
          <p>
            New arrivals, maker stories and ideas for considered living. Sent
            occasionally.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.includes("@")) {
                toast.success("Welcome to the list");
                setEmail("");
              } else toast.error("Enter a valid email");
            }}
          >
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
            />
            <button>
              Join the list <ArrowRight />
            </button>
          </form>
          <small>By subscribing, you agree to our privacy policy.</small>
        </section>
      </main>
      <footer>
        <div>
          <Logo />
          <p>
            Considered goods for everyday living.
            <br />
            Based in India, shipping worldwide.
          </p>
        </div>
        {[
          ["Shop", "New arrivals", "Home", "Wardrobe", "Travel"],
          ["About", "Our story", "Makers", "Journal", "Responsibility"],
          [
            "Help",
            "Contact",
            "Shipping & returns",
            "Care guide",
            "Track order",
          ],
        ].map(([h, ...links]) => (
          <div key={h}>
            <h3>{h}</h3>
            {links.map((x) => (
              <a key={x} href="#top">
                {x}
              </a>
            ))}
          </div>
        ))}
        <div>
          <h3>Portals</h3>
          <a href="/account">Customer account</a>
          <a href="/admin">Store admin</a>
          <a href="#top">Support</a>
        </div>
      </footer>
      {cartOpen && (
        <>
          <button
            className="drawer-backdrop"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
          />
          <aside className="cart-drawer">
            <div className="drawer-head">
              <div>
                <p>Your bag</p>
                <span>
                  {count} {count === 1 ? "item" : "items"}
                </span>
              </div>
              <button onClick={() => setCartOpen(false)}>
                <X />
              </button>
            </div>
            <div className="cart-items">
              {!count ? (
                <div className="empty">
                  <ShoppingBag />
                  <h3>Your bag is empty</h3>
                  <p>Beautiful things are waiting.</p>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="btn dark"
                  >
                    Continue shopping
                  </button>
                </div>
              ) : (
                cart.lines.map(({product:p,entry,index,variant,unitPrice,available,unresolved}) => (
                    <div className="cart-line" key={`${p.id}-${index}`}>
                      <div
                        className="cart-thumb"
                        style={{ background: p.tone }}
                      >
                        {variant?.image || p.image ? (
                          <img
                            src={variant?.image || p.image}
                            alt={variant?.imageAlt || p.imageAlt || p.name}
                          />
                        ) : (
                          p.glyph
                        )}
                      </div>
                      <div>
                        <h4>{p.name}</h4>
                        <p>
                          {variant?.title ||
                            (variant && Object.values(variant.options).join(" / ")) ||
                            p.category}
                        </p>
                        {unresolved && (
                          <small role="alert">
                            This saved item is no longer available.{" "}
                            <button onClick={() => cart.update(index, 0)}>
                              Remove
                            </button>
                          </small>
                        )}
                        <div className="qty">
                          <button onClick={() => cart.update(index, entry.quantity - 1)}>
                            <Minus />
                          </button>
                          <span>{entry.quantity}</span>
                          <button
                            onClick={() => cart.update(index, entry.quantity + 1)}
                            disabled={unresolved || entry.quantity >= available}
                            aria-label={`Increase ${p.name} quantity`}
                          >
                            <Plus />
                          </button>
                        </div>
                      </div>
                      <strong>{money(unitPrice * entry.quantity)}</strong>
                    </div>
                  ))
              )}
            </div>
            {!!count && (
              <div className="cart-total">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                <p>Shipping and taxes calculated at checkout.</p>
                <a className="btn dark" href="/checkout">
                  Secure checkout <ShieldCheck />
                </a>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
