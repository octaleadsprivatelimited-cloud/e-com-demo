import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Gift,
  Heart,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  ShieldCheck,
  Smartphone,
  Star,
  Wallet,
} from "lucide-react";
import { PortalShell } from "./PortalShell";
import {
  commerceApi,
  CommerceApiError,
  commerceDownload,
  type ApiProduct,
} from "@/lib/commerce-api";
import { loadGoogleIdentity } from "@/lib/google-identity";
import { money } from "@/data/commerce";
import { toast, Toaster } from "sonner";
import { CustomerReturnsWorkspace } from "./customer-service/CustomerReturnsWorkspace";
import { CustomerSupportWorkspace } from "./customer-service/CustomerSupportWorkspace";

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
type AccountAuthMethods = {
  password: boolean;
  mobileOtp: { available: boolean };
  google: { linked: boolean; enabled: boolean; clientId: string };
};
type DeletionCredential =
  | { password: string }
  | { googleCredential: string }
  | { mobileOtp: string };
type DeletionMethod = "password" | "google" | "mobileOtp";
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

function customerAuthError(error: unknown, fallback: string) {
  if (!(error instanceof CommerceApiError))
    return error instanceof Error ? error.message : fallback;
  switch (error.code) {
    case "INVALID_CREDENTIALS":
    case "INVALID_CURRENT_PASSWORD":
      return "Your current password is incorrect.";
    case "INVALID_GOOGLE_TOKEN":
      return "Google could not verify this account. Choose the same Google account and try again.";
    case "GOOGLE_EMAIL_MISMATCH":
      return "Choose the Google account that uses the same email as this customer account.";
    case "GOOGLE_ALREADY_LINKED":
    case "GOOGLE_ACCOUNT_ALREADY_LINKED":
      return "A Google account is already connected.";
    case "GOOGLE_IDENTITY_IN_USE":
      return "This Google account is already connected to another customer account.";
    case "GOOGLE_AUTH_NOT_CONFIGURED":
      return "Google connection is not available for this store right now.";
    case "INVALID_OTP":
      return "That mobile OTP is incorrect. Check the code and try again.";
    case "OTP_EXPIRED":
      return "That mobile OTP has expired. Request a new code to continue.";
    case "OTP_ATTEMPTS_EXCEEDED":
      return "Too many incorrect OTP attempts. Request a new code to continue.";
    case "OTP_RESEND_TOO_SOON":
      return "Please wait before requesting another mobile OTP.";
    case "OTP_DELIVERY_FAILED":
      return "The mobile OTP could not be delivered. Try again shortly.";
    case "OTP_NOT_REQUESTED":
      return "Request a new mobile OTP before trying to continue.";
    case "MOBILE_NOT_LINKED":
      return "No verified mobile number is linked to this account.";
    case "MOBILE_OTP_UNAVAILABLE":
      return "Mobile OTP verification is unavailable right now.";
    case "REAUTHENTICATION_REQUIRED":
      return "Your identity could not be confirmed. Check the selected verification method and try again.";
    case "RATE_LIMITED":
      return "Too many attempts. Wait a minute and try again.";
    default:
      return error.message || fallback;
  }
}

