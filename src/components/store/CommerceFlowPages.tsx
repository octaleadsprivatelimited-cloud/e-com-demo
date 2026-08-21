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
import {
  commerceApi,
  saveAccessToken,
  type ApiProduct,
} from "@/lib/commerce-api";
import { StorePage } from "./StoreHeader";
import { toast, Toaster } from "sonner";
export function CartPage() {
  const cart = useCommerceCart();
  const shipping = cart.subtotal >= 5000 ? 0 : 299;
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
              {cart.lines.map(({ product, entry, index }) => (
                <article key={index}>
                  <div
                    className="line-art"
                    style={{ background: product.tone }}
                  >
                    {product.glyph}
                  </div>
                  <div>
                    <small>{product.category}</small>
                    <h2>{product.name}</h2>
                    {entry.variant && (
                      <p>
                        {Object.entries(entry.variant)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
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
                    >
                      <Plus />
                    </button>
                  </div>
                  <strong>{money(product.price * entry.quantity)}</strong>
                </article>
              ))}
            </section>
            <aside className="order-summary">
              <h2>Order summary</h2>
              <div>
                <span>Subtotal</span>
                <b>{money(cart.subtotal)}</b>
              </div>
              <div>
                <span>Shipping</span>
                <b>{shipping ? money(shipping) : "Complimentary"}</b>
              </div>
              <div>
                <span>Estimated GST</span>
                <b>Included</b>
              </div>
              <hr />
              <div className="summary-total">
                <span>Total</span>
                <b>{money(cart.subtotal + shipping)}</b>
              </div>
              <label>
                <input placeholder="Coupon code" />
                <button
                  onClick={() =>
                    toast.info("Coupon will be validated securely at checkout")
                  }
                >
                  Apply
                </button>
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
  const checkoutKey = useRef(crypto.randomUUID());
  const [step, setStep] = useState(1),
    [placed, setPlaced] = useState(false),
    [orderNumber, setOrderNumber] = useState(""),
    [postalCode, setPostalCode] = useState(""),
    [contact, setContact] = useState({ name: "Ananya Sharma", email: "ananya@example.com", phone: "" }),
    [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "Telangana", country: "IN" }),
    [paymentProvider, setPaymentProvider] = useState("razorpay"),
    [busy, setBusy] = useState(false);
  const total = cart.subtotal + (cart.subtotal >= 5000 ? 0 : 299);
  const openRazorpay = async (payment: { externalId: string; clientToken?: string }, number: string) => {
    if (!(window as any).Razorpay) await new Promise<void>((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error("Secure payment window could not be loaded")); document.head.appendChild(script); });
    const record=async(type:"CANCELLED"|"FAILED",details:Record<string,unknown>={})=>{try{await commerceApi("/api/v1/payments/client-events",{method:"POST",body:JSON.stringify({orderNumber:number,providerOrderId:payment.externalId,type,...details})})}catch{/* Gateway webhook reconciliation remains authoritative. */}};
    await new Promise<void>((resolve, reject) => {
      const checkout = new (window as any).Razorpay({ key: payment.clientToken, order_id: payment.externalId, name: "Aster & Row", description: `Order ${number}`, prefill: { name: contact.name, email: contact.email, contact: contact.phone }, handler: () => resolve(), modal: { ondismiss: () => {void record("CANCELLED");reject(new Error("Payment was cancelled. Your order is saved and can be paid again."))} }, theme: { color: "#17221e" } });
      checkout.on("payment.failed", (response:any) => {const error=response?.error||{};void record("FAILED",{gatewayPaymentId:error.metadata?.payment_id,errorCode:error.code,errorDescription:error.description});reject(new Error(error.description||"Payment was declined. Try another method or retry from your account."))});
      checkout.open();
    });
  };
  const placeOrder = async () => {
    if (!/^\d{6}$/.test(postalCode)) {
      setStep(1);
      toast.error("Enter a valid 6-digit PIN code");
      return;
    }
    if (!contact.name.trim() || !/^\S+@\S+\.\S+$/.test(contact.email) || !/^\+?[1-9]\d{7,14}$/.test(contact.phone) || !address.line1.trim() || !address.city.trim()) {
      setStep(1);
      toast.error("Complete your contact and delivery address");
      return;
    }
    setBusy(true);
    try {
      const catalog = await commerceApi<ApiProduct[]>("/api/v1/products");
      const lines = cart.lines.map(({ product, entry }) => {
        const apiProduct = catalog.find(
          (candidate) => candidate.name === product.name,
        );
        if (!apiProduct) throw new Error(`${product.name} is not available`);
        const variant =
          apiProduct.variants.find((candidate) =>
            Object.entries(entry.variant || {}).every(
              ([key, value]) => candidate.attributes[key] === value,
            ),
          ) || apiProduct.variants[0];
        if (!variant)
          throw new Error(`${product.name} has no available variant`);
        return { variantId: variant.id, quantity: entry.quantity };
      });
      const result = await commerceApi<{ order: { number: string }; payment: { externalId: string; clientToken?: string } | null; paymentFailure?:{message:string;fallbackOptions:string[]} }>(
        "/api/v1/checkout",
        {
          method: "POST",
          headers: { "idempotency-key": checkoutKey.current },
          body: JSON.stringify({ lines, postalCode, paymentProvider, contact, shippingAddress: address }),
        },
      );
      setOrderNumber(result.order.number);
      if(result.paymentFailure){setPaymentProvider("cod");throw new Error(`${result.paymentFailure.message} Cash on Delivery is now selected.`)}
      if (paymentProvider === "razorpay" && result.payment) await openRazorpay(result.payment, result.order.number);
      cart.clear();
      setPlaced(true);
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
  if (placed)
    return (
      <StorePage>
        <main className="confirmation">
          <div>
            <Check />
            <p className="eyebrow">Order confirmed</p>
            <h1>Thank you, Ananya.</h1>
            <p>
              Your order <b>#{orderNumber}</b> has been received. We’ll send
              delivery updates to your email and phone.
            </p>
            <div>
              <span>
                Order total <b>{money(total)}</b>
              </span>
              <span>
                Estimated delivery <b>25–27 August</b>
              </span>
            </div>
            <a href="/track">
              Track your order <ArrowRight />
            </a>
          </div>
        </main>
      </StorePage>
    );
  return (
    <div className="checkout-shell">
      <header>
        <a href="/" className="brand">
          <i>AR</i>
          <span>
            ASTER <b>&</b> ROW
          </span>
        </a>
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
                onClick={() => setStep(i + 1)}
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
              <button className="continue" onClick={() => setStep(2)}>
                Continue to delivery <ArrowRight />
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="checkout-form">
              <p className="eyebrow">Step 2 of 3</p>
              <h1>Choose your delivery.</h1>
              {[
                ["Standard delivery", "3–6 business days", 0],
                ["Express delivery", "1–2 business days", 499],
              ].map(([a, b, c], i) => (
                <label className="delivery-choice" key={String(a)}>
                  <input type="radio" name="delivery" defaultChecked={!i} />
                  <Truck />
                  <span>
                    <b>{a}</b>
                    <small>{b}</small>
                  </span>
                  <strong>{c ? money(Number(c)) : "Free"}</strong>
                </label>
              ))}
              <button className="continue" onClick={() => setStep(3)}>
                Continue to payment <ArrowRight />
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
                    onChange={() => setPaymentProvider("razorpay")}
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
                    onChange={() => setPaymentProvider("cod")}
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
                disabled={busy || !cart.lines.length}
              >
                {busy ? "Creating secure order…" : `Pay ${money(total)}`}{" "}
                <LockKeyhole />
              </button>
            </div>
          )}
        </section>
        <aside>
          <h2>Your order</h2>
          {cart.lines.map(({ product, entry }, i) => (
            <div className="checkout-line" key={i}>
              <div style={{ background: product.tone }}>
                {product.glyph}
                <i>{entry.quantity}</i>
              </div>
              <span>
                <b>{product.name}</b>
                <small>
                  {entry.variant && Object.values(entry.variant).join(" / ")}
                </small>
              </span>
              <strong>{money(product.price * entry.quantity)}</strong>
            </div>
          ))}
          <hr />
          <p>
            <span>Subtotal</span>
            <b>{money(cart.subtotal)}</b>
          </p>
          <p>
            <span>Shipping</span>
            <b>{cart.subtotal >= 5000 ? "Free" : money(299)}</b>
          </p>
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
