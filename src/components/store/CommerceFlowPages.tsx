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

type GoogleIdentity={accounts:{id:{initialize:(input:{client_id:string;callback:(response:{credential:string})=>void})=>void;renderButton:(element:HTMLElement,options:Record<string,unknown>)=>void}}};
function CustomerQuickLogin(){const [mobile,setMobile]=useState("+91"),[code,setCode]=useState(""),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),googleButton=useRef<HTMLDivElement>(null);const finish=(result:{accessToken:string})=>{saveAccessToken(result.accessToken);window.location.href="/account"};useEffect(()=>{commerceApi<{google:{enabled:boolean;clientId:string}}>("/api/v1/auth/providers").then(({google})=>{if(!google.enabled||!googleButton.current)return;const setup=()=>{const identity=(window as typeof window&{google?:GoogleIdentity}).google;if(!identity||!googleButton.current)return;identity.accounts.id.initialize({client_id:google.clientId,callback:async response=>{try{finish(await commerceApi<{accessToken:string}>("/api/v1/auth/google",{method:"POST",body:JSON.stringify({credential:response.credential})}))}catch(error){toast.error(error instanceof Error?error.message:"Google sign-in failed")}}});identity.accounts.id.renderButton(googleButton.current,{theme:"outline",size:"large",width:320,text:"continue_with"})};if((window as typeof window&{google?:GoogleIdentity}).google)return setup();const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.onload=setup;document.head.appendChild(script)}).catch(()=>undefined)},[]);const request=async()=>{setBusy(true);try{const result=await commerceApi<{developmentCode?:string}>("/api/v1/auth/mobile/request",{method:"POST",body:JSON.stringify({mobile})});setSent(true);toast.success(result.developmentCode?`Development OTP: ${result.developmentCode}`:"Verification code sent")}catch(error){toast.error(error instanceof Error?error.message:"Code could not be sent")}finally{setBusy(false)}};const verify=async()=>{setBusy(true);try{finish(await commerceApi<{accessToken:string}>("/api/v1/auth/mobile/verify",{method:"POST",body:JSON.stringify({mobile,code})}))}catch(error){toast.error(error instanceof Error?error.message:"Verification failed")}finally{setBusy(false)}};return <div className="quick-login"><div ref={googleButton}/><div className="auth-divider"><span>or use mobile OTP</span></div><div className="mobile-login"><input aria-label="Mobile number" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="+919876543210"/>{sent&&<input aria-label="Verification code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" placeholder="6-digit OTP"/>}<button type="button" disabled={busy||!/^\+[1-9]\d{7,14}$/.test(mobile)||(sent&&code.length!==6)} onClick={sent?verify:request}>{sent?"Verify & continue":"Send OTP"}</button></div>{sent&&<button type="button" className="otp-change" onClick={()=>{setSent(false);setCode("")}}>Change number</button>}</div>}

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [busy, setBusy] = useState(false);
  return (
    <StorePage>
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
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const data = new FormData(e.currentTarget);
              try {
                if (mode === "register")
                  await commerceApi("/api/v1/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                      name: data.get("name"),
                      email: data.get("email"),
                      password: data.get("password"),
                    }),
                  });
                const result = await commerceApi<{ accessToken: string; user: { role: string } }>(
                  "/api/v1/auth/login",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      email: data.get("email"),
                      password: data.get("password"),
                      otp: data.get("otp") || undefined,
                    }),
                  },
                );
                saveAccessToken(result.accessToken);
                window.location.href = result.user.role === "CUSTOMER" ? "/account" : "/admin";
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Sign in failed",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "register" && (
              <label>
                Full name
                <input name="name" required />
              </label>
            )}
            <label>
              Email address
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" minLength={8} required />
            </label>
            {mode === "login" && <label>Authenticator code <small>(administrators)</small><input name="otp" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} /></label>}
            <button disabled={busy}>
              {mode === "login" ? "Sign in" : "Create account"} <ArrowRight />
            </button>
          </form>
          <button
            className="mode-switch"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
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