function GoogleCredentialButton({
  clientId,
  disabled,
  onCredential,
}: {
  clientId: string;
  disabled: boolean;
  onCredential: (credential: string) => Promise<void>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const disabledRef = useRef(disabled);
  const running = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<
    "loading" | "ready" | "authenticating" | "unavailable" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  callback.current = onCredential;
  disabledRef.current = disabled;

  useEffect(() => {
    if (container.current) container.current.inert = disabled;
  }, [disabled]);

  useEffect(() => {
    let cancelled = false;
    const element = container.current;
    if (!element || !clientId) {
      setStatus("unavailable");
      setMessage("Google verification is unavailable right now.");
      return;
    }

    setStatus("loading");
    setMessage("");
    loadGoogleIdentity()
      .then((identity) => {
        if (cancelled || !container.current) return;
        const target = container.current;
        target.replaceChildren();
        identity.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          ux_mode: "popup",
          callback: async (response) => {
            if (cancelled || disabledRef.current || running.current) return;
            if (!response.credential) {
              const error =
                "Google did not return a verification credential. Try again.";
              setStatus("error");
              setMessage(error);
              toast.error(error);
              return;
            }
            running.current = true;
            setStatus("authenticating");
            setMessage("");
            try {
              await callback.current(response.credential);
              if (!cancelled) setStatus("ready");
            } catch {
              if (!cancelled) setStatus("ready");
            } finally {
              running.current = false;
            }
          },
        });
        identity.accounts.id.renderButton(target, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: Math.min(
            320,
            Math.max(220, Math.floor(target.getBoundingClientRect().width)),
          ),
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("unavailable");
        setMessage(
          "Google verification could not load. Check your connection and retry.",
        );
        toast.error("Google verification could not load", {
          description: "Check your connection and retry.",
        });
      });

    return () => {
      cancelled = true;
      if (container.current === element) element.replaceChildren();
    };
  }, [attempt, clientId]);

  return (
    <div
      className={`account-google-control is-${status}`}
      aria-busy={status === "loading" || status === "authenticating"}
      aria-disabled={disabled || status === "authenticating" || undefined}
    >
      <div className="account-google-slot" ref={container} />
      {status === "loading" && (
        <p className="account-auth-note" role="status">
          Loading Google verification…
        </p>
      )}
      {status === "authenticating" && (
        <p className="account-auth-note" role="status">
          Verifying your Google account…
        </p>
      )}
      {message && (
        <p className="account-auth-error" role="alert">
          {message}
        </p>
      )}
      {status === "unavailable" && clientId && (
        <button
          type="button"
          className="account-auth-link"
          onClick={() => setAttempt((current) => current + 1)}
        >
          Retry Google verification
        </button>
      )}
    </div>
  );
}

