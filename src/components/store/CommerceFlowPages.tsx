import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  LockKeyhole,
  MapPin,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { money } from "@/data/commerce";
import { useCommerceCart } from "@/lib/commerce-cart";
import { commerceApi, CommerceApiError, saveAccessToken } from "@/lib/commerce-api";
import { loadGoogleIdentity } from "@/lib/google-identity";
import { StoreBrand, useStorefrontConfig } from "@/lib/storefront-config";
import { StorePage } from "./StoreHeader";
import { toast, Toaster } from "sonner";

type AppliedCoupon={code:string;discount:number;freeShipping:boolean};
type DeliveryRate = {
  service: string;
  label: string;
  etaDays: number;
  baseAmount: number;
  shipping: number;
  currency: string;
  total: number;
};
type CheckoutQuote = {
  provider: string;
  rates: DeliveryRate[];
  selectedShipping: {
    service: string;
    label: string;
    etaDays: number;
    quotedAmount: number;
    chargedAmount: number;
    currency: string;
  };
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  total: number;
  currency: string;
  freeShipping: boolean;
};
type PendingPayment = {
  orderNumber: string;
  total: number;
  etaDays: number;
  message: string;
};
const newCheckoutKey = () =>
  typeof window === "undefined"
    ? crypto.randomUUID()
    : sessionStorage.getItem("commerce_checkout_key") || crypto.randomUUID();
