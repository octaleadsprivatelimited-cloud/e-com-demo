"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, MessageSquare, MessageCircle, PhoneCall, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { billingApi, candidatesApi } from "@/lib/api";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [creditsSummary, setCreditsSummary] = useState<{sms: number; wa: number; ivr: number; amount: number; pkgName: string} | null>(null);

  useEffect(() => {
    const razorpay_payment_id = searchParams.get("razorpay_payment_id");
    const razorpay_payment_link_status = searchParams.get("razorpay_payment_link_status");
    const razorpay_payment_link_id = searchParams.get("razorpay_payment_link_id");

    console.log("[Payment Callback] Status:", razorpay_payment_link_status, "ID:", razorpay_payment_id, "Link ID:", razorpay_payment_link_id);

    if (razorpay_payment_link_status === "paid" && razorpay_payment_id) {
      // Prevent double allocation by tracking processed payment IDs
      const processedStr = localStorage.getItem("poltica_processed_payments") || "[]";
      let processedList: string[] = [];
      try {
        processedList = JSON.parse(processedStr);
      } catch (e) {}

      if (processedList.includes(razorpay_payment_id)) {
        setStatus("success");
        setMessage(`Payment ID: ${razorpay_payment_id}. Credits were already applied.`);
        return;
      }

      const applyCredits = async () => {
        try {
          let smsAdd = 0;
          let waAdd = 0;
          let ivrAdd = 0;
          let priceNum = 0;
          let mobile = "";
          let id = "";
          let pkgName = "Credit Pack";
          let successResolving = false;

          // ─── Method A: Fetch link details directly from Razorpay API ───
          if (razorpay_payment_link_id) {
            try {
              const res = await fetch(`/api/razorpay/link-details?id=${razorpay_payment_link_id}`);
              const json = await res.json();
              if (json.success && json.data) {
                const link = json.data;
                console.log("[Payment Callback] Fetched details from Razorpay:", link);

                // Strictly verify payment status from Razorpay's API server
                if (link.status === "paid") {
                  smsAdd = parseInt(link.notes?.sms || "0", 10);
                  waAdd = parseInt(link.notes?.wa || "0", 10);
                  ivrAdd = parseInt(link.notes?.ivr || "0", 10);
                  priceNum = (link.amount || 0) / 100;
                  mobile = link.notes?.mobile || "";

                  const packageId = link.notes?.package;
                  if (packageId === "sms_booster") pkgName = "SMS Booster";
                  else if (packageId === "wa_booster") pkgName = "WhatsApp Booster";
                  else if (packageId === "ivr_booster") pkgName = "IVR Booster";
                  else if (packageId === "all_in_one") pkgName = "All One Package";

                  successResolving = true;
                } else {
                  console.warn("[Payment Callback] Payment link is not paid. Current status:", link.status);
                }
              }
            } catch (err) {
              console.error("[Payment Callback] Razorpay Link Fetch failed:", err);
            }
          }

          if (!successResolving) {
            // Cannot resolve credit details or payment is not verified as paid
            setStatus("failed");
            setMessage(`Payment verification failed. Please ensure the payment was successfully processed.`);
            return;
          }

          console.log("[Payment Callback] Applying credits:", { smsAdd, waAdd, ivrAdd, priceNum, mobile, id, pkgName });

          // ─── Grant credits + record the payment SERVER-SIDE ───
          // Credits are added on the backend (source of truth) after Razorpay
          // confirmed the link is "paid".
          try {
            // Self-heal: make sure this customer exists server-side before
            // crediting (a signup whose API sync failed would otherwise 401).
            let cached: any = null;
            try { cached = JSON.parse(localStorage.getItem("currentCustomerUser") || "null"); } catch {}
            await candidatesApi.ensure(cached || (mobile ? { mobile } : undefined));

            const res = await billingApi.topup({
              sms: smsAdd,
              wa: waAdd,
              ivr: ivrAdd,
              amount: priceNum,
              packageName: pkgName,
              paymentId: razorpay_payment_id,
            });

            // Sync the cached session balances from the authoritative response.
            try {
              const su = localStorage.getItem("currentCustomerUser");
              if (su) {
                const u = JSON.parse(su);
                u.balances = { ...(u.balances || {}), ...res.balances };
                u.payments = (u.payments || 0) + priceNum;
                localStorage.setItem("currentCustomerUser", JSON.stringify(u));
              }
            } catch {}
          } catch (err: any) {
            // Do NOT mark processed — so the customer can retry and get credited.
            console.error("[Payment Callback] Server credit grant failed:", err);
            setStatus("failed");
            setMessage(
              `Your payment was received (ID: ${razorpay_payment_id}), but applying the credits failed` +
                (err?.message ? `: ${err.message}` : "") +
                `. Please reload this page or contact support — you will not be charged again.`,
            );
            return;
          }

          // Save summary for receipt display
          setCreditsSummary({
            sms: smsAdd,
            wa: waAdd,
            ivr: ivrAdd,
            amount: priceNum,
            pkgName,
          });

          // Mark payment as successfully processed (only after credits applied)
          processedList.push(razorpay_payment_id);
          localStorage.setItem("poltica_processed_payments", JSON.stringify(processedList));
          localStorage.removeItem("poltica_pending_payment");
          window.dispatchEvent(new Event("storage"));

          setStatus("success");
          setMessage(`Transaction ID: ${razorpay_payment_id}`);
          console.log("[Payment Callback] ✅ Credits applied successfully");
        } catch (e) {
          console.error("[Payment Callback] ❌ Error applying credits:", e);
          setStatus("success");
          setMessage(`Payment ID: ${razorpay_payment_id}. Please contact support if credits are missing.`);
        }
      };

      applyCredits();
    } else {
      setStatus("failed");
      setMessage("Payment was not completed or was cancelled. No credits were applied.");
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <Card className="max-w-lg w-full p-8 text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Verifying Payment...</h2>
          </>
        )}

        {status === "success" && (
          <>
            <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-emerald-600">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground">{message}</p>

            {/* Credits Applied Receipt */}
            {creditsSummary && (
              <div className="bg-background/50 border border-border/50 rounded-lg p-4 text-left space-y-3 mt-4">
                <h3 className="text-sm font-semibold text-foreground text-center">Credits Applied — {creditsSummary.pkgName}</h3>
                <div className="border-t border-border/30 pt-3 space-y-2">
                  {creditsSummary.sms > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="h-4 w-4 text-[#2563eb]" /> SMS Credits
                      </span>
                      <span className="font-semibold text-emerald-600">+{creditsSummary.sms.toLocaleString()}</span>
                    </div>
                  )}
                  {creditsSummary.wa > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <MessageCircle className="h-4 w-4 text-[#16a34a]" /> WhatsApp Credits
                      </span>
                      <span className="font-semibold text-emerald-600">+{creditsSummary.wa.toLocaleString()}</span>
                    </div>
                  )}
                  {creditsSummary.ivr > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <PhoneCall className="h-4 w-4 text-[#dc2626]" /> IVR Voice Credits
                      </span>
                      <span className="font-semibold text-emerald-600">+{creditsSummary.ivr.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-border/30 pt-2 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-bold text-foreground">₹{creditsSummary.amount.toLocaleString()}</span>
                </div>
              </div>
            )}

            <Button onClick={() => router.push("/customer/billing")} className="w-full mt-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Billing
            </Button>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-red-600">Payment Failed</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button
              onClick={() => router.push("/customer/billing")}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

export default function PaymentCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
