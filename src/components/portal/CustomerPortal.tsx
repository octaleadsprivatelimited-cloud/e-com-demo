import { useEffect, useState } from "react";
import { Gift, Heart, LayoutDashboard, LifeBuoy, MapPin, Package, RotateCcw, Settings, Star, Wallet } from "lucide-react";
import { PortalShell } from "./PortalShell";
import { commerceApi } from "@/lib/commerce-api";
import { money } from "@/data/commerce";
import { toast, Toaster } from "sonner";

const nav: [string, React.ReactNode][] = [["My overview", <LayoutDashboard />], ["My orders", <Package />], ["Wishlist", <Heart />], ["Addresses", <MapPin />], ["Payments", <Wallet />], ["Reviews", <Star />], ["Returns", <RotateCcw />], ["Support", <LifeBuoy />], ["Profile settings", <Settings />]];
type RecordRow = Record<string, any>;

function Records({ endpoint, empty }: { endpoint: string; empty: string }) {
  const [rows, setRows] = useState<RecordRow[]>([]), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => { commerceApi<RecordRow[]>(endpoint).then(setRows).catch(value => setError(value instanceof Error ? value.message : "Could not load records")).finally(() => setLoading(false)); }, [endpoint]);
  return <section className="panel orders"><div className="panel-head"><div><h2>Your records</h2><p>Live, secure account data</p></div></div>{loading ? <div className="module-empty"><h3>Loading…</h3></div> : error ? <div className="module-empty"><h3>Sign in to continue</h3><p>{error}</p><a className="primary" href="/login">Sign in</a></div> : rows.length ? <div className="table-wrap"><table><thead><tr>{Object.keys(rows[0]).slice(0, 6).map(key => <th key={key}>{key}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || index)}>{Object.entries(row).slice(0, 6).map(([key, value]) => <td key={key}>{typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}</td>)}</tr>)}</tbody></table></div> : <div className="module-empty"><h3>{empty}</h3><p>New activity will appear here automatically.</p></div>}</section>;
}

function Addresses() {
  const [version, setVersion] = useState(0);
  return <><form className="panel form-panel" onSubmit={async event => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await commerceApi("/api/v1/account/addresses", { method: "POST", body: JSON.stringify({ label: data.get("label"), line1: data.get("line1"), city: data.get("city"), state: data.get("state"), postalCode: data.get("postalCode"), country: "IN", isDefault: data.get("isDefault") === "on" }) }); toast.success("Address saved"); event.currentTarget.reset(); setVersion(value => value + 1); } catch (error) { toast.error(error instanceof Error ? error.message : "Address could not be saved"); } }}><div className="panel-head"><div><h2>Add delivery address</h2><p>Used only for checkout and delivery</p></div></div><div className="form-row"><label>Label<input name="label" placeholder="Home" required /></label><label>PIN code<input name="postalCode" pattern="[0-9]{6}" required /></label></div><label>Street address<input name="line1" required /></label><div className="form-row"><label>City<input name="city" required /></label><label>State<input name="state" required /></label></div><label className="check"><input name="isDefault" type="checkbox" /> Make default</label><button className="primary">Save address</button></form><Records key={version} endpoint="/api/v1/account/addresses" empty="No saved addresses" /></>;
}

function Support() {
  const [version, setVersion] = useState(0);
  return <><form className="panel form-panel" onSubmit={async event => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await commerceApi("/api/v1/account/support", { method: "POST", body: JSON.stringify({ subject: data.get("subject"), message: data.get("message"), priority: "NORMAL" }) }); toast.success("Support ticket created"); event.currentTarget.reset(); setVersion(value => value + 1); } catch (error) { toast.error(error instanceof Error ? error.message : "Ticket could not be created"); } }}><div className="panel-head"><div><h2>Contact care team</h2><p>We keep the complete conversation history</p></div></div><label>Subject<input name="subject" required /></label><label>How can we help?<textarea name="message" required /></label><button className="primary">Create ticket</button></form><Records key={version} endpoint="/api/v1/account/support" empty="No support tickets" /></>;
}

function Overview() { return <><div className="customer-hero"><div><p className="portal-eyebrow">Aster circle</p><h2>Your account, in one place</h2><p>Orders, returns, saved pieces and support stay synchronized securely.</p><div><i style={{ width: "64%" }} /></div><span>Member</span><span>Next reward</span></div><Gift /></div><div className="customer-stats">{[[<Package />, "Live", "Order tracking"], [<Heart />, "Saved", "Wishlist"], [<Wallet />, money(0), "Store credit"], [<LifeBuoy />, "Fast", "Customer care"]].map(([icon, value, label]) => <article className="panel" key={String(label)}>{icon}<div><b>{value}</b><span>{label}</span></div></article>)}</div><Records endpoint="/api/v1/account/orders" empty="You have not placed an order yet" /></>; }

export function CustomerPortal() {
  const [active, setActive] = useState("My overview");
  useEffect(() => setActive(new URLSearchParams(window.location.search).get("tab") || "My overview"), []);
  const content = active === "My overview" ? <Overview /> : active === "My orders" ? <Records endpoint="/api/v1/account/orders" empty="No orders yet" /> : active === "Wishlist" ? <Records endpoint="/api/v1/wishlist" empty="Your wishlist is empty" /> : active === "Addresses" ? <Addresses /> : active === "Returns" ? <Records endpoint="/api/v1/account/returns" empty="No return requests" /> : active === "Support" ? <Support /> : <section className="panel module-empty"><h3>{active}</h3><p>This section is ready for your account data and configured providers.</p></section>;
  return <><Toaster richColors /><PortalShell title={active} subtitle="Track orders, manage your details and get help." nav={nav} active={active} onNavigate={setActive}>{content}</PortalShell></>;
}
