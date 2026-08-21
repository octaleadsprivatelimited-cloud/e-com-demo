import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Gift,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import { PortalShell } from "./PortalShell";
import {
  commerceApi,
  commerceDownload,
  type ApiProduct,
} from "@/lib/commerce-api";
import { money } from "@/data/commerce";
import { toast, Toaster } from "sonner";

const nav: [string, React.ReactNode][] = [
  ["My overview", <LayoutDashboard />],
  ["My orders", <Package />],
  ["Wishlist", <Heart />],
  ["Addresses", <MapPin />],
  ["Payments", <Wallet />],
  ["Reviews", <Star />],
  ["Returns", <RotateCcw />],
  ["Support", <LifeBuoy />],
  ["Profile settings", <Settings />],
];
type RecordRow = Record<string, any>;
type AccountUser = { id: string; name: string; email: string; role: string };
type CustomerPayment = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  providerReference?: string | null;
  transactionId?: string | null;
  refundedAmount: number;
  refunds: Array<{
    id: string;
    reference?: string | null;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    type: string;
    errorCode?: string;
    errorDescription?: string;
    createdAt: string;
  }>;
  createdAt: string;
  verifiedAt?: string | null;
};
type CustomerReview = {
  id: string;
  productId: string;
  rating: number;
  title?: string | null;
  body: string;
  verified: boolean;
  status: string;
  createdAt: string;
  product: { id: string; name: string; slug?: string };
};

const accountTabs = new Set(nav.map(([label]) => label));
const date = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
const paymentMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(value);

function Records({
  endpoint,
  empty,
  invoices = false,
}: {
  endpoint: string;
  empty: string;
  invoices?: boolean;
}) {
  const [rows, setRows] = useState<RecordRow[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    commerceApi<RecordRow[]>(endpoint)
      .then(setRows)
      .catch((value) =>
        setError(
          value instanceof Error ? value.message : "Could not load records",
        ),
      )
      .finally(() => setLoading(false));
  }, [endpoint]);
  const download = async (row: RecordRow) => {
    try {
      const blob = await commerceDownload(`/api/v1/orders/${row.id}/invoice`),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${row.number || row.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Invoice could not be downloaded",
      );
    }
  };
  return (
    <section className="panel orders">
      <div className="panel-head">
        <div>
          <h2>Your records</h2>
          <p>Live, secure account data</p>
        </div>
      </div>
      {loading ? (
        <div className="module-empty">
          <h3>Loading…</h3>
        </div>
      ) : error ? (
        <div className="module-empty">
          <h3>Sign in to continue</h3>
          <p>{error}</p>
          <a className="primary" href="/login">
            Sign in
          </a>
        </div>
      ) : rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {Object.keys(rows[0])
                  .slice(0, 6)
                  .map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                {invoices && <th>Invoice</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={String(row.id || index)}>
                  {Object.entries(row)
                    .slice(0, 6)
                    .map(([key, value]) => (
                      <td key={key}>
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value ?? "—")}
                      </td>
                    ))}
                  {invoices && (
                    <td>
                      <button
                        className="invoice-download"
                        onClick={() => download(row)}
                      >
                        Download PDF
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="module-empty">
          <h3>{empty}</h3>
          <p>New activity will appear here automatically.</p>
        </div>
      )}
    </section>
  );
}

