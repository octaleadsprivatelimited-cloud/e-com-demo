"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, ShieldCheck, Loader2, MessageSquare, MessageCircle, PhoneCall, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { candidatesApi } from "@/lib/api";

const packages = [
  {
    id: "sms_booster",
    name: "SMS Booster",
    credits: "50,000 SMS",
    price: "₹10,000",
    priceNum: 10000,
    description: "Instant top-up for your SMS campaigns.",
    popular: false
  },
  {
    id: "ivr_booster",
    name: "IVR Booster",
    credits: "20,000 Calls",
    price: "₹15,000",
    priceNum: 15000,
    description: "Instant top-up for Voice campaigns.",
    popular: false
  },
  {
    id: "wa_booster",
    name: "WhatsApp Booster",
    credits: "10,000 Msgs",
    price: "₹8,000",
    priceNum: 8000,
    description: "Instant top-up for WhatsApp campaigns.",
    popular: false
  },
  {
    id: "all_in_one",
    name: "All One Package",
    credits: "10k SMS, 5k WA, 5k IVR",
    price: "₹12,000",
    priceNum: 12000,
    description: "Combined channel pack for complete audience reach.",
    popular: true
  }
];

export default function CustomerBilling() {
  const [selectedPkg, setSelectedPkg] = useState<typeof packages[0] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      // Instant paint from cache.
      try {
        const stored = localStorage.getItem("currentCustomerUser");
        if (stored) setCurrentUser(JSON.parse(stored));
      } catch {}
      // Authoritative balances from the server.
      try {
        const me = await candidatesApi.me();
        setCurrentUser(me);
        localStorage.setItem("currentCustomerUser", JSON.stringify(me));
      } catch {
        // Not signed in / API down — keep cached values.
      }
    };
    loadUser();
    // Re-read when the user returns (e.g., after the Razorpay redirect).
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadUser();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(loadUser, 10000); // real-time balance updates
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const handleCheckout = (pkg: typeof packages[0]) => {
    setSelectedPkg(pkg);
  };

  const processPayment = async () => {
    if (!selectedPkg || !currentUser) return;
    setIsProcessing(true);

    const smsAdd = selectedPkg.id === "sms_booster" ? 50000 : (selectedPkg.id === "all_in_one" ? 10000 : 0);
    const waAdd = selectedPkg.id === "wa_booster" ? 10000 : (selectedPkg.id === "all_in_one" ? 5000 : 0);
    const ivrAdd = selectedPkg.id === "ivr_booster" ? 20000 : (selectedPkg.id === "all_in_one" ? 5000 : 0);

    // Store pending payment info so the callback page can apply credits
    localStorage.setItem("poltica_pending_payment", JSON.stringify({
      mobile: currentUser.mobile,
      id: currentUser.id,
      smsAdd,
      waAdd,
      ivrAdd,
      priceNum: selectedPkg.priceNum,
      pkgName: selectedPkg.name,
    }));

    try {
      const callbackUrl = `${window.location.origin}/customer/billing/callback`;

      const res = await fetch("/api/razorpay/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedPkg.priceNum,
          description: `Poltica - ${selectedPkg.name} (${selectedPkg.credits})`,
          notes: {
            mobile: currentUser.mobile,
            package: selectedPkg.id,
            sms: smsAdd.toString(),
            wa: waAdd.toString(),
            ivr: ivrAdd.toString(),
          },
          callbackUrl,
        }),
      });

      const data = await res.json();

      if (data.success && data.short_url) {
        // Redirect to Razorpay hosted payment page
        window.location.href = data.short_url;
      } else {
        alert("Could not create payment link. Please try again.");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Payment link error:", err);
      alert("Failed to initiate payment. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-8 pt-6 max-w-[1200px] animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#e2e8f0] dark:border-[#0f172a] pb-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">
            Refill Communication Quota
          </h1>
          <p className="text-[#64748b] mt-1 text-sm">
            Top up your SMS, WhatsApp, and IVR credits instantly. Secured by Razorpay.
          </p>
        </div>
      </div>

      {/* Current Balances Grid */}
      {currentUser && (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
          <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-[#e2e8f0] dark:border-[#2c2c2e] hover:shadow-md transition-shadow relative">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">SMS Credits</p>
                <h3 className="text-5xl font-light tracking-tighter text-black dark:text-white">
                  {(currentUser.balances?.sms || 0).toLocaleString()}
                </h3>
              </div>
              <div className="h-8 w-8 rounded-full bg-[#f1f5f9] dark:bg-[#2c2c2e] flex items-center justify-center text-black dark:text-white">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-[#e2e8f0] dark:border-[#2c2c2e] hover:shadow-md transition-shadow relative">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">WhatsApp Credits</p>
                <h3 className="text-5xl font-light tracking-tighter text-black dark:text-white">
                  {(currentUser.balances?.wa || 0).toLocaleString()}
                </h3>
              </div>
              <div className="h-8 w-8 rounded-full bg-[#f1f5f9] dark:bg-[#2c2c2e] flex items-center justify-center text-black dark:text-white">
                <MessageCircle className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-[#e2e8f0] dark:border-[#2c2c2e] hover:shadow-md transition-shadow relative">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">IVR voice Credits</p>
                <h3 className="text-5xl font-light tracking-tighter text-black dark:text-white">
                  {(currentUser.balances?.ivr || 0).toLocaleString()}
                </h3>
              </div>
              <div className="h-8 w-8 rounded-full bg-[#f1f5f9] dark:bg-[#2c2c2e] flex items-center justify-center text-black dark:text-white">
                <PhoneCall className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Packages Area */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-black dark:text-white">Select Booster Top-up Pack</h2>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <div 
              key={pkg.id} 
              className={`bg-white dark:bg-[#1c1c1e] rounded-2xl p-6 transition-all duration-300 border ${
                pkg.popular 
                  ? 'border-2 border-black dark:border-white shadow-sm' 
                  : 'border-[#e2e8f0] dark:border-[#2c2c2e]'
              } flex flex-col justify-between`}
            >
              {pkg.popular && (
                <div className="flex justify-center -mt-8 mb-4">
                  <span className="bg-black text-white dark:bg-white dark:text-black text-[9px] font-bold uppercase px-3 py-1 rounded-full tracking-wider shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-base text-black dark:text-white tracking-tight">{pkg.name}</h3>
                  <p className="text-xs text-[#64748b] mt-1 leading-normal">{pkg.description}</p>
                </div>
                
                <div className="text-center border-y border-[#e2e8f0] dark:border-[#2c2c2e] py-4 space-y-0.5">
                  <div className="text-3xl font-semibold text-black dark:text-white tracking-tight">{pkg.price}</div>
                  <div className="text-[10px] text-[#64748b] uppercase tracking-wider font-bold">Total Pack Value</div>
                </div>

                <div className="flex items-center justify-center gap-1.5 p-2 bg-[#f1f5f9] dark:bg-[#2c2c2e] rounded-lg text-xs font-semibold text-black dark:text-white">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{pkg.credits}</span>
                </div>
              </div>

              <Button 
                onClick={() => handleCheckout(pkg)}
                className={`w-full mt-6 h-9.5 text-xs font-semibold rounded-full ${
                  pkg.popular 
                    ? 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100 shadow-sm' 
                    : 'bg-[#f1f5f9] hover:bg-[#e8e8ed] dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] text-black dark:text-white'
                }`}
                variant="ghost"
              >
                <CreditCard className="mr-1.5 h-4 w-4 shrink-0" /> Checkout Pack
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center items-center gap-2.5 bg-[#f1f5f9] dark:bg-[#1c1c1e] p-4 rounded-xl border border-[#e2e8f0] dark:border-[#2c2c2e] max-w-[650px] mx-auto text-xs text-[#64748b] font-medium leading-relaxed text-center">
        <ShieldCheck className="h-5 w-5 text-zinc-500 shrink-0" />
        <span>Transactions are encrypted with 256-bit SSL protocol. Credits will be allocated immediately on completion.</span>
      </div>

      {/* Checkout Modal */}
      <Dialog open={!!selectedPkg} onOpenChange={(open) => !open && !isProcessing && setSelectedPkg(null)}>
        <DialogContent className="sm:max-w-[480px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold tracking-tight">Purchase Quota Pack</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Confirm details of your selected booster subscription pack below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200/40 dark:border-zinc-800/40 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 uppercase font-bold tracking-wider">Quota Package</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-100">{selectedPkg?.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 uppercase font-bold tracking-wider">Credits Refilled</span>
                <span className="font-bold text-zinc-850 dark:text-zinc-100">{selectedPkg?.credits}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-zinc-200 dark:border-zinc-800 mt-2">
                <span className="font-bold text-sm text-zinc-900 dark:text-white">Amount Due</span>
                <span className="font-black text-xl text-primary">{selectedPkg?.price}</span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-400 text-center leading-normal">
              Clicking Pay will redirect you to Razorpay secure payment processing servers to process credit cards, UPI, or net banking.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setSelectedPkg(null)} 
                disabled={isProcessing}
                className="h-9 px-4 text-xs font-bold border-zinc-200 dark:border-zinc-800"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={processPayment} 
                disabled={isProcessing} 
                className="bg-primary hover:bg-primary/95 text-white h-9 px-4 text-xs font-bold shadow-md"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4 shrink-0" />
                    Pay with Razorpay
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