function ProfileSettings() {
  const [authMethods, setAuthMethods] = useState<AccountAuthMethods | null>(
    null,
  );
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [methodsError, setMethodsError] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const linkPasswordRef = useRef("");
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const confirmationRef = useRef("");
  const [deletionMethod, setDeletionMethod] =
    useState<DeletionMethod>("password");
  const [deletionPassword, setDeletionPassword] = useState("");
  const [deletionOtp, setDeletionOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [otpResendIn, setOtpResendIn] = useState(0);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const deletionBusyRef = useRef(false);
  const [deletionError, setDeletionError] = useState("");

  useEffect(() => {
    let cancelled = false;
    commerceApi<AccountAuthMethods>("/api/v1/account/auth-methods")
      .then((methods) => {
        if (cancelled) return;
        setAuthMethods(methods);
        if (methods.google.linked && methods.google.clientId)
          setDeletionMethod("google");
        else if (methods.mobileOtp.available) setDeletionMethod("mobileOtp");
        else if (methods.password) setDeletionMethod("password");
      })
      .catch((error) => {
        if (cancelled) return;
        setMethodsError(
          customerAuthError(
            error,
            "Your sign-in methods could not be loaded. Refresh and try again.",
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setMethodsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!otpSent) return;
    const timer = window.setInterval(() => {
      setOtpExpiresIn((current) => Math.max(0, current - 1));
      setOtpResendIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpSent]);

  const connectGoogle = async (googleCredential: string) => {
    const currentPassword = linkPasswordRef.current;
    if (!currentPassword) {
      const message = "Enter your current password before connecting Google.";
      setLinkError(message);
      toast.error(message);
      throw new Error(message);
    }
    setLinkingGoogle(true);
    setLinkError("");
    try {
      const result = await commerceApi<{
        google: AccountAuthMethods["google"];
      }>("/api/v1/account/auth/google/link", {
        method: "POST",
        body: JSON.stringify({ currentPassword, googleCredential }),
      });
      setAuthMethods((current) =>
        current ? { ...current, google: result.google } : current,
      );
      setDeletionMethod("google");
      setLinkPassword("");
      linkPasswordRef.current = "";
      toast.success("Google sign-in connected to your account");
    } catch (error) {
      const message = customerAuthError(
        error,
        "Google could not be connected. Try again.",
      );
      setLinkError(message);
      toast.error(message);
      throw error;
    } finally {
      setLinkingGoogle(false);
    }
  };

  const removeAccount = async (credential: DeletionCredential) => {
    if (deletionBusyRef.current) return false;
    if (confirmationRef.current !== "DELETE") {
      const message = "Type DELETE before permanently deleting your account.";
      setDeletionError(message);
      toast.error(message);
      return false;
    }
    deletionBusyRef.current = true;
    setDeletionBusy(true);
    setDeletionError("");
    let deleted = false;
    try {
      const result = await commerceApi<{
        deleted: boolean;
        retainedOrders: number;
      }>("/api/v1/account", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: "DELETE", ...credential }),
      });
      deleted = true;
      sessionStorage.removeItem("commerce_access_token");
      toast.success(
        `Account deleted. ${result.retainedOrders} anonymized order record${result.retainedOrders === 1 ? "" : "s"} retained by the store.`,
      );
      window.setTimeout(() => window.location.assign("/"), 900);
      return true;
    } catch (error) {
      const message = customerAuthError(
        error,
        "Your account could not be deleted. Verify your identity and try again.",
      );
      setDeletionError(message);
      toast.error(message);
      return false;
    } finally {
      if (!deleted) {
        deletionBusyRef.current = false;
        setDeletionBusy(false);
      }
    }
  };

  const requestDeletionOtp = async () => {
    setOtpBusy(true);
    setDeletionError("");
    try {
      const result = await commerceApi<{
        expiresInSeconds: number;
        resendAfterSeconds: number;
        developmentCode?: string;
      }>("/api/v1/account/auth/mobile/request", { method: "POST" });
      setOtpSent(true);
      setDeletionOtp("");
      setOtpExpiresIn(Math.max(1, result.expiresInSeconds || 300));
      setOtpResendIn(Math.max(0, result.resendAfterSeconds || 30));
      toast.success(
        result.developmentCode
          ? `Development OTP: ${result.developmentCode}`
          : "Verification code sent to your mobile",
        { description: "The code expires in 5 minutes." },
      );
    } catch (error) {
      const message = customerAuthError(
        error,
        "The mobile OTP could not be sent. Try again.",
      );
      setDeletionError(message);
      toast.error(message);
    } finally {
      setOtpBusy(false);
    }
  };

  const deletionMethods: Array<{
    id: DeletionMethod;
    label: string;
    detail: string;
  }> = [];
  if (authMethods?.password)
    deletionMethods.push({
      id: "password",
      label: "Current password",
      detail: "Confirm using your email sign-in password.",
    });
  if (authMethods?.google.linked && authMethods.google.clientId)
    deletionMethods.push({
      id: "google",
      label: "Google",
      detail: "Verify with the connected Google account.",
    });
  if (authMethods?.mobileOtp.available)
    deletionMethods.push({
      id: "mobileOtp",
      label: "Mobile OTP",
      detail: "Receive a one-time code on your saved mobile.",
    });

  return (
    <div className="account-settings-stack">
      <section className="panel form-panel account-security">
        <div className="panel-head">
          <div>
            <h2>Sign-in methods</h2>
            <p>Review and secure the ways you access this account.</p>
          </div>
        </div>
        {methodsLoading ? (
          <p className="account-auth-loading" role="status">
            Loading your sign-in methods…
          </p>
        ) : methodsError ? (
          <p className="account-auth-error" role="alert">
            {methodsError}
          </p>
        ) : authMethods ? (
          <>
            <div className="account-auth-methods">
              <article>
                <KeyRound />
                <span>
                  <strong>Email &amp; password</strong>
                  <small>
                    {authMethods.password
                      ? "Available for sign-in and identity checks."
                      : "No customer-managed password is available."}
                  </small>
                </span>
                <em className={authMethods.password ? "is-on" : "is-off"}>
                  {authMethods.password ? "Available" : "Unavailable"}
                </em>
              </article>
              <article>
                <Smartphone />
                <span>
                  <strong>Mobile OTP</strong>
                  <small>
                    {authMethods.mobileOtp.available
                      ? "Codes are sent to your saved mobile number."
                      : "Add a verified mobile number to use OTP."}
                  </small>
                </span>
                <em
                  className={
                    authMethods.mobileOtp.available ? "is-on" : "is-off"
                  }
                >
                  {authMethods.mobileOtp.available ? "Available" : "Unavailable"}
                </em>
              </article>
              <article>
                <span className="account-google-mark" aria-hidden="true">
                  G
                </span>
                <span>
                  <strong>Google</strong>
                  <small>
                    {authMethods.google.linked
                      ? authMethods.google.enabled
                        ? "Connected and available for customer sign-in."
                        : "Connected; Google sign-in is currently paused by the store."
                      : authMethods.google.enabled
                        ? "Connect the Google account with the same email."
                        : "Google sign-in is not enabled for this store."}
                  </small>
                </span>
                <em
                  className={authMethods.google.linked ? "is-on" : "is-off"}
                >
                  {authMethods.google.linked ? "Connected" : "Not connected"}
                </em>
              </article>
            </div>
            {!authMethods.google.linked &&
              authMethods.google.enabled &&
              authMethods.password && (
                <div className="account-google-link">
                  <label htmlFor="google-link-password">
                    Current password
                    <input
                      id="google-link-password"
                      type="password"
                      autoComplete="current-password"
                      value={linkPassword}
                      aria-invalid={Boolean(linkError)}
                      aria-describedby={
                        linkError ? "google-link-error" : "google-link-help"
                      }
                      onChange={(event) => {
                        setLinkPassword(event.target.value);
                        linkPasswordRef.current = event.target.value;
                        setLinkError("");
                      }}
                    />
                  </label>
                  <p className="account-auth-note" id="google-link-help">
                    Enter your password, then choose the Google account with the
                    same email address.
                  </p>
                  <GoogleCredentialButton
                    clientId={authMethods.google.clientId}
                    disabled={!linkPassword || linkingGoogle}
                    onCredential={connectGoogle}
                  />
                  {linkError && (
                    <p
                      className="account-auth-error"
                      id="google-link-error"
                      role="alert"
                    >
                      {linkError}
                    </p>
                  )}
                </div>
              )}
            {!authMethods.google.linked &&
              authMethods.google.enabled &&
              !authMethods.password && (
                <p className="account-auth-note account-auth-standalone">
                  Google connection requires an account with an email password.
                </p>
              )}
          </>
        ) : null}
      </section>

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
            available to the store owner for accounting and legal operations.
            They are disconnected from your account and delivery/contact details
            are redacted.
          </p>
        </div>
        {authMethods && deletionMethods.length > 0 && (
          <fieldset className="account-reauth-methods">
            <legend>Verify your identity with</legend>
            <div>
              {deletionMethods.map((method) => (
                <label key={method.id}>
                  <input
                    type="radio"
                    name="deletionMethod"
                    value={method.id}
                    checked={deletionMethod === method.id}
                    disabled={deletionBusy}
                    onChange={() => {
                      setDeletionMethod(method.id);
                      setDeletionError("");
                    }}
                  />
                  <span>
                    <strong>{method.label}</strong>
                    <small>{method.detail}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label>
          Type DELETE to confirm
          <input
            value={confirmation}
            onChange={(event) => {
              const value = event.target.value.toUpperCase();
              setConfirmation(value);
              confirmationRef.current = value;
              setDeletionError("");
            }}
            aria-invalid={Boolean(deletionError)}
            aria-describedby={deletionError ? "account-delete-error" : undefined}
            autoComplete="off"
          />
        </label>

        {deletionMethod === "password" && authMethods?.password && (
          <>
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                value={deletionPassword}
                disabled={deletionBusy}
                aria-invalid={Boolean(deletionError)}
                aria-describedby={
                  deletionError ? "account-delete-error" : undefined
                }
                onChange={(event) => {
                  setDeletionPassword(event.target.value);
                  setDeletionError("");
                }}
              />
            </label>
            <button
              type="button"
              className="danger-action"
              disabled={
                deletionBusy ||
                confirmation !== "DELETE" ||
                !deletionPassword
              }
              onClick={() => void removeAccount({ password: deletionPassword })}
            >
              {deletionBusy
                ? "Deleting permanently…"
                : "Delete account permanently"}
            </button>
          </>
        )}

        {deletionMethod === "google" && authMethods?.google.linked && (
          <div className="account-delete-google">
            <p className="account-auth-note">
              Type DELETE above, then verify using the connected Google account.
            </p>
            <GoogleCredentialButton
              clientId={authMethods.google.clientId}
              disabled={confirmation !== "DELETE" || deletionBusy}
              onCredential={async (googleCredential) => {
                const removed = await removeAccount({ googleCredential });
                if (!removed) throw new Error("Account deletion was not completed.");
              }}
            />
          </div>
        )}

        {deletionMethod === "mobileOtp" &&
          authMethods?.mobileOtp.available && (
            <div className="account-delete-otp">
              <div>
                <button
                  type="button"
                  className="secondary"
                  disabled={otpBusy || deletionBusy || otpResendIn > 0}
                  onClick={() => void requestDeletionOtp()}
                >
                  {otpBusy
                    ? "Sending…"
                    : otpResendIn > 0
                      ? `Resend in ${otpResendIn}s`
                      : otpSent
                        ? "Resend mobile OTP"
                        : "Send mobile OTP"}
                </button>
                {otpSent && (
                  <span className="account-auth-note" role="status">
                    {otpExpiresIn > 0
                      ? `Code expires in ${Math.floor(otpExpiresIn / 60)}:${String(otpExpiresIn % 60).padStart(2, "0")}`
                      : "Code expired. Request a new OTP."}
                  </span>
                )}
              </div>
              {otpSent && (
                <label>
                  Mobile OTP
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={deletionOtp}
                    disabled={deletionBusy}
                    aria-invalid={Boolean(deletionError)}
                    aria-describedby={
                      deletionError ? "account-delete-error" : undefined
                    }
                    onChange={(event) => {
                      setDeletionOtp(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      );
                      setDeletionError("");
                    }}
                  />
                </label>
              )}
              <button
                type="button"
                className="danger-action"
                disabled={
                  deletionBusy ||
                  confirmation !== "DELETE" ||
                  !otpSent ||
                  otpExpiresIn === 0 ||
                  !/^\d{6}$/.test(deletionOtp)
                }
                onClick={() => void removeAccount({ mobileOtp: deletionOtp })}
              >
                {deletionBusy
                  ? "Deleting permanently…"
                  : "Verify OTP & delete account"}
              </button>
            </div>
          )}

        {!methodsLoading && !methodsError && deletionMethods.length === 0 && (
          <p className="account-auth-error" role="alert">
            No identity verification method is currently available. Contact
            store support before deleting your account.
          </p>
        )}
        {deletionError && (
          <p className="account-auth-error" id="account-delete-error" role="alert">
            {deletionError}
          </p>
        )}
      </section>
    </div>
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
      <CustomerReturnsWorkspace />
    ) : active === "Support" ? (
      <CustomerSupportWorkspace />
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