function PaymentsPanel() {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    commerceApi<CustomerPayment[]>("/api/v1/account/payments")
      .then(setPayments)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Payment history could not be loaded",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <section className="panel module-empty">
        <CreditCard />
        <h3>Loading payment history…</h3>
      </section>
    );
  if (error)
    return (
      <section className="panel module-empty">
        <AlertCircle />
        <h3>Payment history is unavailable</h3>
        <p>{error}</p>
        <a className="primary" href="/login">
          Sign in again
        </a>
      </section>
    );
  if (!payments.length)
    return (
      <section className="panel module-empty">
        <Wallet />
        <h3>No online payments yet</h3>
        <p>Cash-on-delivery orders remain available under My orders.</p>
      </section>
    );

  const paid = payments
    .filter((payment) =>
      ["CAPTURED", "AUTHORIZED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(
        payment.status,
      ),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = payments.reduce(
    (sum, payment) => sum + payment.refundedAmount,
    0,
  );
  return (
    <>
      <div className="customer-stats payment-summary">
        <article className="panel">
          <CreditCard />
          <div>
            <b>{payments.length}</b>
            <span>Online attempts</span>
          </div>
        </article>
        <article className="panel">
          <CheckCircle2 />
          <div>
            <b>{paymentMoney(paid, payments[0]?.currency || "INR")}</b>
            <span>Collected</span>
          </div>
        </article>
        <article className="panel">
          <RotateCcw />
          <div>
            <b>{paymentMoney(refunded, payments[0]?.currency || "INR")}</b>
            <span>Refunded</span>
          </div>
        </article>
      </div>
      <section className="panel orders payment-history">
        <div className="panel-head">
          <div>
            <h2>Payment history</h2>
            <p>Provider references, transaction IDs and refund status</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Provider</th>
                <th>Gateway reference</th>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Refunded</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const failure = payment.events.find(
                  (event) => event.errorDescription,
                );
                return (
                  <tr key={payment.id}>
                    <td>
                      <a href="/account?tab=My%20orders">
                        {payment.orderNumber}
                      </a>
                    </td>
                    <td>{date(payment.createdAt)}</td>
                    <td className="payment-provider">{payment.provider}</td>
                    <td>
                      <code>{payment.providerReference || "Pending"}</code>
                    </td>
                    <td>
                      <code>{payment.transactionId || "Not issued"}</code>
                    </td>
                    <td>{paymentMoney(payment.amount, payment.currency)}</td>
                    <td>
                      {payment.refundedAmount
                        ? paymentMoney(payment.refundedAmount, payment.currency)
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={`status ${payment.status.toLowerCase()}`}
                        title={failure?.errorDescription}
                      >
                        {payment.status.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ReviewsPanel() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [productId, setProductId] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [availableProducts, customerReviews] = await Promise.all([
      commerceApi<ApiProduct[]>("/api/v1/products"),
      commerceApi<CustomerReview[]>("/api/v1/account/reviews"),
    ]);
    setProducts(availableProducts);
    setReviews(customerReviews);
    const reviewed = new Set(customerReviews.map((review) => review.productId));
    setProductId((current) =>
      current && !reviewed.has(current)
        ? current
        : availableProducts.find((product) => !reviewed.has(product.id))?.id ||
          "",
    );
  };

  useEffect(() => {
    load()
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Reviews could not be loaded",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const reviewedProducts = new Set(reviews.map((review) => review.productId));
  const reviewableProducts = products.filter(
    (product) => !reviewedProducts.has(product.id),
  );
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      await commerceApi("/api/v1/account/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId,
          rating,
          title: title || undefined,
          body,
        }),
      });
      toast.success("Review submitted for moderation");
      setTitle("");
      setBody("");
      setRating(5);
      await load();
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Review could not be submitted",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <section className="panel module-empty">
        <Star />
        <h3>Loading your reviews…</h3>
      </section>
    );
  if (error)
    return (
      <section className="panel module-empty">
        <AlertCircle />
        <h3>Reviews are unavailable</h3>
        <p>{error}</p>
      </section>
    );

  return (
    <div className="reviews-layout">
      <section className="panel form-panel review-form">
        <div className="panel-head">
          <div>
            <h2>Write a product review</h2>
            <p>Each review is checked before it appears publicly</p>
          </div>
        </div>
        {reviewableProducts.length ? (
          <form onSubmit={submit}>
            <label>
              Product
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                required
              >
                {reviewableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="review-rating">
              <legend>Your rating</legend>
              <div role="radiogroup" aria-label="Product rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    className={value <= rating ? "active" : ""}
                    onClick={() => setRating(value)}
                    key={value}
                  >
                    <Star />
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              Review title <small>(optional)</small>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="What stood out?"
              />
            </label>
            <label>
              Your review
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                minLength={5}
                maxLength={5000}
                required
                placeholder="Share details that will help another customer."
              />
            </label>
            <button className="primary" disabled={busy || !productId}>
              {busy ? "Submitting…" : "Submit review"}
            </button>
          </form>
        ) : (
          <div className="review-complete">
            <CheckCircle2 />
            <h3>You have reviewed every available product</h3>
            <p>Your published and pending reviews remain visible alongside.</p>
          </div>
        )}
      </section>
      <section className="panel customer-reviews">
        <div className="panel-head">
          <div>
            <h2>Your reviews</h2>
            <p>Track moderation and verified-purchase status</p>
          </div>
        </div>
        {reviews.length ? (
          <div className="review-list">
            {reviews.map((review) => (
              <article key={review.id}>
                <div>
                  <a href={`/product/${review.productId}`}>
                    {review.product.name}
                  </a>
                  <span
                    className="review-stars"
                    aria-label={`${review.rating} stars`}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        className={value <= review.rating ? "active" : ""}
                        key={value}
                      />
                    ))}
                  </span>
                </div>
                <span className={`status ${review.status.toLowerCase()}`}>
                  {review.status}
                </span>
                {review.title && <h3>{review.title}</h3>}
                <p>{review.body}</p>
                <footer>
                  <span>{date(review.createdAt)}</span>
                  {review.verified && (
                    <span className="verified-review">
                      <ShieldCheck /> Verified purchase
                    </span>
                  )}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="module-empty compact">
            <Star />
            <h3>No reviews submitted yet</h3>
          </div>
        )}
      </section>
    </div>
  );
}

function Addresses() {
  const [version, setVersion] = useState(0);
  return (
    <>
      <form
        className="panel form-panel"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          try {
            await commerceApi("/api/v1/account/addresses", {
              method: "POST",
              body: JSON.stringify({
                label: data.get("label"),
                line1: data.get("line1"),
                city: data.get("city"),
                state: data.get("state"),
                postalCode: data.get("postalCode"),
                country: "IN",
                isDefault: data.get("isDefault") === "on",
              }),
            });
            toast.success("Address saved");
            event.currentTarget.reset();
            setVersion((value) => value + 1);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Address could not be saved",
            );
          }
        }}
      >
        <div className="panel-head">
          <div>
            <h2>Add delivery address</h2>
            <p>Used only for checkout and delivery</p>
          </div>
        </div>
        <div className="form-row">
          <label>
            Label
            <input name="label" placeholder="Home" required />
          </label>
          <label>
            PIN code
            <input name="postalCode" pattern="[0-9]{6}" required />
          </label>
        </div>
        <label>
          Street address
          <input name="line1" required />
        </label>
        <div className="form-row">
          <label>
            City
            <input name="city" required />
          </label>
          <label>
            State
            <input name="state" required />
          </label>
        </div>
        <label className="check">
          <input name="isDefault" type="checkbox" /> Make default
        </label>
        <button className="primary">Save address</button>
      </form>
      <Records
        key={version}
        endpoint="/api/v1/account/addresses"
        empty="No saved addresses"
      />
    </>
  );
}