function useCoupon(subtotal:number){const [input,setInput]=useState(""),[applied,setApplied]=useState<AppliedCoupon|null>(null),[busy,setBusy]=useState(false);const apply=async(code=input)=>{const normalized=code.trim().toUpperCase();if(!normalized){toast.error("Enter a coupon code");return}setBusy(true);try{const result=await commerceApi<AppliedCoupon>("/api/v1/coupons/validate",{method:"POST",body:JSON.stringify({code:normalized,subtotal})});setApplied(result);setInput(result.code);sessionStorage.setItem("commerce_coupon",result.code);toast.success(`${result.code} applied`)}catch(error){setApplied(null);sessionStorage.removeItem("commerce_coupon");toast.error(error instanceof Error?error.message:"Coupon could not be applied")}finally{setBusy(false)}};const remove=()=>{setApplied(null);setInput("");sessionStorage.removeItem("commerce_coupon")};useEffect(()=>{const saved=sessionStorage.getItem("commerce_coupon");if(saved&&subtotal>0)void apply(saved)},[subtotal]);return{input,setInput,applied,busy,apply,remove}}
export function CartPage() {
  const cart = useCommerceCart();
  const storefront = useStorefrontConfig();
  const coupon = useCoupon(cart.subtotal);
  const qualifiesForFreeShipping =
    coupon.applied?.freeShipping ||
    (storefront.freeShippingThreshold > 0 &&
      cart.subtotal >= storefront.freeShippingThreshold);
  const estimatedTotal = Math.max(
    0,
    cart.subtotal - (coupon.applied?.discount || 0),
  );
  return (
    <StorePage>
      <main className="cart-page">
        <div className="flow-title">
          <p className="eyebrow">Your selection</p>
          <h1>Shopping bag</h1>
          <span>
            {cart.count} {cart.count === 1 ? "item" : "items"}
          </span>
        </div>
        {!cart.lines.length ? (
          <div className="empty-cart">
            <ShoppingBag />
            <h2>Your bag is waiting.</h2>
            <p>Explore lasting pieces for everyday life.</p>
            <a href="/shop">
              Discover the collection <ArrowRight />
            </a>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-page-lines">
              {cart.lines.map(
                ({ product, entry, index, variant, unitPrice, available, unresolved }) => (
                <article key={index}>
                  <div
                    className="line-art"
                    style={{ background: product.tone }}
                  >
                    {variant?.image || product.image ? (
                      <img
                        src={variant?.image || product.image}
                        alt={variant?.imageAlt || product.imageAlt || product.name}
                      />
                    ) : (
                      product.glyph
                    )}
                  </div>
                  <div>
                    <small>{product.category}</small>
                    <h2>{product.name}</h2>
                    {variant && (
                      <p>
                        {variant.title || Object.entries(variant.options)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                    {unresolved && (
                      <p role="alert">This option changed. Remove it and select an available option again.</p>
                    )}
                    <button onClick={() => cart.update(index, 0)}>
                      Remove
                    </button>
                  </div>
                  <div className="line-qty">
                    <button
                      onClick={() => cart.update(index, entry.quantity - 1)}
                    >
                      <Minus />
                    </button>
                    <span>{entry.quantity}</span>
                    <button
                      onClick={() => cart.update(index, entry.quantity + 1)}
                      disabled={unresolved || entry.quantity >= available}
                      aria-label={`Increase ${product.name} quantity`}
                    >
                      <Plus />
                    </button>
                  </div>
                  <strong>{money(unitPrice * entry.quantity)}</strong>
                </article>
                ),
              )}
            </section>
            <aside className="order-summary">
              <h2>Order summary</h2>
              <div>
                <span>Subtotal</span>
                <b>{money(cart.subtotal)}</b>
              </div>
              <div>
                <span>Shipping</span>
                <b>
                  {qualifiesForFreeShipping
                    ? "Complimentary"
                    : "Calculated at checkout"}
                </b>
              </div>
              <div>
                <span>Estimated GST</span>
                <b>Calculated at checkout</b>
              </div>
              {coupon.applied&&<div className="coupon-saving"><span>Coupon {coupon.applied.code}</span><b>−{money(coupon.applied.discount)}</b></div>}
              <hr />
              <div className="summary-total">
                <span>Estimated total</span>
                <b>{money(estimatedTotal)}</b>
              </div>
              <label>
                <input placeholder="Coupon code" value={coupon.input} onChange={event=>coupon.setInput(event.target.value.toUpperCase())} disabled={coupon.busy}/>
                <button onClick={()=>coupon.applied?coupon.remove():void coupon.apply()} disabled={coupon.busy}>{coupon.busy?"Checking…":coupon.applied?"Remove":"Apply"}</button>
              </label>
              <a href="/checkout">
                Proceed to checkout <ArrowRight />
              </a>
              <p>
                <LockKeyhole /> Secure and encrypted checkout
              </p>
            </aside>
          </div>
        )}
      </main>
      <Toaster richColors />
    </StorePage>
  );
}

export function CheckoutPage() {
  const cart = useCommerceCart();
  const storefront = useStorefrontConfig();
  const coupon = useCoupon(cart.subtotal);
  const checkoutKey = useRef(newCheckoutKey());
  const quotedCoupon = useRef<string | undefined>(undefined);
  const [step, setStep] = useState(1),
    [placed, setPlaced] = useState(false),
    [orderNumber, setOrderNumber] = useState(""),
    [confirmedTotal, setConfirmedTotal] = useState(0),
    [estimatedDelivery, setEstimatedDelivery] = useState(""),
    [postalCode, setPostalCode] = useState(""),
    [gstin,setGstin]=useState(""),
    [contact, setContact] = useState({ name: "Ananya Sharma", email: "ananya@example.com", phone: "" }),
    [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "Telangana", country: "IN" }),
    [paymentProvider, setPaymentProvider] = useState("razorpay"),
    [selectedService, setSelectedService] = useState(""),
    [quote, setQuote] = useState<CheckoutQuote | null>(null),
    [quoteBusy, setQuoteBusy] = useState(false),
    [quoteError, setQuoteError] = useState(""),
    [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null),
    [paymentSubmitted, setPaymentSubmitted] = useState<PendingPayment | null>(null),
    [busy, setBusy] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("commerce_checkout_key", checkoutKey.current);
  }, []);

  const checkoutLines = () =>
    cart.lines.map(({ product, entry, variant, available, unresolved }) => {
      if (unresolved || !variant)
        throw new Error(
          `${product.name} has changed. Remove it from your bag and select an available option again.`,
        );
      if (entry.quantity > available)
        throw new Error(
          `Only ${available} of ${product.name} (${variant.title || Object.values(variant.options).join(" / ")}) is available.`,
        );
      return { variantId: variant.id, quantity: entry.quantity };
    });

  const requestQuote = async (
    provider = paymentProvider,
    service = selectedService,
    showError = true,
  ) => {
    setQuoteBusy(true);
    setQuoteError("");
    try {
      const body = {
        lines: checkoutLines(),
        postalCode,
        paymentProvider: provider,
        couponCode: coupon.applied?.code,
        shippingService: service || undefined,
      };
      let nextQuote: CheckoutQuote;
      try {
        nextQuote = await commerceApi<CheckoutQuote>("/api/v1/checkout/quote", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch (error) {
        if (
          service &&
          error instanceof CommerceApiError &&
          error.code === "SHIPPING_SERVICE_UNAVAILABLE"
        ) {
          nextQuote = await commerceApi<CheckoutQuote>(
            "/api/v1/checkout/quote",
            {
              method: "POST",
              body: JSON.stringify({ ...body, shippingService: undefined }),
            },
          );
        } else {
          throw error;
        }
      }
      setQuote(nextQuote);
      setSelectedService(nextQuote.selectedShipping.service);
      quotedCoupon.current = coupon.applied?.code;
      return nextQuote;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Delivery rates could not be calculated";
      setQuote(null);
      setQuoteError(message);
      if (showError) toast.error(message);
      return null;
    } finally {
      setQuoteBusy(false);
    }
  };

  const validateDeliveryDetails = () => {
    if (!/^\d{6}$/.test(postalCode)) {
      toast.error("Enter a valid 6-digit PIN code");
      return false;
    }
    if (
      !contact.name.trim() ||
      !/^\S+@\S+\.\S+$/.test(contact.email) ||
      !/^\+?[1-9]\d{7,14}$/.test(contact.phone) ||
      !address.line1.trim() ||
      !address.city.trim()
    ) {
      toast.error("Complete your contact and delivery address");
      return false;
    }
    return true;
  };

  const continueToDelivery = async () => {
    if (!validateDeliveryDetails()) return;
    if (await requestQuote(paymentProvider, "")) setStep(2);
  };

  const chooseDelivery = async (service: string) => {
    setSelectedService(service);
    await requestQuote(paymentProvider, service);
  };

  const choosePayment = async (provider: string) => {
    setPaymentProvider(provider);
    await requestQuote(provider, selectedService);
  };

  useEffect(() => {
    if (
      step >= 2 &&
      quote &&
      quotedCoupon.current !== coupon.applied?.code
    )
      void requestQuote(paymentProvider, selectedService);
  }, [coupon.applied?.code]);

  const subtotal = quote?.subtotal ?? cart.subtotal,
    tax = quote?.tax ?? 0,
    discount = quote?.discount ?? coupon.applied?.discount ?? 0,
    shipping = quote?.shipping,
    total = quote?.total ?? Math.max(0, subtotal - discount);
  const completeOrder = (number: string, orderTotal: number, etaDays: number) => {
    setOrderNumber(number);
    setConfirmedTotal(orderTotal);
    setEstimatedDelivery(
      new Date(Date.now() + etaDays * 86_400_000).toLocaleDateString(
        storefront.locale,
        { day: "numeric", month: "long", year: "numeric" },
      ),
    );
    setPendingPayment(null);
    setPaymentSubmitted(null);
    cart.clear();
    setPlaced(true);
  };
  const openRazorpay = async (payment: { externalId: string; clientToken?: string }, number: string) => {
    if (!(window as any).Razorpay) await new Promise<void>((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("Secure payment window could not be loaded")); document.head.appendChild(script); });
    const record=async(type:"CANCELLED"|"FAILED",details:Record<string,unknown>={})=>{try{await commerceApi("/api/v1/payments/client-events",{method:"POST",body:JSON.stringify({orderNumber:number,providerOrderId:payment.externalId,type,...details})})}catch{/* Gateway webhook reconciliation remains authoritative. */}};
    await new Promise<void>((resolve, reject) => {
      const checkout = new (window as any).Razorpay({ key: payment.clientToken, order_id: payment.externalId, name: storefront.storeName, description: `Order ${number}`, prefill: { name: contact.name, email: contact.email, contact: contact.phone }, handler: () => resolve(), modal: { ondismiss: () => {void record("CANCELLED");reject(new Error("Payment was cancelled. Your order is saved and can be paid again."))} }, theme: { color: storefront.primaryColor } });
      checkout.on("payment.failed", (response:any) => {const error=response?.error||{};void record("FAILED",{gatewayPaymentId:error.metadata?.payment_id,errorCode:error.code,errorDescription:error.description});reject(new Error(error.description||"Payment was declined. Try another method or retry from your account."))});
      checkout.open();
    });
  };
  const placeOrder = async () => {
    if (!validateDeliveryDetails()) {
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      const latestQuote = await requestQuote(
        paymentProvider,
        selectedService,
        false,
      );
      if (!latestQuote)
        throw new Error(
          quoteError || "Please refresh the delivery quote before paying",
        );
      const result = await commerceApi<{ order: { number: string; total: number }; payment: { externalId: string; clientToken?: string } | null; shipping?: { etaDays: number }; paymentFailure?:{message:string;fallbackOptions:string[]} }>(
        "/api/v1/checkout",
        {
          method: "POST",
          headers: { "idempotency-key": checkoutKey.current },
          body: JSON.stringify({ lines: checkoutLines(), postalCode, paymentProvider, shippingService: latestQuote.selectedShipping.service, contact, shippingAddress: address, couponCode: coupon.applied?.code, gstin:gstin||undefined }),
        },
      );
      setOrderNumber(result.order.number);
      const etaDays = result.shipping?.etaDays ?? latestQuote.selectedShipping.etaDays;
      sessionStorage.removeItem("commerce_checkout_key");
      // The server has reserved inventory and created the order. Keeping these
      // lines in the bag would let the customer accidentally order them twice.
      cart.clear();
      if (result.paymentFailure) {
        const message =
          "The selected payment gateway is temporarily unavailable. Your saved order can be retried safely below.";
        setPendingPayment({
          orderNumber: result.order.number,
          total: result.order.total,
          etaDays,
          message,
        });
        toast.error(message);
        return;
      }
      if (paymentProvider !== "cod") {
        if (!result.payment) {
          setPendingPayment({
            orderNumber: result.order.number,
            total: result.order.total,
            etaDays,
            message:
              "The payment attempt could not be opened. Your order is saved and can be retried safely below.",
          });
          return;
        }
        try {
          await openRazorpay(result.payment, result.order.number);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "The payment attempt could not be completed.";
          setPendingPayment({
            orderNumber: result.order.number,
            total: result.order.total,
            etaDays,
            message,
          });
          toast.error(message);
          return;
        }
        setPaymentSubmitted({
          orderNumber: result.order.number,
          total: result.order.total,
          etaDays,
          message:
            "Your payment was submitted and is awaiting secure gateway confirmation.",
        });
        return;
      }
      completeOrder(result.order.number, result.order.total, etaDays);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Checkout could not be completed",
      );
    } finally {
      setBusy(false);
    }
  };
  const retryPayment = async () => {
    if (!pendingPayment) return;
    setBusy(true);
    try {
      const result = await commerceApi<{
        order: { number: string; status: string };
        payment: { externalId: string; clientToken?: string };
      }>("/api/v1/payments/retry", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: pendingPayment.orderNumber,
          provider: "razorpay",
          contact: contact.email,
        }),
      });
      await openRazorpay(result.payment, result.order.number);
      setPendingPayment(null);
      setPaymentSubmitted({
        ...pendingPayment,
        orderNumber: result.order.number,
        message:
          "Your payment was submitted and is awaiting secure gateway confirmation.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The payment retry could not be completed",
      );
    } finally {
      setBusy(false);
    }
  };
  if (placed)
    return (
      <StorePage>
        <main className="confirmation">
          <div>
            <Check />
            <p className="eyebrow">Order confirmed</p>
            <h1>Thank you, {contact.name.split(" ")[0] || "there"}.</h1>
            <p>
              Your order <b>#{orderNumber}</b> has been received. We’ll send
              delivery updates to your email and phone.
            </p>
            <div>
              <span>
                Order total <b>{money(confirmedTotal)}</b>
              </span>
              <span>
                Estimated delivery <b>{estimatedDelivery}</b>
              </span>
            </div>
            <a href="/track">
              Track your order <ArrowRight />
            </a>
          </div>
        </main>
      </StorePage>
    );
  if (paymentSubmitted)
    return (
      <StorePage>
        <main className="confirmation">
          <div>
            <Clock3 />
            <p className="eyebrow">Verification in progress</p>
            <h1>Payment submitted.</h1>
            <p>
              Order <b>#{paymentSubmitted.orderNumber}</b> is saved and the
              payment gateway is confirming the transaction. We will update
              the order as soon as the verified result arrives.
            </p>
            <div>
              <span>
                Submitted amount <b>{money(paymentSubmitted.total)}</b>
              </span>
              <span>
                Status <b>Pending verification</b>
              </span>
            </div>
            <a href="/track">
              Check order status <ArrowRight />
            </a>
          </div>
        </main>
      </StorePage>
    );
  if (pendingPayment)
    return (
      <StorePage>
        <Toaster richColors />
        <main className="confirmation">
          <div>
            <Clock3 />
            <p className="eyebrow">Payment pending</p>
            <h1>Your order is safely saved.</h1>
            <p>
              Order <b>#{pendingPayment.orderNumber}</b> was created, but payment
              has not completed. Retrying below adds a new payment attempt to
              this same order—it does not create a duplicate order.
            </p>
            <p role="alert">{pendingPayment.message}</p>
            <div>
              <span>
                Amount due <b>{money(pendingPayment.total)}</b>
              </span>
              <span>
                Contact <b>{contact.email}</b>
              </span>
            </div>
            <button className="continue" onClick={retryPayment} disabled={busy}>
              {busy ? "Opening secure payment…" : "Retry secure payment"}{" "}
              <LockKeyhole />
            </button>
            <a href="/track">
              Track saved order <ArrowRight />
            </a>
          </div>
        </main>
      </StorePage>
    );
  return (
    <div className="checkout-shell">
      <header>
        <StoreBrand />
        <span>
          <LockKeyhole /> Secure checkout
        </span>
      </header>
      <main>
        <section>
          <a href="/cart" className="back-link">
            <ArrowLeft /> Return to bag
          </a>
          <div className="checkout-steps">
            {["Contact", "Delivery", "Payment"].map((x, i) => (
              <button
                className={
                  step === i + 1 ? "active" : step > i + 1 ? "done" : ""
                }
                onClick={() => i + 1 < step && setStep(i + 1)}
                disabled={i + 1 > step}
                key={x}
              >
                <i>{step > i + 1 ? <Check /> : i + 1}</i>
                <span>{x}</span>
              </button>
            ))}
          </div>
          {step === 1 && (
            <div className="checkout-form">
              <p className="eyebrow">Step 1 of 3</p>
              <h1>Where should we send it?</h1>
              <label>
                Email address
                <input value={contact.email} onChange={(event) => setContact(value => ({ ...value, email: event.target.value }))} type="email" />
              </label>
              <div className="two-fields">
                <label>
                  First name
                  <input value={contact.name.split(" ")[0] || ""} onChange={(event) => setContact(value => ({ ...value, name: `${event.target.value} ${value.name.split(" ").slice(1).join(" ")}`.trim() }))} />
                </label>
                <label>
                  Last name
                  <input value={contact.name.split(" ").slice(1).join(" ")} onChange={(event) => setContact(value => ({ ...value, name: `${value.name.split(" ")[0] || ""} ${event.target.value}`.trim() }))} />
                </label>
              </div>
              <label>
                Address
                <input value={address.line1} onChange={(event) => setAddress(value => ({ ...value, line1: event.target.value }))} placeholder="House number and street" />
              </label>
              <label>
                Apartment, suite, etc. <small>(optional)</small>
                <input value={address.line2} onChange={(event) => setAddress(value => ({ ...value, line2: event.target.value }))} />
              </label>
              <div className="three-fields">
                <label>
                  City
                  <input value={address.city} onChange={(event) => setAddress(value => ({ ...value, city: event.target.value }))} />
                </label>
                <label>
                  State
                  <select value={address.state} onChange={(event) => setAddress(value => ({ ...value, state: event.target.value }))}>
                    <option>Telangana</option>
                    <option>Maharashtra</option>
                    <option>Karnataka</option>
                  </select>
                </label>
                <label>
                  PIN code
                  <input
                    inputMode="numeric"
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    maxLength={6}
                  />
                </label>
              </div>
              <label>
                Phone number
                <input type="tel" value={contact.phone} onChange={(event) => setContact(value => ({ ...value, phone: event.target.value }))} placeholder="+91…" />
              </label>
              <label>GSTIN <small>(optional, shown on invoice)</small><input value={gstin} onChange={event=>setGstin(event.target.value.toUpperCase())} maxLength={15} placeholder="22AAAAA0000A1Z5" /></label>
              <button className="continue" onClick={continueToDelivery} disabled={quoteBusy || !cart.lines.length}>
                {quoteBusy ? "Checking delivery…" : "Continue to delivery"} <ArrowRight />
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="checkout-form">
              <p className="eyebrow">Step 2 of 3</p>
              <h1>Choose your delivery.</h1>
              {quoteBusy && !quote && <p>Checking delivery services…</p>}
              {quoteError && <p role="alert">{quoteError}</p>}
              {quote?.rates.map((rate) => (
                <label className="delivery-choice" key={rate.service}>
                  <input
                    type="radio"
                    name="delivery"
                    checked={selectedService === rate.service}
                    onChange={() => void chooseDelivery(rate.service)}
                    disabled={quoteBusy}
                  />
                  <Truck />
                  <span>
                    <b>{rate.label}</b>
                    <small>
                      Estimated in {rate.etaDays}{" "}
                      {rate.etaDays === 1 ? "day" : "days"}
                    </small>
                  </span>
                  <strong>{rate.shipping ? money(rate.shipping) : "Free"}</strong>
                </label>
              ))}
              <button className="continue" onClick={() => setStep(3)} disabled={quoteBusy || !quote || !selectedService}>
                {quoteBusy ? "Updating total…" : "Continue to payment"} <ArrowRight />
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="checkout-form">
              <p className="eyebrow">Step 3 of 3</p>
              <h1>Payment.</h1>
              <div className="payment-choice">
                <label>
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentProvider === "razorpay"}
                    onChange={() => void choosePayment("razorpay")}
                    disabled={quoteBusy}
                  />
                  <span>
                    <b>Cards, UPI & Netbanking</b>
                    <small>Processed securely by Razorpay</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentProvider === "cod"}
                    onChange={() => void choosePayment("cod")}
                    disabled={quoteBusy}
                  />
                  <span>
                    <b>Cash on delivery</b>
                    <small>Available for this PIN code</small>
                  </span>
                </label>
              </div>
              <div className="payment-note">
                <ShieldCheck />
                <span>
                  <b>Your payment is protected</b>
                  <small>We never store full card or UPI credentials.</small>
                </span>
              </div>
              <button
                className="continue"
                onClick={placeOrder}
                disabled={busy || quoteBusy || !quote || !cart.lines.length}
              >
                {busy || quoteBusy
                  ? "Confirming current total…"
                  : (paymentProvider === "cod" ? "Place order " : "Pay ") +
                    money(total)}{" "}
                <LockKeyhole />
              </button>
            </div>
          )}
        </section>
        <aside>
          <h2>Your order</h2>
          {cart.lines.map(({ product, entry, variant, unitPrice }, i) => (
            <div className="checkout-line" key={i}>
              <div style={{ background: product.tone }}>
                {variant?.image || product.image ? (
                  <img
                    src={variant?.image || product.image}
                    alt={variant?.imageAlt || product.imageAlt || product.name}
                  />
                ) : (
                  product.glyph
                )}
                <i>{entry.quantity}</i>
              </div>
              <span>
                <b>{product.name}</b>
                <small>
                  {variant?.title ||
                    (variant && Object.values(variant.options).join(" / "))}
                </small>
              </span>
              <strong>{money(unitPrice * entry.quantity)}</strong>
            </div>
          ))}
          <hr />
          <p>
            <span>Subtotal</span>
            <b>{money(subtotal)}</b>
          </p>
          <p>
            <span>Shipping</span>
            <b>
              {shipping === undefined
                ? "Calculated after address"
                : shipping
                  ? money(shipping)
                  : "Free"}
            </b>
          </p>
          {quote && <p><span>GST</span><b>{money(tax)}</b></p>}
          {coupon.applied&&<p className="coupon-saving"><span>Coupon {coupon.applied.code}</span><b>−{money(discount)}</b></p>}
          <p className="checkout-total">
            <span>Total</span>
            <b>{money(total)}</b>
          </p>
        </aside>
      </main>
    </div>
  );
}

const customerEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^\+[1-9]\d{7,14}$/;
const normalizeMobile = (value: string) => value.trim().replace(/[\s()-]/g, "");
const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function finishCustomerLogin(result: { accessToken: string }) {
  if (!result.accessToken)
    throw new Error("The sign-in session could not be created.");
  saveAccessToken(result.accessToken);
  window.location.assign("/account");
}

function authErrorMessage(
  error: unknown,
  fallback: string,
): { message: string; field?: "email" | "password" | "otp" } {
  if (!(error instanceof CommerceApiError))
    return { message: error instanceof Error ? error.message : fallback };

  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return {
        message:
          "Email or password is incorrect. Check both fields and try again.",
      };
    case "EMAIL_EXISTS":
      return {
        message:
          "An account already exists for this email. Sign in instead or use another email.",
        field: "email",
      };
    case "INVALID_OTP":
      return {
        message:
          "That OTP is incorrect or has expired. Request a new code and try again.",
        field: "otp",
      };
    case "OTP_NOT_REQUESTED":
      return {
        message: "Request an OTP before entering a verification code.",
        field: "otp",
      };
    case "OTP_EXPIRED":
      return {
        message: "This OTP has expired. Request a new code to continue.",
        field: "otp",
      };
    case "OTP_ATTEMPTS_EXCEEDED":
      return {
        message:
          "Too many incorrect OTP attempts. Request a new code to continue.",
        field: "otp",
      };
    case "OTP_RESEND_TOO_SOON":
      return {
        message: "Please wait before requesting another OTP.",
        field: "otp",
      };
    case "MOBILE_OTP_UNAVAILABLE":
      return {
        message:
          "Mobile OTP is unavailable right now. Continue with email instead.",
      };
    case "INVALID_GOOGLE_TOKEN":
      return {
        message:
          "Google could not verify this sign-in. Choose your Google account and try again.",
      };
    case "GOOGLE_AUTH_UNAVAILABLE":
      return {
        message:
          "Google sign-in is temporarily unavailable. Try again or continue with email.",
      };
    case "GOOGLE_AUTH_NOT_CONFIGURED":
      return {
        message:
          "Google sign-in is not configured for this store. Continue with email instead.",
      };
    case "GOOGLE_ACCOUNT_LINK_REQUIRED":
      return {
        message:
          "An account already uses this email. Sign in with email/password, then connect Google in Profile settings.",
      };
    case "CUSTOMER_LOGIN_ONLY":
      return {
        message:
          "This account belongs to a staff member. Use the staff sign-in instead.",
      };
    case "OTP_DELIVERY_FAILED":
      return {
        message:
          "We could not deliver the OTP. Check the number or try again shortly.",
      };
    case "TWO_FACTOR_REQUIRED":
      return {
        message:
          "Enter the current 6-digit authenticator code for this staff account.",
        field: "otp",
      };
    case "ACCOUNT_DISABLED":
      return {
        message: "This account is disabled. Contact store support for help.",
      };
    case "RATE_LIMITED":
      return {
        message: "Too many attempts. Please wait a minute before trying again.",
      };
    case "VALIDATION_ERROR":
      return {
        message: "Some details are not valid. Review the highlighted fields.",
      };
    default:
      return { message: error.message || fallback };
  }
}

