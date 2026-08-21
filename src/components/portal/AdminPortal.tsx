import { startTransition, useEffect, useMemo, useState } from "react";
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
import { defaultStorefrontConfig, type StorefrontConfig } from "@/lib/storefront-config";
import { emptyPromotions, type PromotionConfig } from "@/lib/promotions";

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
  const [imageFiles,setImageFiles]=useState<File[]>([]),[uploadProgress,setUploadProgress]=useState("");
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
      const created=await commerceApi<{id:string}>("/api/v1/admin/products", {
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
      for(let index=0;index<imageFiles.length;index++){setUploadProgress(`Converting image ${index+1} of ${imageFiles.length}…`);const body=new FormData();body.append("image",imageFiles[index]!);body.append("alt",`${name} product image ${index+1}`);body.append("position",String(index));await commerceApi(`/api/v1/admin/products/${created.id}/media/upload`,{method:"POST",body})}
      setUploadProgress("");setImageFiles([]);
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
            <label className="image-upload-zone">Upload product images<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" multiple onChange={event=>setImageFiles(Array.from(event.target.files||[]).slice(0,8))}/><span>{imageFiles.length ? `${imageFiles.length} image${imageFiles.length===1?"":"s"} ready — converted to WebP on save` : "JPEG, PNG, WebP, AVIF or HEIC · maximum 10 MB each"}</span></label>
            {uploadProgress&&<p className="upload-progress"><RefreshCw/>{uploadProgress}</p>}
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

function WhiteLabelSettings(){const [form,setForm]=useState<StorefrontConfig|null>(null),[saving,setSaving]=useState(false);useEffect(()=>{commerceApi<StorefrontConfig>("/api/v1/admin/storefront-config").then(setForm).catch(()=>undefined)},[]);const saveInvoice=async()=>{if(!form)return;setSaving(true);try{setForm(await commerceApi<StorefrontConfig>("/api/v1/admin/storefront-config",{method:"PUT",body:JSON.stringify(form)}));toast.success("Invoice identity saved")}catch(reason){toast.error(reason instanceof Error?reason.message:"Invoice settings could not be saved")}finally{setSaving(false)}};return <><WhiteLabelSettingsForm/>{form&&<section className="panel form-panel invoice-identity"><div className="panel-head"><div><h2>Invoice identity</h2><p>Shown on customer tax invoice downloads when provided</p></div></div><div className="form-row"><label>Business GSTIN<input value={form.businessGstin} onChange={event=>setForm({...form,businessGstin:event.target.value.toUpperCase()})} maxLength={15} placeholder="36AAAAA0000A1Z5"/></label><label>Registered business address<textarea value={form.businessAddress} onChange={event=>setForm({...form,businessAddress:event.target.value})}/></label></div><button className="primary" onClick={saveInvoice} disabled={saving}><Save/>{saving?"Saving…":"Save invoice identity"}</button></section>}</>}

function WhiteLabelSettingsForm() {
  const [form,setForm]=useState<StorefrontConfig>(defaultStorefrontConfig),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");
  useEffect(()=>{if(!sessionStorage.getItem("commerce_access_token")){setError("Sign in with an administrator account to configure this store.");setLoading(false);return}commerceApi<StorefrontConfig>("/api/v1/admin/storefront-config").then(setForm).catch(reason=>setError(reason instanceof Error?reason.message:"Settings could not be loaded")).finally(()=>setLoading(false))},[]);
  const field=(key:keyof StorefrontConfig,value:string)=>setForm(current=>({...current,[key]:value}));
  const save=async()=>{setSaving(true);setError("");try{const saved=await commerceApi<StorefrontConfig>("/api/v1/admin/storefront-config",{method:"PUT",body:JSON.stringify(form)});setForm(saved);toast.success("White-label storefront updated")}catch(reason){const message=reason instanceof Error?reason.message:"Settings could not be saved";setError(message);toast.error(message)}finally{setSaving(false)}};
  if(loading)return <div className="module-empty"><RefreshCw/><h3>Loading store configuration…</h3></div>;
  if(error&&!sessionStorage.getItem("commerce_access_token"))return <div className="module-empty"><ShieldCheck/><h3>Administrator sign-in required</h3><p>{error}</p><a className="primary" href="/login">Sign in</a></div>;
  return <div><div className="editor-top"><div><p className="portal-eyebrow">White-label control centre</p><h2>Store identity & branding</h2><span>Configure the reusable storefront for this customer and domain.</span></div><button className="primary" onClick={save} disabled={saving}><Save/>{saving?"Saving…":"Publish settings"}</button></div>{error&&<p className="settings-error"><AlertTriangle/> {error}</p>}<div className="editor-layout"><div><section className="panel form-panel"><div className="panel-head"><div><h2>Brand identity</h2><p>Customer-facing store and legal details</p></div></div><div className="form-row"><label>Store name<input value={form.storeName} onChange={e=>field("storeName",e.target.value)}/></label><label>Legal business name<input value={form.legalName} onChange={e=>field("legalName",e.target.value)}/></label></div><div className="form-row"><label>Logo URL<input type="url" value={form.logoUrl} onChange={e=>field("logoUrl",e.target.value)} placeholder="https://…"/></label><label>Favicon URL<input type="url" value={form.faviconUrl} onChange={e=>field("faviconUrl",e.target.value)} placeholder="https://…"/></label></div></section><section className="panel form-panel"><div className="panel-head"><div><h2>Contact & messaging</h2><p>Support channels and reusable storefront copy</p></div></div><div className="form-row"><label>Support email<input type="email" value={form.supportEmail} onChange={e=>field("supportEmail",e.target.value)}/></label><label>Support phone<input value={form.supportPhone} onChange={e=>field("supportPhone",e.target.value)}/></label></div><label>Announcement<input value={form.announcement} onChange={e=>field("announcement",e.target.value)}/></label><label>Footer tagline<textarea value={form.footerTagline} onChange={e=>field("footerTagline",e.target.value)}/></label></section><section className="panel form-panel"><div className="panel-head"><div><h2>Search & domain</h2><p>SEO defaults and customer hostname mapping</p></div></div><label>Primary domain<input value={form.primaryDomain} onChange={e=>field("primaryDomain",e.target.value)} placeholder="shop.customer.com"/></label><label>SEO title<input value={form.seoTitle} onChange={e=>field("seoTitle",e.target.value)}/></label><label>SEO description<textarea value={form.seoDescription} onChange={e=>field("seoDescription",e.target.value)}/></label></section></div><aside><section className="panel form-panel sticky"><div className="panel-head"><div><h2>Theme & region</h2><p>Live preview</p></div></div><div className="settings-preview" style={{background:form.backgroundColor,color:form.primaryColor,borderColor:form.accentColor}}><i style={{background:form.accentColor}}>{form.storeName.split(/\s+/).map(x=>x[0]).join("").slice(0,2)}</i><strong>{form.storeName}</strong><small>{form.footerTagline}</small></div>{([['primaryColor','Primary colour'],['accentColor','Accent colour'],['backgroundColor','Background']] as [keyof StorefrontConfig,string][]).map(([key,label])=><label key={key}>{label}<span className="color-field"><input type="color" value={form[key]} onChange={e=>field(key,e.target.value)}/><input value={form[key]} onChange={e=>field(key,e.target.value)}/></span></label>)}<div className="form-row"><label>Currency<select value={form.currency} onChange={e=>field("currency",e.target.value)}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option></select></label><label>Locale<select value={form.locale} onChange={e=>field("locale",e.target.value)}><option>en-IN</option><option>en-US</option><option>en-GB</option><option>ar-AE</option></select></label></div></section></aside></div></div>;
}

function PromotionStudio(){const [config,setConfig]=useState<PromotionConfig>(emptyPromotions),[coupons,setCoupons]=useState<Record<string,unknown>[]>([]),[saving,setSaving]=useState(false),[error,setError]=useState("");useEffect(()=>{if(!sessionStorage.getItem("commerce_access_token")){setError("Administrator sign-in is required.");return}Promise.all([commerceApi<PromotionConfig>("/api/v1/admin/promotions"),commerceApi<Record<string,unknown>[]>("/api/v1/admin/coupons")]).then(([campaigns,offers])=>{setConfig(campaigns);setCoupons(offers)}).catch(reason=>setError(reason instanceof Error?reason.message:"Promotions could not be loaded"))},[]);const save=async()=>{setSaving(true);try{setConfig(await commerceApi<PromotionConfig>("/api/v1/admin/promotions",{method:"PUT",body:JSON.stringify(config)}));toast.success("Campaigns published")}catch(reason){toast.error(reason instanceof Error?reason.message:"Campaigns could not be saved")}finally{setSaving(false)}};const addBanner=()=>setConfig(current=>({...current,banners:[...current.banners,{id:crypto.randomUUID(),name:"New banner",enabled:true,startsAt:"",endsAt:"",audience:"ALL",eyebrow:"Featured",headline:"A new offer for your customers",body:"Describe the collection or offer here.",buttonLabel:"Shop now",buttonUrl:"/shop",imageUrl:"",placement:"HOME_HERO",backgroundColor:"#ded1bf"}]}));const addPopup=()=>setConfig(current=>({...current,popups:[...current.popups,{id:crypto.randomUUID(),name:"New popup",enabled:true,startsAt:"",endsAt:"",audience:"ALL",headline:"Welcome offer",body:"Save on your first order.",couponCode:"WELCOME10",buttonLabel:"Shop now",buttonUrl:"/shop",delaySeconds:4,frequency:"ONCE"}]}));const banner=(id:string,patch:Record<string,unknown>)=>setConfig(current=>({...current,banners:current.banners.map(item=>item.id===id?{...item,...patch}:item)}));const popup=(id:string,patch:Record<string,unknown>)=>setConfig(current=>({...current,popups:current.popups.map(item=>item.id===id?{...item,...patch}:item)}));const createCoupon=async()=>{const code=`OFFER${Math.floor(10+Math.random()*80)}`;try{const saved=await commerceApi<Record<string,unknown>>("/api/v1/admin/coupons",{method:"PUT",body:JSON.stringify({code,type:"PERCENTAGE",value:10,minimumSpend:1000,maximumDiscount:1500,startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+30*86400000).toISOString(),enabled:true,usageLimit:1000})});setCoupons(items=>[saved,...items.filter(item=>item.code!==saved.code)]);toast.success(`Coupon ${code} created`)}catch(reason){toast.error(reason instanceof Error?reason.message:"Coupon could not be created")}};if(error&&!sessionStorage.getItem("commerce_access_token"))return <div className="module-empty"><ShieldCheck/><h3>Administrator sign-in required</h3><p>{error}</p><a className="primary" href="/login">Sign in</a></div>;return <div><div className="editor-top"><div><p className="portal-eyebrow">Promotion studio</p><h2>Offers, coupons & campaigns</h2><span>Create banners and popup offers with buttons, targeting and frequency rules.</span></div><div><button className="secondary" onClick={addPopup}><Plus/> Popup</button><button className="secondary" onClick={addBanner}><Plus/> Banner</button><button className="primary" onClick={save} disabled={saving}><Save/>{saving?"Publishing…":"Publish all"}</button></div></div>{error&&<p className="settings-error"><AlertTriangle/>{error}</p>}<section className="panel"><div className="panel-head"><div><h2>Coupon offers</h2><p>Discounts validated securely during checkout</p></div><button onClick={createCoupon}><Plus/> Quick coupon</button></div><div className="campaign-list">{coupons.map(item=><article key={String(item.code)}><div><Zap/><span><b>{String(item.code)}</b><small>{String(item.type).replaceAll("_"," ")} · {String(item.value)}</small></span></div><em>{item.enabled?"Active":"Paused"}</em></article>)}</div></section><section className="panel campaign-editor"><div className="panel-head"><div><h2>Clickable banners</h2><p>Hero and in-page promotions</p></div></div>{config.banners.map(item=><div className="campaign-form" key={item.id}><div className="campaign-form-head"><label><input type="checkbox" checked={item.enabled} onChange={e=>banner(item.id,{enabled:e.target.checked})}/> Active</label><button onClick={()=>setConfig(c=>({...c,banners:c.banners.filter(x=>x.id!==item.id)}))}><X/></button></div><div className="form-row"><label>Campaign name<input value={item.name} onChange={e=>banner(item.id,{name:e.target.value})}/></label><label>Placement<select value={item.placement} onChange={e=>banner(item.id,{placement:e.target.value})}><option>HOME_HERO</option><option>HOME_INLINE</option><option>SHOP_TOP</option></select></label></div><label>Headline<input value={item.headline} onChange={e=>banner(item.id,{headline:e.target.value})}/></label><label>Message<textarea value={item.body} onChange={e=>banner(item.id,{body:e.target.value})}/></label><div className="form-row"><label>Button label<input value={item.buttonLabel} onChange={e=>banner(item.id,{buttonLabel:e.target.value})}/></label><label>Button URL<input value={item.buttonUrl} onChange={e=>banner(item.id,{buttonUrl:e.target.value})}/></label></div></div>)}</section><section className="panel campaign-editor"><div className="panel-head"><div><h2>Popup offers</h2><p>Frequency-controlled coupon campaigns</p></div></div>{config.popups.map(item=><div className="campaign-form" key={item.id}><div className="campaign-form-head"><label><input type="checkbox" checked={item.enabled} onChange={e=>popup(item.id,{enabled:e.target.checked})}/> Active</label><button onClick={()=>setConfig(c=>({...c,popups:c.popups.filter(x=>x.id!==item.id)}))}><X/></button></div><div className="form-row"><label>Headline<input value={item.headline} onChange={e=>popup(item.id,{headline:e.target.value})}/></label><label>Coupon code<input value={item.couponCode} onChange={e=>popup(item.id,{couponCode:e.target.value.toUpperCase()})}/></label></div><label>Message<textarea value={item.body} onChange={e=>popup(item.id,{body:e.target.value})}/></label><div className="form-row"><label>Delay seconds<input type="number" value={item.delaySeconds} onChange={e=>popup(item.id,{delaySeconds:Number(e.target.value)})}/></label><label>Frequency<select value={item.frequency} onChange={e=>popup(item.id,{frequency:e.target.value})}><option>ONCE</option><option>DAILY</option><option>EVERY_VISIT</option></select></label></div></div>)}</section></div>}

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
        onNavigate={(label) => startTransition(() => setActive(label))}
      >
        {active === "Products" ? (
          <VariantEditor />
        ) : active === "Integrations" ? (
          <Integrations />
        ) : active === "Overview" ? (
          <Dashboard />
        ) : active === "Settings" ? (
          <WhiteLabelSettings />
        ) : active === "Marketing" ? (
          <PromotionStudio />
        ) : (
          <ModuleView module={active} />
        )}
      </PortalShell>
    </>
  );
}

function ModuleView({ module }: { module: string }) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]), [loading, setLoading] = useState(false), [loadError, setLoadError] = useState("");
  const endpoint: Record<string, string> = { Orders: "/api/v1/admin/orders", Customers: "/api/v1/admin/customers", Inventory: "/api/v1/admin/inventory", Payments: "/api/v1/admin/payments" };
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