function Support() {
  const [version, setVersion] = useState(0);
  return (
    <>
      <form
        className="panel form-panel"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          try {
            await commerceApi("/api/v1/account/support", {
              method: "POST",
              body: JSON.stringify({
                subject: data.get("subject"),
                message: data.get("message"),
                priority: "NORMAL",
              }),
            });
            toast.success("Support ticket created");
            event.currentTarget.reset();
            setVersion((value) => value + 1);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Ticket could not be created",
            );
          }
        }}
      >
        <div className="panel-head">
          <div>
            <h2>Contact care team</h2>
            <p>We keep the complete conversation history</p>
          </div>
        </div>
        <label>
          Subject
          <input name="subject" required />
        </label>
        <label>
          How can we help?
          <textarea name="message" required />
        </label>
        <button className="primary">Create ticket</button>
      </form>
      <Records
        key={version}
        endpoint="/api/v1/account/support"
        empty="No support tickets"
      />
    </>
  );
}

function ProfileSettings() {
  const [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false);
  const removeAccount = async () => {
    setBusy(true);
    try {
      const result = await commerceApi<{
        deleted: boolean;
        retainedOrders: number;
      }>("/api/v1/account", {
        method: "DELETE",
        body: JSON.stringify({ confirmation }),
      });
      sessionStorage.removeItem("commerce_access_token");
      toast.success(
        `Account deleted. ${result.retainedOrders} anonymized order record${result.retainedOrders === 1 ? "" : "s"} retained by the store.`,
      );
      window.setTimeout(() => {
        window.location.href = "/";
      }, 900);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Account could not be deleted",
      );
      setBusy(false);
    }
  };
  return (
    <section className="panel form-panel account-danger">
      <div className="panel-head">
        <div>
          <h2>Delete your account</h2>
          <p>
            Permanently removes your profile, login, addresses, wishlist and
            customer-facing history.
          </p>
        </div>
      </div>
      <div className="deletion-notice">
        <strong>What the store retains</strong>
        <p>
          Orders, payment totals, refunds and fulfilment records remain
          available to the store owner for accounting and legal operations. They
          are disconnected from your account and delivery/contact details are
          redacted.
        </p>
      </div>
      <label>
        Type DELETE to confirm
        <input
          value={confirmation}
          onChange={(event) =>
            setConfirmation(event.target.value.toUpperCase())
          }
          autoComplete="off"
        />
      </label>
      <button
        className="danger-action"
        disabled={busy || confirmation !== "DELETE"}
        onClick={removeAccount}
      >
        {busy ? "Deleting permanently…" : "Delete account permanently"}
      </button>
    </section>
  );
}

