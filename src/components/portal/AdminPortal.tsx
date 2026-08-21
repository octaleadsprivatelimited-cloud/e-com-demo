import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Box,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  Code2,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { PortalShell } from "./PortalShell";
import {
  money,
  productTypeTemplates,
  type ProductType,
  type VariantOption,
} from "@/data/commerce";
import { commerceApi } from "@/lib/commerce-api";
import { toast, Toaster } from "sonner";
import { useLocation } from "@tanstack/react-router";

const nav: [string, React.ReactNode][] = [
  ["Overview", <LayoutDashboard />],
  ["Products", <Package />],
  ["Orders", <ShoppingCart />],
  ["Customers", <Users />],
  ["Inventory", <Box />],
  ["Payments", <CreditCard />],
  ["Shipping", <Truck />],
  ["Marketing", <Zap />],
  ["Analytics", <BarChart3 />],
  ["Integrations", <Code2 />],
  ["Settings", <Settings />],
];
const providers = [
  {
    name: "Razorpay",
    type: "Payment",
    icon: <CreditCard />,
    status: "Connected",
    meta: "Live · INR",
    color: "#4865d5",
  },
  {
    name: "Shiprocket",
    type: "Shipping",
    icon: <Truck />,
    status: "Connected",
    meta: "Live · Priority 1",
    color: "#7153c5",
  },
  {
    name: "Delhivery",
    type: "Shipping",
    icon: <Package />,
    status: "Needs setup",
    meta: "Test mode",
    color: "#e9514e",
  },
  {
    name: "Resend",
    type: "Email",
    icon: <Mail />,
    status: "Connected",
    meta: "Transactional",
    color: "#191919",
  },
  {
    name: "WhatsApp Cloud",
    type: "Messaging",
    icon: <MessageSquare />,
    status: "Needs setup",
    meta: "Not configured",
    color: "#31a45d",
  },
  {
    name: "Google Analytics",
    type: "Analytics",
    icon: <Activity />,
    status: "Connected",
    meta: "GA4 active",
    color: "#e9a828",
  },
];
function Dashboard() {
  return (
    <>
      <div className="metric-grid">
        {[
          ["Revenue", money(1284500), "12.8%", true, <CircleDollarSign />],
          ["Orders", "1,284", "8.4%", true, <ShoppingCart />],
          ["Customers", "8,492", "6.2%", true, <Users />],
          ["Low stock", "18 items", "4 critical", false, <AlertTriangle />],
        ].map(([l, v, d, up, icon]) => (
          <article className="metric" key={String(l)}>
            <div>
              <span>{icon}</span>
              <small>Last 30 days</small>
            </div>
            <p>{l}</p>
            <h3>{v}</h3>
            <em className={up ? "up" : "down"}>
              {up ? <ArrowUpRight /> : <ArrowDownRight />}
              {d}
            </em>
          </article>
        ))}
      </div>
      <div className="admin-grid">
        <section className="panel sales-panel">
          <div className="panel-head">
            <div>
              <h2>Revenue overview</h2>
              <p>Gross sales across all channels</p>
            </div>
            <select>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="sales-total">
            <span>
              <b>{money(1284500)}</b>
              <small>Total revenue</small>
            </span>
            <span>
              <b>1,284</b>
              <small>Orders</small>
            </span>
            <span>
              <b>{money(10004)}</b>
              <small>Avg. order</small>
            </span>
          </div>
          <div className="fake-chart">
            <div />
            <svg viewBox="0 0 800 170" preserveAspectRatio="none">
              <path d="M0 142 C70 120 90 145 150 105 S240 90 300 112 S390 55 450 76 S540 34 600 58 S710 15 800 32" />
              <path
                className="area"
                d="M0 142 C70 120 90 145 150 105 S240 90 300 112 S390 55 450 76 S540 34 600 58 S710 15 800 32 L800 170 L0 170Z"
              />
            </svg>
            <div className="chart-labels">
              <span>Jul 22</span>
              <span>Jul 29</span>
              <span>Aug 05</span>
              <span>Aug 12</span>
              <span>Aug 20</span>
            </div>
          </div>
        </section>
        <section className="panel actions">
          <div className="panel-head">
            <div>
              <h2>Quick actions</h2>
              <p>Common store tasks</p>
            </div>
          </div>
          {[
            [<Plus />, "Add a product", "Create with variants"],
            [<FileText />, "Review orders", "12 need attention"],
            [<RefreshCw />, "Sync inventory", "Last synced 8m ago"],
            [<ExternalLink />, "View storefront", "Open customer site"],
          ].map(([i, t, s]) => (
            <button key={String(t)}>
              {i}
              <span>
                <b>{t}</b>
                <small>{s}</small>
              </span>
              <ChevronRight />
            </button>
          ))}
        </section>
      </div>
      <Orders />
    </>
  );
}
function Orders() {
  const rows = [
    [
      "#AR-10842",
      "Ananya Sharma",
      "Arc Linen Chair",
      money(18490),
      "Paid",
      "Processing",
    ],
    [
      "#AR-10841",
      "Rohan Mehta",
      "Merino Overshirt · XL",
      money(8490),
      "Paid",
      "Packed",
    ],
    [
      "#AR-10840",
      "Aarav Singh",
      "Organic Toor Dal · 2 kg",
      money(790),
      "COD",
      "Confirmed",
    ],
    [
      "#AR-10839",
      "Mira Nair",
      "Everyday Sneaker · UK 7",
      money(5490),
      "Paid",
      "Shipped",
    ],
  ];
  return (
    <section className="panel orders">
      <div className="panel-head">
        <div>
          <h2>Recent orders</h2>
          <p>Latest activity across your store</p>
        </div>
        <button>
          View all <ChevronRight />
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Product / variant</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Fulfilment</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                {r.map((x, i) => (
                  <td key={x} className={i > 3 ? "status-cell" : ""}>
                    {i === 4 || i === 5 ? (
                      <span className={`status ${String(x).toLowerCase()}`}>
                        {x}
                      </span>
                    ) : (
                      x
                    )}
                  </td>
                ))}
                <td>
                  <MoreHorizontal />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function VariantEditor() {
  const [type, setType] = useState<ProductType>("apparel"),
    [name, setName] = useState("Linen Wrap Dress"),
    [options, setOptions] = useState<VariantOption[]>(
      productTypeTemplates.apparel.options,
    );
  const [basePrice, setBasePrice] = useState(6290),
    [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("A versatile everyday piece made from breathable European linen."),
    [mediaUrls, setMediaUrls] = useState(""),
    [specifications, setSpecifications] = useState("Material: European linen\nCare: Gentle wash"),
    [seoTitle, setSeoTitle] = useState(""),
    [seoDescription, setSeoDescription] = useState("");
  const combinations = useMemo(
    () =>
      options
        .reduce<Record<string, string>[]>(
          (rows, opt) =>
            rows.flatMap((r) =>
              opt.values.slice(0, 8).map((v) => ({ ...r, [opt.name]: v })),
            ),
          [{}],
        )
        .slice(0, 40),
    [options],
  );
  const choose = (t: ProductType) => {
    setType(t);
    setOptions(
      productTypeTemplates[t].options.map((o) => ({
        ...o,
        values: [...o.values],
      })),
    );
  };
  const updateValues = (i: number, value: string) =>
    setOptions((o) =>
      o.map((x, n) =>
        n === i
          ? {
              ...x,
              values: value
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
            }
          : x,
      ),
    );
  const saveProduct = async () => {
    setSaving(true);
    try {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const category =
        type === "grocery"
          ? "Grocery"
          : type === "footwear"
            ? "Footwear"
            : type === "apparel"
              ? "Wardrobe"
              : "Home";
      await commerceApi("/api/v1/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug,
          description,
          category,
          brand: "Aster Studio",
          status: "ACTIVE",
          taxRate: type === "grocery" ? 5 : 12,
          specifications: Object.fromEntries(specifications.split("\n").map(line => line.split(":"))
            .map(([key, ...value]) => [key?.trim(), value.join(":").trim()]).filter(([key, value]) => key && value)),
          seoTitle: seoTitle || undefined,
          seoDescription: seoDescription || undefined,
          media: mediaUrls.split("\n").map(url => url.trim()).filter(Boolean).map((url, position) => ({
            url,
            alt: `${name} product image ${position + 1}`,
            type: "IMAGE",
            position,
          })),
          variants: combinations.map((attributes, index) => ({
            sku: `AR-${type.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}-${String(index + 1).padStart(3, "0")}`,
            title: Object.values(attributes).join(" / ") || "Default",
            price: basePrice,
            mrp: Math.round(basePrice * 1.15),
            stock: index % 5 === 0 ? 4 : 24 + index,
            reserved: 0,
            attributes,
            weightGrams: type === "grocery" ? 1000 : 600,
          })),
        }),
      });
      toast.success("Product and all variants were saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Product could not be saved",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="product-editor">
      <div className="editor-top">
        <div>
          <p className="portal-eyebrow">Products / New product</p>
          <h2>Create product</h2>
          <span>
            Choose a selling model, then configure every sellable variant.
          </span>
        </div>
        <div>
          <button className="secondary">
            <Eye /> Preview
          </button>
          <button className="primary" onClick={saveProduct} disabled={saving}>
            <Save /> {saving ? "Saving…" : "Save product"}
          </button>
        </div>
      </div>
      <div className="editor-layout">
        <div>
          <section className="panel form-panel">
            <div className="panel-head">
              <div>
                <h2>Product information</h2>
                <p>Core catalog details</p>
              </div>
            </div>
            <label>
              Product name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="form-row">
              <label>
                Category
                <select>
                  <option>Women / Dresses</option>
                  <option>Footwear</option>
                  <option>Grocery / Pulses</option>
                  <option>Home</option>
                </select>
              </label>
              <label>
                Brand
                <select>
                  <option>Aster Studio</option>
                  <option>Independent maker</option>
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </section>
          <section className="panel form-panel">
            <div className="panel-head"><div><h2>Media & product details</h2><p>One secure hosted image URL or specification per line</p></div></div>
            <label>Image URLs<textarea value={mediaUrls} onChange={(event) => setMediaUrls(event.target.value)} placeholder="https://cdn.example.com/product-front.webp" /></label>
            <label>Specifications<textarea value={specifications} onChange={(event) => setSpecifications(event.target.value)} placeholder="Material: Linen&#10;Country of origin: India" /></label>
          </section>
          <section className="panel form-panel">
            <div className="panel-head"><div><h2>Search appearance</h2><p>Optional page title and description for search engines</p></div></div>
            <label>SEO title<input maxLength={70} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} placeholder={name} /></label>
            <label>SEO description<textarea maxLength={170} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} /></label>
          </section>
          <section className="panel form-panel">
            <div className="panel-head">
              <div>
                <h2>Product type</h2>
                <p>Select how this item is measured or sized</p>
              </div>
            </div>
            <div className="type-grid">
              {(Object.keys(productTypeTemplates) as ProductType[]).map((t) => (
                <button
                  onClick={() => choose(t)}
                  className={type === t ? "active" : ""}
                  key={t}
                >
                  <span>
                    {t === "apparel"
                      ? "L XL"
                      : t === "footwear"
                        ? "7 8"
                        : t === "grocery"
                          ? "1kg"
                          : t === "pack"
                            ? "× 6"
                            : t === "custom"
                              ? "＋"
                              : "1"}
                  </span>
                  <b>{productTypeTemplates[t].label}</b>
                  <small>{productTypeTemplates[t].description}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="panel form-panel">
            <div className="panel-head">
              <div>
                <h2>Options & variants</h2>
                <p>
                  Comma-separate choices. A SKU is generated for every
                  combination.
                </p>
              </div>
              <button
                className="small-add"
                onClick={() =>
                  setOptions((o) => [
                    ...o,
                    { name: `Option ${o.length + 1}`, values: ["Value 1"] },
                  ])
                }
              >
                <Plus /> Option
              </button>
            </div>
            {options.length === 0 ? (
              <div className="no-options">
                This product uses one standard SKU.
              </div>
            ) : (
              options.map((o, i) => (
                <div className="option-row" key={i}>
                  <input
                    aria-label={`Option ${i + 1} name`}
                    value={o.name}
                    onChange={(e) =>
                      setOptions((x) =>
                        x.map((q, n) =>
                          n === i ? { ...q, name: e.target.value } : q,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`${o.name || `Option ${i + 1}`} values`}
                    value={o.values.join(", ")}
                    onChange={(e) => updateValues(i, e.target.value)}
                  />
                  <button
                    aria-label={`Remove ${o.name || `option ${i + 1}`}`}
                    onClick={() =>
                      setOptions((x) => x.filter((_, n) => n !== i))
                    }
                  >
                    <X />
                  </button>
                </div>
              ))
            )}
            <div className="variant-table">
              <div className="variant-header">
                <span>{combinations.length} generated variants</span>
                <span>Price</span>
                <span>Inventory</span>
              </div>
              {combinations.map((c, i) => (
                <div className="variant-row" key={i}>
                  <div>
                    <b>{Object.values(c).join(" / ") || "Default"}</b>
                    <small>{`AR-${type.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`}</small>
                  </div>
                  <label>
                    ₹ <input defaultValue={basePrice} />
                  </label>
                  <input aria-label={`${Object.values(c).join(" / ") || "Default"} inventory`} defaultValue={i % 5 === 0 ? 4 : 24 + i} />
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside>
          <section className="panel form-panel sticky">
            <h3>Publishing</h3>
            <label>
              Status
              <select>
                <option>Draft</option>
                <option>Active</option>
                <option>Archived</option>
              </select>
            </label>
            <label>
              Base price
              <div className="money-input">
                ₹
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                />
              </div>
            </label>
            <label>
              Tax class
              <select>
                <option>GST 12% — Apparel</option>
                <option>GST 5% — Essential food</option>
                <option>GST 18% — General</option>
              </select>
            </label>
            <label>
              HSN / SAC
              <input placeholder="e.g. 6204" />
            </label>
            <hr />
            <label className="check">
              <input type="checkbox" defaultChecked /> Track inventory per
              variant
            </label>
            <label className="check">
              <input type="checkbox" /> Allow backorders
            </label>
            <hr />
            <div className="summary">
              <span>
                Type <b>{productTypeTemplates[type].label}</b>
              </span>
              <span>
                Options <b>{options.length}</b>
              </span>
              <span>
                Variants <b>{combinations.length}</b>
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Integrations() {
  const [filter, setFilter] = useState("All integrations");
  const [selected, setSelected] = useState<(typeof providers)[number] | null>(null);
  const [enabled, setEnabled] = useState(false), [environment, setEnvironment] = useState("TEST"), [priority, setPriority] = useState(1), [credentials, setCredentials] = useState<Record<string, string>>({}), [publicConfig, setPublicConfig] = useState<Record<string, string>>({}), [saving, setSaving] = useState(false);
  const visible = providers.filter((provider) => filter === "All integrations" || (filter === "Payments" && provider.type === "Payment") || (filter === "Shipping" && provider.type === "Shipping") || (filter === "Communication" && ["Email", "Messaging"].includes(provider.type)) || filter === provider.type);
  const open = (provider: (typeof providers)[number]) => { setSelected(provider); setEnabled(provider.status === "Connected"); setCredentials({}); setPublicConfig(provider.name === "Shiprocket" ? { pickupPostcode: "500001", pickupLocation: "Primary" } : {}); };
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const kind = selected.type === "Payment" ? "PAYMENT" : selected.type === "Shipping" ? "SHIPPING" : selected.type === "Email" ? "EMAIL" : selected.type === "Messaging" ? "WHATSAPP" : "ANALYTICS";
      await commerceApi("/api/v1/admin/integrations", { method: "PUT", body: JSON.stringify({ kind, provider: selected.name.toLowerCase().replace(/\s+/g, "-"), enabled, priority, environment, credentials, publicConfig }) });
      toast.success(`${selected.name} configuration saved securely`);
      setSelected(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Integration could not be saved"); }
    finally { setSaving(false); }
  };
  return (
    <div className="integrations">
      <div className="editor-top">
        <div>
          <p className="portal-eyebrow">Settings</p>
          <h2>Integrations</h2>
          <span>
            Configure payments, shipping, communication and analytics.
          </span>
        </div>
        <button className="primary" onClick={() => toast.info("Choose a provider to configure its credentials")}><Save /> Save changes</button>
      </div>
      <div className="integration-tabs">
        {["All integrations", "Payments", "Shipping", "Communication", "Analytics", "Storage"].map(tab => <button key={tab} className={filter === tab ? "active" : ""} onClick={() => setFilter(tab)}>{tab}</button>)}
      </div>
      <div className="integration-grid">
        {visible.map((p) => (
          <article className="panel provider" key={p.name}>
            <div className="provider-icon" style={{ background: p.color }}>
              {p.icon}
            </div>
            <div>
              <span>{p.type}</span>
              <h3>{p.name}</h3>
              <p>{p.meta}</p>
            </div>
            <span
              className={`connection ${p.status === "Connected" ? "on" : "off"}`}
            >
              {p.status}
            </span>
            <button
              onClick={() => open(p)}
            >
              {p.status === "Connected" ? "Configure" : "Connect"}
              <ChevronRight />
            </button>
          </article>
        ))}
      </div>
      <section className="panel api-security">
        <ShieldCheck />
        <div>
          <h3>Credentials are protected</h3>
          <p>
            Secrets are encrypted at rest and never returned to browsers. Saved
            keys appear masked, for example ••••••••••••ABCD.
          </p>
        </div>
        <button>Review security</button>
      </section>
      <section className="panel custom-provider">
        <div>
          <Code2 />
          <div>
            <h3>Custom API provider</h3>
            <p>
              Connect a provider using API key, Bearer token, Basic Auth or
              OAuth 2.0. Custom executable code is never accepted.
            </p>
          </div>
        </div>
        <button>
          <Plus /> Add custom provider
        </button>
      </section>
      {selected && <><button className="filter-backdrop" aria-label="Close integration configuration" onClick={() => setSelected(null)} /><section className="panel integration-config" role="dialog" aria-modal="true" aria-labelledby="integration-title">
        <div className="panel-head"><div><p className="portal-eyebrow">Secure provider setup</p><h2 id="integration-title">{selected.name}</h2></div><button aria-label="Close" onClick={() => setSelected(null)}><X /></button></div>
        <div className="form-panel">
          <div className="form-row"><label>Environment<select value={environment} onChange={event => setEnvironment(event.target.value)}><option>TEST</option><option>LIVE</option></select></label><label>Priority<input type="number" min="1" max="1000" value={priority} onChange={event => setPriority(Number(event.target.value))} /></label></div>
          <label className="check"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Enable provider</label>
          {(selected.name === "Razorpay" ? [["keyId", "Key ID"], ["keySecret", "Key secret"], ["webhookSecret", "Webhook secret"]] : selected.name === "Shiprocket" ? [["token", "API token"]] : [["apiKey", "API key"], ["apiSecret", "API secret"]]).map(([key, label]) => <label key={key}>{label}<input type="password" autoComplete="new-password" value={credentials[key] || ""} onChange={event => setCredentials(value => ({ ...value, [key]: event.target.value }))} placeholder="Stored encrypted and shown masked later" /></label>)}
          {selected.name === "Shiprocket" && <div className="form-row"><label>Pickup PIN<input value={publicConfig.pickupPostcode || ""} onChange={event => setPublicConfig(value => ({ ...value, pickupPostcode: event.target.value }))} /></label><label>Pickup location<input value={publicConfig.pickupLocation || ""} onChange={event => setPublicConfig(value => ({ ...value, pickupLocation: event.target.value }))} /></label></div>}
          <button className="primary" onClick={save} disabled={saving}><ShieldCheck /> {saving ? "Encrypting and saving…" : "Save secure configuration"}</button>
        </div>
      </section></>}
    </div>
  );
}

export function AdminPortal() {
  const [active, setActive] = useState("Overview");
  const location = useLocation();
  useEffect(() => {
    setActive(
      new URLSearchParams(location.searchStr).get("tab") || "Overview",
    );
  }, [location.searchStr]);
  return (
    <>
      <Toaster position="bottom-right" richColors />
      <PortalShell
        title={active === "Overview" ? "Good morning, Maya" : active}
        subtitle={
          active === "Overview"
            ? "Here’s what’s happening with your store today."
            : active === "Products"
              ? "Manage catalog, product types, pricing and variants."
              : active === "Integrations"
                ? "Connect and secure every external service."
                : "Manage your commerce operations."
        }
        nav={nav}
        active={active}
        onNavigate={setActive}
      >
        {active === "Products" ? (
          <VariantEditor />
        ) : active === "Integrations" ? (
          <Integrations />
        ) : active === "Overview" ? (
          <Dashboard />
        ) : (
          <ModuleView module={active} />
        )}
      </PortalShell>
    </>
  );
}

function ModuleView({ module }: { module: string }) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]), [loading, setLoading] = useState(false), [loadError, setLoadError] = useState("");
  const endpoint: Record<string, string> = { Orders: "/api/v1/admin/orders", Customers: "/api/v1/admin/customers", Inventory: "/api/v1/admin/inventory" };
  const load = async () => {
    if (!endpoint[module]) return;
    if (!sessionStorage.getItem("commerce_access_token")) { setLoadError("Authentication required"); setRecords([]); return; }
    setLoading(true); setLoadError("");
    try { setRecords(await commerceApi<Record<string, unknown>[]>(endpoint[module])); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Records could not be loaded"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [module]);
  const details: Record<string, [string, string, string][]> = {
    Orders: [
      ["Open orders", "42", "12 need action"],
      ["Shipped today", "18", "Across 3 couriers"],
      ["Returns", "6", "2 awaiting approval"],
    ],
    Customers: [
      ["Total customers", "8,492", "+6.2% this month"],
      ["New customers", "318", "Last 30 days"],
      ["Repeat rate", "34.8%", "+2.1 points"],
    ],
    Inventory: [
      ["Active SKUs", "1,248", "Across 186 products"],
      ["Low stock", "18", "4 critical"],
      ["Reserved units", "96", "In open orders"],
    ],
    Payments: [
      ["Captured", money(1284500), "1,206 payments"],
      ["Pending", money(62400), "18 payments"],
      ["Refunds", money(18400), "7 processed"],
    ],
    Shipping: [
      ["Shipments", "286", "This week"],
      ["In transit", "74", "Across 4 couriers"],
      ["On-time rate", "96.4%", "Last 30 days"],
    ],
    Marketing: [
      ["Active coupons", "12", "4 expiring soon"],
      ["Campaign revenue", money(248000), "Last 30 days"],
      ["Subscribers", "14,280", "Email + WhatsApp"],
    ],
    Analytics: [
      ["Conversion", "3.84%", "+0.42 points"],
      ["Average order", money(10004), "+4.1%"],
      ["Returning visitors", "38.2%", "Last 30 days"],
    ],
    Settings: [
      ["Store status", "Live", "India · INR"],
      ["Tax profile", "GST enabled", "3 tax classes"],
      ["Security", "Protected", "2FA required"],
    ],
  };
  const cards = details[module] || [];
  return (
    <div>
      <div className="editor-top">
        <div>
          <p className="portal-eyebrow">Commerce operations</p>
          <h2>{module}</h2>
          <span>
            Manage and monitor {module.toLowerCase()} from this workspace.
          </span>
        </div>
        <button
          className="primary"
          onClick={() => toast.success(`${module} changes saved`)}
        >
          <Save /> Save changes
        </button>
      </div>
      <div className="metric-grid">
        {cards.map(([label, value, note]) => (
          <article className="metric" key={label}>
            <div>
              <span>
                <Activity />
              </span>
              <small>Live</small>
            </div>
            <p>{label}</p>
            <h3>{value}</h3>
            <em className="up">{note}</em>
          </article>
        ))}
      </div>
      <section className="panel orders">
        <div className="panel-head">
          <div>
            <h2>{module} workspace</h2>
            <p>Search, filter, review and update records</p>
          </div>
          <button>
            <Plus /> Create new
          </button>
        </div>
        {loading ? <div className="module-empty"><RefreshCw /><h3>Loading live records…</h3></div> : loadError ? <div className="module-empty"><AlertTriangle /><h3>Sign in with an authorized staff account</h3><p>{loadError}</p><a className="primary" href="/login">Sign in</a></div> : records.length ? <div className="table-wrap"><table><thead><tr>{Object.keys(records[0]).slice(0, 7).map(key => <th key={key}>{key.replace(/([A-Z])/g, " $1")}</th>)}</tr></thead><tbody>{records.map((record, index) => <tr key={String(record.id || record.variantId || index)}>{Object.entries(record).slice(0, 7).map(([key, value]) => <td key={key}>{typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}</td>)}</tr>)}</tbody></table></div> : <div className="module-empty"><Search /><h3>{endpoint[module] ? `No ${module.toLowerCase()} found` : `${module} tools are ready`}</h3><p>{endpoint[module] ? "New records will appear here automatically." : "Use this workspace to configure and monitor the module."}</p></div>}
      </section>
    </div>
  );
}