function CustomerQuickLogin() {
  const [mobile, setMobile] = useState("+91");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [resendRemaining, setResendRemaining] = useState(0);
  const [googleStatus, setGoogleStatus] = useState<
    "loading" | "ready" | "authenticating" | "unavailable"
  >("loading");
  const [googleMessage, setGoogleMessage] = useState(
    "Preparing secure Google sign-in…",
  );
  const [googleRetryable, setGoogleRetryable] = useState(false);
  const [googleAttempt, setGoogleAttempt] = useState(0);
  const [mobileOtpStatus, setMobileOtpStatus] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const googleButton = useRef<HTMLDivElement>(null);
  const googleSigningIn = useRef(false);

  useEffect(() => {
    let cancelled = false;

    setGoogleStatus("loading");
    setGoogleMessage("Preparing secure Google sign-in…");
    setGoogleRetryable(false);

    commerceApi<{
      google: { enabled: boolean; clientId: string };
      mobileOtp?: { enabled: boolean };
    }>("/api/v1/auth/providers")
      .then(({ google, mobileOtp }) => {
        if (cancelled) return;
        setMobileOtpStatus(
          mobileOtp?.enabled === false ? "unavailable" : "ready",
        );
        if (!google.enabled || !googleButton.current) {
          setGoogleStatus("unavailable");
          setGoogleMessage(
            "Google sign-in is not configured for this store. Use mobile OTP or email instead.",
          );
          return;
        }

        return loadGoogleIdentity()
          .then((identity) => {
            if (cancelled || !googleButton.current) return;
            const button = googleButton.current;
            button.replaceChildren();
            googleSigningIn.current = false;

            identity.accounts.id.initialize({
              client_id: google.clientId,
              auto_select: false,
              ux_mode: "popup",
              callback: async (response) => {
                if (cancelled || googleSigningIn.current) return;
                if (!response.credential) {
                  const message =
                    "Google did not return a sign-in credential. Please try again.";
                  setGoogleMessage(message);
                  toast.error(message);
                  return;
                }

                googleSigningIn.current = true;
                setGoogleStatus("authenticating");
                setGoogleMessage("Verifying your Google account…");
                const toastId = toast.loading("Signing in with Google…");
                try {
                  const result = await commerceApi<{ accessToken: string }>(
                    "/api/v1/auth/google",
                    {
                      method: "POST",
                      body: JSON.stringify({ credential: response.credential }),
                    },
                  );
                  toast.success("Google account verified", { id: toastId });
                  finishCustomerLogin(result);
                } catch (error) {
                  const notice = authErrorMessage(
                    error,
                    "Google sign-in failed. Please try again.",
                  );
                  if (!cancelled) {
                    setGoogleStatus("ready");
                    setGoogleMessage(notice.message);
                  }
                  googleSigningIn.current = false;
                  toast.error(notice.message, { id: toastId });
                }
              },
            });
            identity.accounts.id.renderButton(button, {
              type: "standard",
              theme: "outline",
              size: "large",
              width: Math.min(
                320,
                Math.max(220, Math.floor(button.getBoundingClientRect().width)),
              ),
              text: "continue_with",
              shape: "rectangular",
              logo_alignment: "left",
            });
            setGoogleMessage("");
            setGoogleStatus("ready");
          })
          .catch(() => {
            if (cancelled) return;
            const message =
              "Google sign-in could not load. Check your connection, retry, or continue with email.";
            setGoogleStatus("unavailable");
            setGoogleMessage(message);
            setGoogleRetryable(true);
            toast.error("Google sign-in could not load", {
              description: "You can retry or continue with email.",
            });
          });
      })
      .catch(() => {
        if (cancelled) return;
        const message =
          "Sign-in options could not be checked. Refresh the page or continue with email.";
        setGoogleStatus("unavailable");
        setGoogleMessage(message);
        setGoogleRetryable(true);
        setMobileOtpStatus("unavailable");
        toast.error("Sign-in options are temporarily unavailable", {
          description: "Email sign-in is still available below.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [googleAttempt]);

  useEffect(() => {
    if (!sent) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
      setResendRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sent]);

  const request = async () => {
    const normalized = normalizeMobile(mobile);
    if (!mobilePattern.test(normalized)) {
      const message =
        "Enter a valid mobile number with country code, for example +919876543210.";
      setMobileError(message);
      toast.error(message);
      return;
    }
    setMobile(normalized);
    setMobileError("");
    setCodeError("");
    setBusy(true);
    try {
      const result = await commerceApi<{
        developmentCode?: string;
        expiresInSeconds?: number;
        resendAfterSeconds?: number;
      }>("/api/v1/auth/mobile/request", {
        method: "POST",
        body: JSON.stringify({ mobile: normalized }),
      });
      setSent(true);
      setCode("");
      setSecondsRemaining(Math.max(1, result.expiresInSeconds || 300));
      setResendRemaining(Math.max(0, result.resendAfterSeconds || 30));
      toast.success(
        result.developmentCode
          ? `Development OTP: ${result.developmentCode}`
          : "Verification code sent",
        { description: "The code expires in 5 minutes." },
      );
    } catch (error) {
      const notice = authErrorMessage(error, "The code could not be sent.");
      if (
        error instanceof CommerceApiError &&
        error.code === "MOBILE_OTP_UNAVAILABLE"
      )
        setMobileOtpStatus("unavailable");
      else if (sent || notice.field === "otp") setCodeError(notice.message);
      else setMobileError(notice.message);
      toast.error(notice.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      const message = "Enter the complete 6-digit OTP.";
      setCodeError(message);
      toast.error(message);
      return;
    }
    if (secondsRemaining === 0) {
      const message = "This OTP has expired. Request a new code to continue.";
      setCodeError(message);
      toast.error(message);
      return;
    }
    setCodeError("");
    setBusy(true);
    try {
      finishCustomerLogin(
        await commerceApi<{ accessToken: string }>(
          "/api/v1/auth/mobile/verify",
          {
            method: "POST",
            body: JSON.stringify({ mobile, code }),
          },
        ),
      );
    } catch (error) {
      const notice = authErrorMessage(error, "The OTP could not be verified.");
      if (
        error instanceof CommerceApiError &&
        ["OTP_EXPIRED", "OTP_ATTEMPTS_EXCEEDED", "OTP_NOT_REQUESTED"].includes(
          error.code,
        )
      )
        setSecondsRemaining(0);
      setCodeError(notice.message);
      toast.error(notice.message);
    } finally {
      setBusy(false);
    }
  };

  const changeNumber = () => {
    setSent(false);
    setCode("");
    setCodeError("");
    setMobileError("");
    setSecondsRemaining(0);
    setResendRemaining(0);
  };

  return (
    <div className="quick-login">
      <div
        className={`google-login-shell is-${googleStatus}`}
        aria-busy={googleStatus === "loading" || googleStatus === "authenticating"}
        aria-disabled={googleStatus === "authenticating" || undefined}
      >
        <div className="google-login-slot" ref={googleButton} />
      </div>
      {googleMessage && (
        <p
          className={`auth-provider-note${googleStatus === "ready" ? " is-error" : ""}`}
          role={googleStatus === "ready" ? "alert" : "status"}
          aria-live="polite"
        >
          {googleMessage}
        </p>
      )}
      {googleRetryable && (
        <button
          type="button"
          className="google-login-retry"
          onClick={() => setGoogleAttempt((current) => current + 1)}
        >
          Retry Google sign-in
        </button>
      )}
      {mobileOtpStatus === "ready" ? (
        <>
          <div className="auth-divider">
            <span>
              {googleStatus === "ready" || googleStatus === "authenticating"
                ? "or use mobile OTP"
                : "Use mobile OTP"}
            </span>
          </div>
          <div className={`mobile-login${sent ? " sent" : ""}`}>
            <input
              aria-label="Mobile number"
              aria-invalid={Boolean(mobileError)}
              aria-describedby={mobileError ? "mobile-error" : "mobile-hint"}
              autoComplete="tel"
              inputMode="tel"
              value={mobile}
              disabled={sent || busy}
              onChange={(event) => {
                setMobile(event.target.value);
                setMobileError("");
              }}
              placeholder="+919876543210"
            />
            {sent && (
              <input
                aria-label="Verification code"
                aria-invalid={Boolean(codeError)}
                aria-describedby={codeError ? "otp-error" : "otp-status"}
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setCodeError("");
                }}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="6-digit OTP"
              />
            )}
            <button
              type="button"
              disabled={busy}
              onClick={sent ? verify : request}
            >
              {busy
                ? "Please wait…"
                : sent
                  ? "Verify & continue"
                  : "Send OTP"}
            </button>
          </div>
          {!sent && !mobileError && (
            <p className="auth-hint" id="mobile-hint">
              Include your country code. We will send a 6-digit code by SMS.
            </p>
          )}
          {mobileError && (
            <p className="auth-field-error" id="mobile-error" role="alert">
              {mobileError}
            </p>
          )}
          {sent && (
            <div className="otp-controls">
              <p
                className={
                  secondsRemaining ? "auth-hint" : "auth-field-error"
                }
                id="otp-status"
              >
                {secondsRemaining
                  ? `Code expires in ${formatCountdown(secondsRemaining)}`
                  : "Code expired. Request a new OTP."}
              </p>
              <div>
                <button
                  type="button"
                  className="otp-change"
                  onClick={changeNumber}
                >
                  Change number
                </button>
                <button
                  type="button"
                  className="otp-change"
                  disabled={busy || resendRemaining > 0}
                  onClick={request}
                >
                  {resendRemaining > 0
                    ? `Resend in ${resendRemaining}s`
                    : "Resend OTP"}
                </button>
              </div>
            </div>
          )}
          {codeError && (
            <p className="auth-field-error" id="otp-error" role="alert">
              {codeError}
            </p>
          )}
        </>
      ) : (
        <p className="auth-provider-note" role="status">
          {mobileOtpStatus === "loading"
            ? "Checking mobile OTP availability…"
            : "Mobile OTP is unavailable right now. Continue with email below."}
        </p>
      )}
    </div>
  );
}

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [busy, setBusy] = useState(false),
    [values, setValues] = useState({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      otp: "",
    }),
    [errors, setErrors] = useState<
      Partial<Record<"name" | "email" | "password" | "confirmPassword" | "otp", string>>
    >({}),
    [authNotice, setAuthNotice] = useState("");

  const updateField = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setAuthNotice("");
  };

  const switchMode = () => {
    setMode((current) => (current === "login" ? "register" : "login"));
    setErrors({});
    setAuthNotice("");
    setValues((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
      otp: "",
    }));
  };

  return (
    <StorePage>
      <Toaster richColors position="bottom-center" />
      <main className="auth-page">
        <section>
          <p className="eyebrow">Welcome to Aster & Row</p>
          <h1>
            {mode === "login"
              ? "Sign in to your account."
              : "Create your account."}
          </h1>
          <p>
            {mode === "login"
              ? "Access orders, returns, rewards and saved pieces."
              : "Join for faster checkout, order tracking and members-only rewards."}
          </p>
          {mode === "login" && <CustomerQuickLogin />}
          {mode === "login" && (
            <div className="auth-divider auth-email-divider">
              <span>or continue with email</span>
            </div>
          )}
          {authNotice && (
            <div className="auth-notice" role="alert">
              {authNotice}
            </div>
          )}
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              const nextErrors: typeof errors = {};
              const email = values.email.trim().toLowerCase();
              const name = values.name.trim();
              if (mode === "register" && name.length < 2)
                nextErrors.name = "Enter your full name using at least 2 characters.";
              if (!customerEmailPattern.test(email) || email.length > 254)
                nextErrors.email = "Enter a valid email address, such as name@example.com.";
              if (!values.password)
                nextErrors.password = "Enter your password.";
              else if (values.password.length > 128)
                nextErrors.password = "Password must contain 128 characters or fewer.";
              else if (
                mode === "register" &&
                (values.password.length < 8 ||
                  !/[a-z]/.test(values.password) ||
                  !/[A-Z]/.test(values.password) ||
                  !/\d/.test(values.password) ||
                  !/[^A-Za-z0-9]/.test(values.password))
              )
                nextErrors.password =
                  "Use 8 to 128 characters with uppercase, lowercase, a number, and a special character.";
              if (
                mode === "register" &&
                values.confirmPassword !== values.password
              )
                nextErrors.confirmPassword = "Passwords do not match.";
              if (mode === "login" && values.otp && !/^\d{6}$/.test(values.otp))
                nextErrors.otp = "Authenticator code must contain exactly 6 digits.";

              if (Object.keys(nextErrors).length) {
                setErrors(nextErrors);
                setAuthNotice("Please correct the highlighted details and try again.");
                const firstField = Object.keys(nextErrors)[0];
                const field = e.currentTarget.elements.namedItem(firstField);
                if (field instanceof HTMLElement) field.focus();
                toast.error("Please check your details", {
                  description: nextErrors[firstField as keyof typeof nextErrors],
                });
                return;
              }

              setBusy(true);
              setErrors({});
              setAuthNotice("");
              try {
                if (mode === "register")
                  await commerceApi("/api/v1/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                      name,
                      email,
                      password: values.password,
                    }),
                  });
                const result = await commerceApi<{ accessToken: string; user: { role: string } }>(
                  "/api/v1/auth/login",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      email,
                      password: values.password,
                      otp: values.otp || undefined,
                    }),
                  },
                );
                saveAccessToken(result.accessToken);
                window.location.href = result.user.role === "CUSTOMER" ? "/account" : "/admin";
              } catch (error) {
                const notice = authErrorMessage(
                  error,
                  mode === "login"
                    ? "Sign in failed. Please try again."
                    : "Your account could not be created.",
                );
                setAuthNotice(notice.message);
                if (notice.field)
                  setErrors((current) => ({
                    ...current,
                    [notice.field!]: notice.message,
                  }));
                toast.error(notice.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "register" && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  value={values.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  maxLength={100}
                />
                {errors.name && <small className="auth-field-error" id="name-error">{errors.name}</small>}
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={values.email}
                onChange={(event) => updateField("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                maxLength={254}
              />
              {errors.email && <small className="auth-field-error" id="email-error">{errors.email}</small>}
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={values.password}
                onChange={(event) => updateField("password", event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : "password-hint"}
                minLength={mode === "register" ? 8 : 1}
                maxLength={128}
              />
              {errors.password ? (
                <small className="auth-field-error" id="password-error">{errors.password}</small>
              ) : (
                <small className="auth-hint" id="password-hint">
                  {mode === "register"
                    ? "Use 8 to 128 characters with uppercase, lowercase, a number, and a special character."
                    : "Enter the password for your account."}
                </small>
              )}
            </label>
            {mode === "register" && (
              <label>
                Confirm password
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={values.confirmPassword}
                  onChange={(event) => updateField("confirmPassword", event.target.value)}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                  minLength={8}
                  maxLength={128}
                />
                {errors.confirmPassword && <small className="auth-field-error" id="confirm-password-error">{errors.confirmPassword}</small>}
              </label>
            )}
            {mode === "login" && (
              <label>
                Authenticator code <small>(staff accounts only)</small>
                <input
                  name="otp"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={values.otp}
                  onChange={(event) =>
                    updateField(
                      "otp",
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  aria-invalid={Boolean(errors.otp)}
                  aria-describedby={errors.otp ? "authenticator-error" : undefined}
                />
                {errors.otp && <small className="auth-field-error" id="authenticator-error">{errors.otp}</small>}
              </label>
            )}
            <button disabled={busy}>
              {busy
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"} <ArrowRight />
            </button>
          </form>
          <button
            className="mode-switch"
            onClick={switchMode}
          >
            {mode === "login"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </section>
        <aside>
          <span>“</span>
          <blockquote>
            Objects should earn their place in your life—through usefulness,
            beauty and time.
          </blockquote>
          <p>Aster & Row philosophy</p>
        </aside>
      </main>
    </StorePage>
  );
}

export function TrackPage() {
  const [order, setOrder] = useState("AR-10842"),
    [contact, setContact] = useState(""),
    [tracking, setTracking] = useState<{
      number: string;
      status: string;
      history: Array<{ to: string; at: string }>;
    } | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <StorePage>
      <main className="track-page">
        <section>
          <p className="eyebrow">Delivery updates</p>
          <h1>Track your order.</h1>
          <p>
            Enter your order number and email or phone number for the latest
            status.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                setTracking(
                  await commerceApi(
                    `/api/v1/orders/${encodeURIComponent(order)}/track?contact=${encodeURIComponent(contact)}`,
                  ),
                );
              } catch (error) {
                setTracking(null);
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Order was not found",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Order number
              <input
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                required
              />
            </label>
            <label>
              Email or phone
              <input value={contact} onChange={(event) => setContact(event.target.value)} required />
            </label>
            <button disabled={busy}>
              {busy ? "Checking…" : "Track order"} <ArrowRight />
            </button>
          </form>
        </section>
        {tracking && (
          <section className="tracking-result">
            <div>
              <span className="status shipped">
                {tracking.status.replaceAll("_", " ")}
              </span>
              <h2>Order #{tracking.number}</h2>
            </div>
            <div className="tracking-timeline">
              {tracking.history.map((event, index) => (
                <div
                  className={
                    index === tracking.history.length - 1 ? "current" : "done"
                  }
                  key={`${event.to}-${event.at}`}
                >
                  <i>
                    {index === tracking.history.length - 1 ? (
                      <Truck />
                    ) : (
                      <Check />
                    )}
                  </i>
                  <span>
                    <b>{event.to.replaceAll("_", " ")}</b>
                    <small>{new Date(event.at).toLocaleString("en-IN")}</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </StorePage>
  );
}