function Overview() {
  return (
    <>
      <div className="customer-hero">
        <div>
          <p className="portal-eyebrow">Aster circle</p>
          <h2>Your account, in one place</h2>
          <p>
            Orders, returns, saved pieces and support stay synchronized
            securely.
          </p>
          <div>
            <i style={{ width: "64%" }} />
          </div>
          <span>Member</span>
          <span>Next reward</span>
        </div>
        <Gift />
      </div>
      <div className="customer-stats">
        {[
          [<Package />, "Live", "Order tracking"],
          [<Heart />, "Saved", "Wishlist"],
          [<Wallet />, money(0), "Store credit"],
          [<LifeBuoy />, "Fast", "Customer care"],
        ].map(([icon, value, label]) => (
          <article className="panel" key={String(label)}>
            {icon}
            <div>
              <b>{value}</b>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </div>
      <Records
        endpoint="/api/v1/account/orders"
        empty="You have not placed an order yet"
        invoices
      />
    </>
  );
}

export function CustomerPortal() {
  const [active, setActive] = useState("My overview");
  const [account, setAccount] = useState<AccountUser | null>(null);
  useEffect(() => {
    const syncTab = () => {
      const requested = new URLSearchParams(window.location.search).get("tab");
      setActive(
        requested && accountTabs.has(requested) ? requested : "My overview",
      );
    };
    syncTab();
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, []);
  useEffect(() => {
    commerceApi<AccountUser>("/api/v1/auth/me")
      .then((user) => {
        if (user.role !== "CUSTOMER") {
          window.location.href = "/admin";
          return;
        }
        setAccount(user);
      })
      .catch(() => undefined);
  }, []);
  const content =
    active === "My overview" ? (
      <Overview />
    ) : active === "My orders" ? (
      <Records
        endpoint="/api/v1/account/orders"
        empty="No orders yet"
        invoices
      />
    ) : active === "Wishlist" ? (
      <Records endpoint="/api/v1/wishlist" empty="Your wishlist is empty" />
    ) : active === "Addresses" ? (
      <Addresses />
    ) : active === "Payments" ? (
      <PaymentsPanel />
    ) : active === "Reviews" ? (
      <ReviewsPanel />
    ) : active === "Returns" ? (
      <Records endpoint="/api/v1/account/returns" empty="No return requests" />
    ) : active === "Support" ? (
      <Support />
    ) : active === "Profile settings" ? (
      <ProfileSettings />
    ) : (
      <section className="panel module-empty">
        <h3>{active}</h3>
        <p>
          This section is ready for your account data and configured providers.
        </p>
      </section>
    );
  return (
    <>
      <Toaster richColors />
      <PortalShell
        title={active}
        subtitle="Track orders, manage your details and get help."
        nav={nav}
        active={active}
        onNavigate={setActive}
        portalPath="/account"
        userName={account?.name || "Customer"}
        userRole={account?.email || "Customer account"}
      >
        {content}
      </PortalShell>
    </>
  );
}
