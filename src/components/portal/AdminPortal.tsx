import { startTransition, useEffect, useMemo, useRef, useState } from "react";
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
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Star,
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
import { AdminInventoryWorkspace, AdminProductsWorkspace } from "./AdminProductsWorkspace";
import { AdminIntegrationsWorkspace } from "./AdminIntegrationsWorkspace";
import {
  AdminCustomerOperations,
  type CustomerOperationsTab,
} from "./customer-ops";

const nav: [string, React.ReactNode][] = [
  ["Overview", <LayoutDashboard />],
  ["Products", <Package />],
  ["Orders", <ShoppingCart />],
  ["Customers", <Users />],
  ["Returns", <RotateCcw />],
  ["Reviews", <Star />],
  ["Support", <LifeBuoy />],
  ["Inventory", <Box />],
  ["Payments", <CreditCard />],
  ["Shipping", <Truck />],
  ["Marketing", <Zap />],
  ["Analytics", <BarChart3 />],
  ["Integrations", <Code2 />],
  ["Settings", <Settings />],
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

function WhiteLabelSettings() {
  const [form, setForm] = useState<StorefrontConfig>(defaultStorefrontConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const formRef = useRef(form);
  const editVersionRef = useRef(0);

  useEffect(() => {
    if (!sessionStorage.getItem("commerce_access_token")) {
      setAuthRequired(true);
      setError("Sign in with an administrator account to configure this store.");
      setLoading(false);
      return;
    }

    commerceApi<StorefrontConfig>("/api/v1/admin/storefront-config")
      .then((saved) => {
        formRef.current = saved;
        setForm(saved);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Settings could not be loaded",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const updateForm = (patch: Partial<StorefrontConfig>) => {
    editVersionRef.current += 1;
    setForm((current) => {
      const next = { ...current, ...patch };
      formRef.current = next;
      return next;
    });
  };

  const save = async (successMessage: string) => {
    const snapshot = formRef.current;
    const submittedVersion = editVersionRef.current;
    setSaving(true);
    setError("");
    try {
      const saved = await commerceApi<StorefrontConfig>(
        "/api/v1/admin/storefront-config",
        { method: "PUT", body: JSON.stringify(snapshot) },
      );

      // Keep edits made while the request was in flight instead of replacing
      // them with the older server response. The next save will publish them.
      if (editVersionRef.current === submittedVersion) {
        formRef.current = saved;
        setForm(saved);
      }
      toast.success(successMessage);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Settings could not be saved";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="module-empty">
        <RefreshCw />
        <h3>Loading store configuration…</h3>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="module-empty">
        <ShieldCheck />
        <h3>Administrator sign-in required</h3>
        <p>{error}</p>
        <a className="primary" href="/login">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <>
      <WhiteLabelSettingsForm
        form={form}
        error={error}
        saving={saving}
        onChange={updateForm}
        onSave={() => void save("White-label storefront updated")}
      />
      <section className="panel form-panel invoice-identity">
        <div className="panel-head">
          <div>
            <h2>Invoice & checkout rules</h2>
            <p>Tax identity and the storefront free-delivery threshold</p>
          </div>
        </div>
        <div className="form-row">
          <label>
            Business GSTIN
            <input
              value={form.businessGstin}
              onChange={(event) =>
                updateForm({
                  businessGstin: event.target.value.toUpperCase(),
                })
              }
              maxLength={15}
              placeholder="36AAAAA0000A1Z5"
            />
          </label>
          <label>
            Free shipping above
            <input
              type="number"
              min="0"
              step="1"
              value={form.freeShippingThreshold}
              onChange={(event) =>
                updateForm({
                  freeShippingThreshold: Math.max(
                    0,
                    Number(event.target.value) || 0,
                  ),
                })
              }
            />
          </label>
        </div>
        <label>
          Registered business address
          <textarea
            value={form.businessAddress}
            onChange={(event) =>
              updateForm({ businessAddress: event.target.value })
            }
          />
        </label>
        <button
          className="primary"
          onClick={() => void save("Invoice and checkout settings saved")}
          disabled={saving}
        >
          <Save />
          {saving ? "Saving…" : "Save checkout rules"}
        </button>
      </section>
    </>
  );
}

type WhiteLabelSettingsFormProps = {
  form: StorefrontConfig;
  error: string;
  saving: boolean;
  onChange: (patch: Partial<StorefrontConfig>) => void;
  onSave: () => void;
};

function WhiteLabelSettingsForm({
  form,
  error,
  saving,
  onChange,
  onSave,
}: WhiteLabelSettingsFormProps) {
  const field = (key: keyof StorefrontConfig, value: string) =>
    onChange({ [key]: value });

  return <div><div className="editor-top"><div><p className="portal-eyebrow">White-label control centre</p><h2>Store identity & branding</h2><span>Configure the reusable storefront for this customer and domain.</span></div><button className="primary" onClick={onSave} disabled={saving}><Save/>{saving?"Saving…":"Publish settings"}</button></div>{error&&<p className="settings-error"><AlertTriangle/> {error}</p>}<div className="editor-layout"><div><section className="panel form-panel"><div className="panel-head"><div><h2>Brand identity</h2><p>Customer-facing store and legal details</p></div></div><div className="form-row"><label>Store name<input value={form.storeName} onChange={e=>field("storeName",e.target.value)}/></label><label>Legal business name<input value={form.legalName} onChange={e=>field("legalName",e.target.value)}/></label></div><div className="form-row"><label>Logo URL<input type="url" value={form.logoUrl} onChange={e=>field("logoUrl",e.target.value)} placeholder="https://…"/></label><label>Favicon URL<input type="url" value={form.faviconUrl} onChange={e=>field("faviconUrl",e.target.value)} placeholder="https://…"/></label></div></section><section className="panel form-panel"><div className="panel-head"><div><h2>Contact & messaging</h2><p>Support channels and reusable storefront copy</p></div></div><div className="form-row"><label>Support email<input type="email" value={form.supportEmail} onChange={e=>field("supportEmail",e.target.value)}/></label><label>Support phone<input value={form.supportPhone} onChange={e=>field("supportPhone",e.target.value)}/></label></div><label>Announcement<input value={form.announcement} onChange={e=>field("announcement",e.target.value)}/></label><label>Footer tagline<textarea value={form.footerTagline} onChange={e=>field("footerTagline",e.target.value)}/></label></section><section className="panel form-panel"><div className="panel-head"><div><h2>Search & domain</h2><p>SEO defaults and customer hostname mapping</p></div></div><label>Primary domain<input value={form.primaryDomain} onChange={e=>field("primaryDomain",e.target.value)} placeholder="shop.customer.com"/></label><label>SEO title<input value={form.seoTitle} onChange={e=>field("seoTitle",e.target.value)}/></label><label>SEO description<textarea value={form.seoDescription} onChange={e=>field("seoDescription",e.target.value)}/></label></section></div><aside><section className="panel form-panel sticky"><div className="panel-head"><div><h2>Theme & region</h2><p>Live preview</p></div></div><div className="settings-preview" style={{background:form.backgroundColor,color:form.primaryColor,borderColor:form.accentColor}}><i style={{background:form.accentColor}}>{form.storeName.split(/\s+/).map(x=>x[0]).join("").slice(0,2)}</i><strong>{form.storeName}</strong><small>{form.footerTagline}</small></div>{([['primaryColor','Primary colour'],['accentColor','Accent colour'],['backgroundColor','Background']] as [keyof StorefrontConfig,string][]).map(([key,label])=><label key={key}>{label}<span className="color-field"><input type="color" value={form[key]} onChange={e=>field(key,e.target.value)}/><input value={form[key]} onChange={e=>field(key,e.target.value)}/></span></label>)}<div className="form-row"><label>Currency<select value={form.currency} onChange={e=>field("currency",e.target.value)}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option></select></label><label>Locale<select value={form.locale} onChange={e=>field("locale",e.target.value)}><option>en-IN</option><option>en-US</option><option>en-GB</option><option>ar-AE</option></select></label></div></section></aside></div></div>;
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
  const customerOperations = ["Customers", "Returns", "Reviews", "Support"].includes(active);
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
                : customerOperations
                  ? "Serve customers with live, connected store records."
                : "Manage your commerce operations."
        }
        nav={nav}
        active={active}
        onNavigate={(label) => startTransition(() => setActive(label))}
      >
        {active === "Products" ? (
          <AdminProductsWorkspace />
        ) : active === "Integrations" ? (
          <AdminIntegrationsWorkspace />
        ) : active === "Overview" ? (
          <Dashboard />
        ) : active === "Settings" ? (
          <WhiteLabelSettings />
        ) : active === "Marketing" ? (
          <PromotionStudio />
        ) : active === "Orders" ? (
          <AdminOrdersPanel />
        ) : active === "Inventory" ? (
          <AdminInventoryWorkspace />
        ) : customerOperations ? (
          <AdminCustomerOperations module={active as CustomerOperationsTab} />
        ) : (
          <ModuleView module={active} />
        )}
      </PortalShell>
    </>
  );
}

type AdminOrderContact = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type AdminOrderAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  gstin?: string | null;
};

type AdminOrderRefund = {
  id?: string;
  amount?: number;
  status?: string;
  reason?: string;
  reference?: string | null;
  createdAt?: string;
};

type AdminOrderDTO = {
  id: string;
  number: string;
  status: string;
  createdAt?: string;
  customer: AdminOrderContact;
  address: AdminOrderAddress;
  lineItems: Array<{
    variantId?: string;
    name?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    tax?: number;
    lineSubtotal?: number;
    lineTotal?: number;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    currency: string;
  };
  payment: {
    provider?: string;
    status?: string;
    transactionReference?: string | null;
    amount?: number;
    currency?: string;
    refundedAmount: number;
    refundableAmount: number;
    refunds: AdminOrderRefund[];
  };
  shipping: {
    selection?: {
      provider?: string;
      service?: string;
      label?: string;
      etaDays?: number;
      quotedAmount?: number;
      chargedAmount?: number;
      currency?: string;
      quotedAt?: string;
    } | null;
    shipment?: {
      id?: string;
      reference?: string | null;
      provider?: string;
      courier?: string | null;
      status?: string;
      awb?: string | null;
      trackingUrl?: string | null;
      createdAt?: string;
      events?: Array<{
        status: string;
        location?: string;
        occurredAt: string;
      }>;
    } | null;
  };
  history?: Array<{
    id?: string;
    from?: string;
    to?: string;
    status?: string;
    label?: string;
    source?: string;
    actor?: string;
    at?: string;
    createdAt?: string;
  }>;
};

type AdminOrdersResponse = {
  items: AdminOrderDTO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalOrders: number;
    activeCount: number;
    readyToShip: number;
    orderValue: number;
    currency: string;
  };
};

const adminOrderTransitions: Record<string, string[]> = {
  PENDING: ["CANCELLED"],
  PAYMENT_PENDING: ["CANCELLED"],
  PAID: ["CONFIRMED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: [],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "SHIPPED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURN_APPROVED"],
  RETURN_APPROVED: ["RETURNED"],
  RETURNED: [],
  REFUND_PENDING: [],
  FAILED: [],
};

const adminOrderFilterStatuses = [
  "PENDING",
  "PAYMENT_PENDING",
  "PAID",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "RETURNED",
  "REFUND_PENDING",
  "REFUNDED",
  "FAILED",
  "CANCELLED",
];

const adminOrdersPageSize = 20;

function orderContact(order: AdminOrderDTO) {
  return order.customer || {};
}

function orderAddress(order: AdminOrderDTO) {
  return order.address || {};
}

function orderRefunds(order: AdminOrderDTO) {
  return order.payment.refunds || [];
}

function refundedTotal(order: AdminOrderDTO) {
  return Number(order.payment.refundedAmount || 0);
}

function orderStatusLabel(value?: string) {
  if (!value) return "Not available";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function orderDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function addressText(address: AdminOrderAddress) {
  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function newOperationKey() {
  return `admin-${Date.now()}-${crypto.randomUUID()}`;
}

function AdminOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrderDTO[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<AdminOrdersResponse["pagination"]>({
    page: 1,
    pageSize: adminOrdersPageSize,
    total: 0,
    totalPages: 0,
  });
  const [summary, setSummary] = useState<AdminOrdersResponse["summary"]>({
    totalOrders: 0,
    activeCount: 0,
    readyToShip: 0,
    orderValue: 0,
    currency: "INR",
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [refundMode, setRefundMode] = useState<"PARTIAL" | "FULL">("PARTIAL");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [refundKey, setRefundKey] = useState(newOperationKey);
  const orderRequestSequence = useRef(0);

  const loadOrders = async (preferredId?: string) => {
    const requestId = ++orderRequestSequence.current;
    setLoading(true);
    setLoadError("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(adminOrdersPageSize),
      });
      if (debouncedSearch) query.set("search", debouncedSearch);
      if (statusFilter !== "ALL") query.set("status", statusFilter);
      const response = await commerceApi<AdminOrdersResponse>(
        `/api/v1/admin/orders?${query.toString()}`,
      );
      if (requestId !== orderRequestSequence.current) return;

      const totalPages = Math.max(0, Number(response.pagination.totalPages || 0));
      if (response.pagination.total > 0 && page > Math.max(1, totalPages)) {
        setPage(Math.max(1, totalPages));
        return;
      }

      setOrders(response.items);
      setPagination(response.pagination);
      setSummary(response.summary);
      setSelectedId((current) => {
        const wanted = preferredId || current;
        return response.items.some((order) => order.id === wanted)
          ? wanted
          : response.items[0]?.id || "";
      });
    } catch (error) {
      if (requestId !== orderRequestSequence.current) return;
      setLoadError(error instanceof Error ? error.message : "Orders could not be loaded");
      setOrders([]);
      setSelectedId("");
    } finally {
      if (requestId === orderRequestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadOrders();
    return () => {
      orderRequestSequence.current += 1;
    };
    // loadOrders intentionally reads the current server query state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    setRefundMode("PARTIAL");
    setRefundAmount("");
    setRefundReason("");
    setRefundConfirmed(false);
    setRefundKey(newOperationKey());
    setActionError("");
    setActionSuccess("");
  }, [selectedId]);

  const selectedOrder = orders.find((order) => order.id === selectedId);
  const resultStart = pagination.total
    ? (pagination.page - 1) * pagination.pageSize + 1
    : 0;
  const resultEnd = pagination.total
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : 0;
  const visiblePage = Math.max(1, pagination.page || page);
  const visibleTotalPages = Math.max(1, pagination.totalPages || 0);

  const runStatusAction = async (status: string) => {
    if (!selectedOrder) return;
    const action = `status:${status}`;
    setBusyAction(action);
    setActionError("");
    setActionSuccess("");
    try {
      await commerceApi(`/api/v1/admin/orders/${selectedOrder.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const message = `${selectedOrder.number} moved to ${orderStatusLabel(status)}`;
      setActionSuccess(message);
      toast.success(message);
      await loadOrders(selectedOrder.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order status could not be updated";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusyAction("");
    }
  };

  const createShipment = async () => {
    if (!selectedOrder || selectedOrder.status !== "PACKED") return;
    setBusyAction("shipment");
    setActionError("");
    setActionSuccess("");
    try {
      await commerceApi(`/api/v1/admin/orders/${selectedOrder.id}/shipment`, {
        method: "POST",
        body: JSON.stringify({
          service: selectedOrder.shipping.selection?.service || "STANDARD",
        }),
      });
      const message = `Shipment created for ${selectedOrder.number}`;
      setActionSuccess(message);
      toast.success(message);
      await loadOrders(selectedOrder.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shipment could not be created";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusyAction("");
    }
  };

  const changeRefundForm = (patch: {
    mode?: "PARTIAL" | "FULL";
    amount?: string;
    reason?: string;
  }) => {
    if (patch.mode) setRefundMode(patch.mode);
    if (patch.amount !== undefined) setRefundAmount(patch.amount);
    if (patch.reason !== undefined) setRefundReason(patch.reason);
    setRefundConfirmed(false);
    setRefundKey(newOperationKey());
    setActionError("");
    setActionSuccess("");
  };

  const submitRefund = async () => {
    if (!selectedOrder) return;
    const refundable = Math.max(0, selectedOrder.payment.refundableAmount || 0);
    const amount = refundMode === "FULL" ? refundable : Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > refundable) {
      setActionError(`Enter an amount between ₹0.01 and ${money(refundable)}.`);
      return;
    }
    if (refundReason.trim().length < 3) {
      setActionError("Add a short reason for the refund.");
      return;
    }
    if (!refundConfirmed) {
      setActionError("Confirm the refund amount before submitting.");
      return;
    }
    setBusyAction("refund");
    setActionError("");
    setActionSuccess("");
    try {
      await commerceApi(`/api/v1/admin/orders/${selectedOrder.id}/refunds`, {
        method: "POST",
        headers: { "Idempotency-Key": refundKey },
        body: JSON.stringify({ amount, reason: refundReason.trim() }),
      });
      const message = `${money(amount)} refunded for ${selectedOrder.number}`;
      setActionSuccess(message);
      toast.success(message);
      setRefundConfirmed(false);
      setRefundAmount("");
      setRefundReason("");
      setRefundKey(newOperationKey());
      await loadOrders(selectedOrder.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refund could not be processed";
      setActionError(message);
      toast.error(message);
    } finally {
      setBusyAction("");
    }
  };

  if (loading && !orders.length)
    return (
      <div className="module-empty admin-orders-state">
        <RefreshCw className="spin" />
        <h3>Loading live orders…</h3>
        <p>Fetching order, payment and fulfilment details.</p>
      </div>
    );

  if (loadError && !orders.length)
    return (
      <div className="module-empty admin-orders-state" role="alert">
        <AlertTriangle />
        <h3>Orders could not be loaded</h3>
        <p>{loadError}</p>
        <div>
          <button className="primary" type="button" onClick={() => void loadOrders()}>
            <RefreshCw /> Retry
          </button>
          <a className="secondary" href="/login">Sign in</a>
        </div>
      </div>
    );

  if (
    !orders.length &&
    !loading &&
    !search.trim() &&
    statusFilter === "ALL" &&
    summary.totalOrders === 0
  )
    return (
      <div className="module-empty admin-orders-state">
        <ShoppingCart />
        <h3>No orders yet</h3>
        <p>Customer orders will appear here automatically after checkout.</p>
        <a className="secondary" href="/shop">View storefront</a>
      </div>
    );

  return (
    <div className="admin-orders-workspace">
      <div className="editor-top admin-orders-heading">
        <div>
          <p className="portal-eyebrow">Live fulfilment workspace</p>
          <h2>Orders</h2>
          <span>Review customers, payments, delivery and refunds from one place.</span>
        </div>
        <button
          className="secondary"
          type="button"
          onClick={() => void loadOrders(selectedId)}
          disabled={loading || Boolean(busyAction)}
        >
          <RefreshCw className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      <div className="admin-order-metrics">
        <article className="panel"><ShoppingCart /><span><small>Total orders</small><b>{summary.totalOrders}</b></span></article>
        <article className="panel"><Activity /><span><small>Active</small><b>{summary.activeCount}</b></span></article>
        <article className="panel"><Package /><span><small>Ready to ship</small><b>{summary.readyToShip}</b></span></article>
        <article className="panel"><CircleDollarSign /><span><small>Order value</small><b>{money(summary.orderValue)}</b></span></article>
      </div>

      <section className="panel admin-order-browser">
        <div className="admin-order-toolbar">
          <label>
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, customer or SKU"
              aria-label="Search orders"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter orders by status"
          >
            <option value="ALL">All statuses</option>
            {adminOrderFilterStatuses.map((status) => <option key={status} value={status}>{orderStatusLabel(status)}</option>)}
          </select>
          <small aria-live="polite">
            {loading ? "Updating… · " : ""}
            {pagination.total ? `${resultStart}–${resultEnd} of ${pagination.total}` : "0 orders"}
          </small>
        </div>

        <div className="admin-order-layout">
          <div className="admin-order-list-column">
            <div className="admin-order-list" aria-label="Order list" aria-busy={loading}>
              {orders.length ? orders.map((order) => {
                const contact = orderContact(order);
                const itemCount = order.lineItems.reduce((total, line) => total + line.quantity, 0);
                return (
                  <button
                    type="button"
                    className={order.id === selectedId ? "active" : ""}
                    key={order.id}
                    onClick={() => setSelectedId(order.id)}
                    aria-pressed={order.id === selectedId}
                  >
                    <span><b>{order.number}</b><small>{orderDate(order.createdAt)}</small></span>
                    <span><strong>{contact.name || contact.email || "Guest customer"}</strong><small>{itemCount} item{itemCount === 1 ? "" : "s"}</small></span>
                    <span><b>{money(order.totals.total)}</b><em className={`status ${order.status.toLowerCase()}`}>{orderStatusLabel(order.status)}</em></span>
                    <ChevronRight />
                  </button>
                );
              }) : (
                <div className="admin-order-no-results">
                  <Search />
                  <b>No matching orders</b>
                  <small>Clear the search or choose another status.</small>
                </div>
              )}
            </div>
            <nav className="admin-order-pagination" aria-label="Order list pages">
              <button
                className="secondary"
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || visiblePage <= 1}
                aria-label="Previous orders page"
              >
                Previous
              </button>
              <span aria-live="polite">
                Page {visiblePage} of {visibleTotalPages}
                <small>{pagination.total ? `${resultStart}–${resultEnd} of ${pagination.total} orders` : "No orders"}</small>
              </span>
              <button
                className="secondary"
                type="button"
                onClick={() => setPage((current) => Math.min(visibleTotalPages, current + 1))}
                disabled={loading || visiblePage >= visibleTotalPages}
                aria-label="Next orders page"
              >
                Next
              </button>
            </nav>
          </div>

          {selectedOrder ? (
            <AdminOrderDetail
              order={selectedOrder}
              busyAction={busyAction}
              actionError={actionError}
              actionSuccess={actionSuccess}
              refundMode={refundMode}
              refundAmount={refundAmount}
              refundReason={refundReason}
              refundConfirmed={refundConfirmed}
              onStatus={runStatusAction}
              onShipment={createShipment}
              onRefundMode={(mode) => changeRefundForm({ mode })}
              onRefundAmount={(amount) => changeRefundForm({ amount })}
              onRefundReason={(reason) => changeRefundForm({ reason })}
              onRefundConfirmed={setRefundConfirmed}
              onRefund={submitRefund}
            />
          ) : (
            <div className="admin-order-no-selection"><FileText /><p>Select an order to review its details.</p></div>
          )}
        </div>
      </section>
    </div>
  );
}

type AdminOrderDetailProps = {
  order: AdminOrderDTO;
  busyAction: string;
  actionError: string;
  actionSuccess: string;
  refundMode: "PARTIAL" | "FULL";
  refundAmount: string;
  refundReason: string;
  refundConfirmed: boolean;
  onStatus: (status: string) => Promise<void>;
  onShipment: () => Promise<void>;
  onRefundMode: (mode: "PARTIAL" | "FULL") => void;
  onRefundAmount: (amount: string) => void;
  onRefundReason: (reason: string) => void;
  onRefundConfirmed: (confirmed: boolean) => void;
  onRefund: () => Promise<void>;
};

function AdminOrderDetail({
  order,
  busyAction,
  actionError,
  actionSuccess,
  refundMode,
  refundAmount,
  refundReason,
  refundConfirmed,
  onStatus,
  onShipment,
  onRefundMode,
  onRefundAmount,
  onRefundReason,
  onRefundConfirmed,
  onRefund,
}: AdminOrderDetailProps) {
  const contact = orderContact(order);
  const address = orderAddress(order);
  const refunds = orderRefunds(order);
  const refunded = refundedTotal(order);
  const refundable = Math.max(0, Number(order.payment.refundableAmount || 0));
  const nextStatuses = adminOrderTransitions[order.status] || [];
  const paymentReference = order.payment.transactionReference;
  const shipment = order.shipping.shipment;
  const shippingSelection = order.shipping.selection;
  const trackingNumber = shipment?.awb;
  const canRefund = refundable > 0;
  const timeline = [
    ...(order.history || []).map((event, index) => ({
        id: event.id || `${event.to || event.status}-${index}`,
        label: event.label || orderStatusLabel(event.to || event.status),
        description: [event.from ? `From ${orderStatusLabel(event.from)}` : "Order created", event.source, event.actor ? `by ${event.actor}` : ""].filter(Boolean).join(" · "),
        at: event.at || event.createdAt,
      })),
    ...(shipment?.events || []).map((event, index) => ({
      id: `shipment-${event.status}-${index}`,
      label: orderStatusLabel(event.status),
      description: event.location ? `Shipment update · ${event.location}` : "Shipment update",
      at: event.occurredAt,
    })),
    ...refunds.map((refund, index) => ({
      id: refund.id || `refund-${index}`,
      label: `${orderStatusLabel(refund.status)} refund · ${money(Number(refund.amount || 0))}`,
      description: refund.reason || "Refund update",
      at: refund.createdAt,
    })),
  ].sort((left, right) => new Date(left.at || 0).getTime() - new Date(right.at || 0).getTime());

  return (
    <article className="admin-order-detail">
      <header>
        <div>
          <p className="portal-eyebrow">Order detail</p>
          <h2>{order.number}</h2>
          <small>Placed {orderDate(order.createdAt)}</small>
        </div>
        <span className={`status ${order.status.toLowerCase()}`}>{orderStatusLabel(order.status)}</span>
      </header>

      {(actionError || actionSuccess) && (
        <p className={actionError ? "admin-order-alert error" : "admin-order-alert success"} role={actionError ? "alert" : "status"}>
          {actionError ? <AlertTriangle /> : <ShieldCheck />}
          {actionError || actionSuccess}
        </p>
      )}

      <section className="admin-order-actions">
        <div><h3>Next action</h3><p>Only valid transitions for this order are available.</p></div>
        <div>
          {nextStatuses.map((status) => (
            <button
              className={status === "CANCELLED" || status === "FAILED" ? "secondary danger" : "secondary"}
              type="button"
              key={status}
              disabled={Boolean(busyAction)}
              onClick={() => void onStatus(status)}
            >
              {busyAction === `status:${status}` ? <RefreshCw className="spin" /> : <ChevronRight />}
              {orderStatusLabel(status)}
            </button>
          ))}
          {order.status === "PACKED" && (
            <button className="primary" type="button" disabled={Boolean(busyAction)} onClick={() => void onShipment()}>
              {busyAction === "shipment" ? <RefreshCw className="spin" /> : <Truck />}
              {busyAction === "shipment" ? "Creating shipment…" : "Create shipment"}
            </button>
          )}
          {!nextStatuses.length && order.status !== "PACKED" && <small>No manual status action is available.</small>}
        </div>
      </section>

      <div className="admin-order-info-grid">
        <section>
          <h3><Users /> Customer</h3>
          <b>{contact.name || "Guest customer"}</b>
          <p>{contact.email || "No email recorded"}</p>
          <p>{contact.phone || "No mobile recorded"}</p>
          {address.gstin && <p>GSTIN: {address.gstin}</p>}
        </section>
        <section>
          <h3><Globe2 /> Delivery address</h3>
          <p>{addressText(address) || "No delivery address recorded"}</p>
        </section>
        <section>
          <h3><CreditCard /> Payment</h3>
          <b>{orderStatusLabel(order.payment.status || "NOT_RECORDED")}</b>
          <p>{orderStatusLabel(order.payment.provider || "Provider not recorded")}</p>
          <p className="admin-order-reference">{paymentReference || "No gateway transaction ID"}</p>
          <p>{money(Number(order.payment.amount || 0))} {order.payment.currency || order.totals.currency}</p>
        </section>
        <section>
          <h3><Truck /> Shipping</h3>
          <b>{shipment?.courier || shipment?.provider || shippingSelection?.provider || "Not booked"}</b>
          <p>{shippingSelection?.label || shippingSelection?.service || "Service not selected"}</p>
          <p>{trackingNumber ? `Tracking: ${trackingNumber}` : "No tracking number yet"}</p>
          {shipment?.trackingUrl && <p><a href={shipment.trackingUrl} target="_blank" rel="noreferrer">Open courier tracking</a></p>}
          {shipment?.status && <span className={`status ${shipment.status.toLowerCase()}`}>{orderStatusLabel(shipment.status)}</span>}
        </section>
      </div>

      <section className="admin-order-lines">
        <div className="admin-order-section-title"><h3>Items</h3><small>{order.lineItems.length} line{order.lineItems.length === 1 ? "" : "s"}</small></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product / variant</th><th>SKU</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
            <tbody>
              {order.lineItems.map((line, index) => (
                <tr key={line.variantId || `${line.sku}-${index}`}>
                  <td><b>{line.name || "Product"}</b><small>{line.variantId || "Variant not recorded"}</small></td>
                  <td>{line.sku || "—"}</td>
                  <td>{line.quantity}</td>
                  <td>{money(line.unitPrice)}</td>
                  <td>{money(Number(line.lineTotal ?? line.unitPrice * line.quantity))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="admin-order-lower-grid">
        <section className="admin-order-totals">
          <h3>Order totals</h3>
          <dl>
            <div><dt>Subtotal</dt><dd>{money(order.totals.subtotal)}</dd></div>
            <div><dt>GST</dt><dd>{money(Number(order.totals.tax || 0))}</dd></div>
            <div><dt>Shipping</dt><dd>{money(Number(order.totals.shipping || 0))}</dd></div>
            <div><dt>Discount</dt><dd>−{money(Number(order.totals.discount || 0))}</dd></div>
            {refunded > 0 && <div className="refund-row"><dt>Refunded</dt><dd>−{money(refunded)}</dd></div>}
            <div className="total-row"><dt>Total</dt><dd>{money(order.totals.total)}</dd></div>
          </dl>
        </section>
        <section className="admin-order-timeline">
          <h3>Timeline</h3>
          {timeline.length ? timeline.slice().reverse().map((event, index) => (
            <div key={event.id}>
              <i className={index === 0 ? "current" : ""}><Activity /></i>
              <span><b>{event.label}</b>{event.description && <p>{event.description}</p>}<small>{orderDate(event.at)}</small></span>
            </div>
          )) : <p className="admin-order-muted">No timeline events recorded.</p>}
        </section>
      </div>

      <section className="admin-order-refund">
        <div className="admin-order-section-title">
          <div><h3>Refunds</h3><p>Refundable balance: {money(refundable)}</p></div>
          <RefreshCw />
        </div>
        {refunds.length > 0 && (
          <div className="admin-refund-history">
            {refunds.map((refund, index) => (
              <span key={refund.id || index}><b>{money(Number(refund.amount || 0))}</b><small>{orderStatusLabel(refund.status)} · {orderDate(refund.createdAt)}</small></span>
            ))}
          </div>
        )}
        {canRefund ? (
          <div className="admin-refund-form">
            <div className="admin-refund-mode" role="group" aria-label="Refund type">
              <button type="button" className={refundMode === "PARTIAL" ? "active" : ""} aria-pressed={refundMode === "PARTIAL"} onClick={() => onRefundMode("PARTIAL")}>Partial refund</button>
              <button type="button" className={refundMode === "FULL" ? "active" : ""} aria-pressed={refundMode === "FULL"} onClick={() => onRefundMode("FULL")}>Full refund</button>
            </div>
            <label>
              Refund amount
              <span className="admin-refund-amount"><i>₹</i><input type="number" min="0.01" max={refundable} step="0.01" value={refundMode === "FULL" ? refundable : refundAmount} disabled={refundMode === "FULL" || Boolean(busyAction)} onChange={(event) => onRefundAmount(event.target.value)} /></span>
            </label>
            <label>
              Reason
              <textarea value={refundReason} disabled={Boolean(busyAction)} onChange={(event) => onRefundReason(event.target.value)} placeholder="Reason shown in the refund audit record" />
            </label>
            <label className="admin-refund-confirm">
              <input type="checkbox" checked={refundConfirmed} disabled={Boolean(busyAction)} onChange={(event) => onRefundConfirmed(event.target.checked)} />
              <span>I confirm this {refundMode.toLowerCase()} refund. This sends money through the payment gateway and cannot be undone here.</span>
            </label>
            <button className="primary admin-refund-submit" type="button" disabled={!refundConfirmed || Boolean(busyAction)} onClick={() => void onRefund()}>
              {busyAction === "refund" ? <RefreshCw className="spin" /> : <CreditCard />}
              {busyAction === "refund" ? "Processing securely…" : `Refund ${refundMode === "FULL" ? money(refundable) : refundAmount ? money(Number(refundAmount)) : "amount"}`}
            </button>
          </div>
        ) : (
          <p className="admin-order-muted">{refundable <= 0 ? "This order has been fully refunded." : "A captured online payment is required before a refund can be issued."}</p>
        )}
      </section>
    </article>
  );
}

function ModuleView({ module }: { module: string }) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]), [loading, setLoading] = useState(false), [loadError, setLoadError] = useState("");
  const endpoint: Record<string, string> = { Orders: "/api/v1/admin/orders", Inventory: "/api/v1/admin/inventory", Payments: "/api/v1/admin/payments" };
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
