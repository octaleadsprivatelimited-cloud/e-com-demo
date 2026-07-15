"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Lock,
  Smartphone,
  User,
  MapPin,
  MessageSquare,
  PhoneCall,
  MessageCircle,
  Database,
  Globe,
  Radio,
  FileSpreadsheet,
  Check
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendOtp as apiSendOtp, verifyOtp as apiVerifyOtp } from "@/lib/auth-api";
import { candidatesApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CandidateUser {
  id?: string;
  name?: string;
  area?: string;
  district?: string;
  state?: string;
  pincode?: string;
  mobile?: string;
  status?: string;
  balances?: {
    sms: number;
    ivr: number;
    wa: number;
  };
  payments?: number;
  contacts?: number;
  uniqueUrl?: string;
  manifestoUrl?: string;
  brochureUrl?: string;
}

interface PostOfficeOffice {
  Name?: string;
  District?: string;
  State?: string;
}

export default function RootAuthPage() {
  const router = useRouter();
  
  // Tab control
  const [activeTab, setActiveTab] = useState("signin");

  // Registration Step Control:
  // 1 = Account Details
  // 2 = Mobile Verification (OTP)
  // 3 = Select Plan & Calculator
  // 4 = Secure Checkout
  // 5 = Success Screen
  const [signupStep, setSignupStep] = useState(1);

  // Registration states
  const [regName, setRegName] = useState("");
  const [regDistrict, setRegDistrict] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regPincode, setRegPincode] = useState("");
  const [regArea, setRegArea] = useState("");
  const [regState, setRegState] = useState("");
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const [villageList, setVillageList] = useState<Array<{ name: string; district: string; state: string }>>([]);

  // Signup OTP states
  const [signupGeneratedOtp, setSignupGeneratedOtp] = useState("");
  const [signupEnteredOtp, setSignupEnteredOtp] = useState("");
  const [isSignupVerifying, setIsSignupVerifying] = useState(false);

  // Dynamic Calculator states
  const [population, setPopulation] = useState(7000);
  const [smsPerPerson, setSmsPerPerson] = useState(6);
  const [waPerPerson, setWaPerPerson] = useState(2);
  const [ivrPerPerson, setIvrPerPerson] = useState(3);

  // Checkout states
  const [isPaying, setIsPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Sign In / OTP states
  const [loginMobile, setLoginMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(""); 
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [regConsent, setRegConsent] = useState(false);

  // Version of the legal policies the user is accepting at registration.
  const POLICY_VERSION = "2026-07-13";

  // Pricing constants (in ₹ INR)
  const SMS_UNIT_PRICE = 0.50;
  const WA_UNIT_PRICE = 1.00;
  const IVR_UNIT_PRICE = 0.95238;

  // Derived calculations
  const smsQty = Math.max(0, population * smsPerPerson);
  const waQty = Math.max(0, population * waPerPerson);
  const ivrQty = Math.max(0, population * ivrPerPerson);

  const smsCost = smsQty * SMS_UNIT_PRICE;
  const waCost = waQty * WA_UNIT_PRICE;
  const ivrCost = ivrQty * IVR_UNIT_PRICE;

  const totalBaseCost = smsCost + waCost + ivrCost;
  const finalPrice = Math.max(55000, Math.round(totalBaseCost));

  // Sync initial setup
  useEffect(() => {
    if (!localStorage.getItem("poltica_candidates")) {
      const initialCandidates = [
        { id: "CAN-001", name: "Rahul Sharma", district: "Pune", area: "Sadashiv Peth", status: "Active", balances: { sms: 95000, ivr: 50000, wa: 12000 }, payments: 23000, contacts: 45000, mobile: "9876543210", uniqueUrl: "poltica.in-sadashiv-peth-rahul-sharma", manifestoUrl: "", brochureUrl: "" },
        { id: "CAN-002", name: "Priya Singh", district: "Nashik", area: "Nashik East", status: "Active", balances: { sms: 100000, ivr: 50000, wa: 0 }, payments: 25000, contacts: 85000, mobile: "9876543211", uniqueUrl: "poltica.in-nashik-east-priya-singh", manifestoUrl: "", brochureUrl: "" }
      ];
      localStorage.setItem("poltica_candidates", JSON.stringify(initialCandidates));
    }

    if (!localStorage.getItem("poltica_payments")) {
      const initialPayments = [
        {
          id: "TXN-10001",
          paymentId: "pay_Pk8r127asd8f",
          candidateId: "CAN-001",
          candidateName: "Rahul Sharma",
          mobile: "9876543210",
          packageName: "WhatsApp Booster",
          amount: 8000,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: "Success"
        },
        {
          id: "TXN-10002",
          paymentId: "pay_Pk9a982hjs1a",
          candidateId: "CAN-001",
          candidateName: "Rahul Sharma",
          mobile: "9876543210",
          packageName: "IVR Booster",
          amount: 15000,
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: "Success"
        }
      ];
      localStorage.setItem("poltica_payments", JSON.stringify(initialPayments));
    }
  }, []);

  // Pincode Autocomplete Hook
  useEffect(() => {
    const fetchPincode = async () => {
      if (regPincode.length === 6 && !isNaN(Number(regPincode))) {
        setIsLoadingPincode(true);
        setAuthError("");

        const PINCODE_VILLAGES_MAP: Record<string, Array<{ name: string; district: string; state: string }>> = {
          "400001": [
            { name: "Colaba", district: "Mumbai City", state: "Maharashtra" },
            { name: "Taj Mahal Hotel", district: "Mumbai City", state: "Maharashtra" }
          ],
          "411030": [
            { name: "Sadashiv Peth", district: "Pune", state: "Maharashtra" },
            { name: "Narayan Peth", district: "Pune", state: "Maharashtra" },
            { name: "Shaniwar Peth", district: "Pune", state: "Maharashtra" }
          ],
          "110001": [
            { name: "Connaught Place", district: "New Delhi", state: "Delhi" }
          ]
        };

        if (PINCODE_VILLAGES_MAP[regPincode]) {
          const list = PINCODE_VILLAGES_MAP[regPincode];
          setVillageList(list);
          setRegArea(list[0].name);
          setRegDistrict(list[0].district);
          setRegState(list[0].state);
          setIsLoadingPincode(false);
          return;
        }

        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${regPincode}`);
          const json = await res.json();
          if (json && json[0] && json[0].Status === "Success" && json[0].PostOffice && json[0].PostOffice.length > 0) {
            const list = json[0].PostOffice.map((office: PostOfficeOffice) => ({
              name: office.Name || "",
              district: office.District || "",
              state: office.State || ""
            }));
            setVillageList(list);
            setRegArea(list[0].name);
            setRegDistrict(list[0].district);
            setRegState(list[0].state);
          } else {
            generateFallbackLocation(regPincode);
          }
        } catch {
          generateFallbackLocation(regPincode);
        } finally {
          setIsLoadingPincode(false);
        }
      } else {
        setVillageList([]);
        setRegArea("");
        setRegDistrict("");
        setRegState("");
      }
    };

    const generateFallbackLocation = (pin: string) => {
      const zone = pin[0];
      let list = [];
      if (zone === "1") {
        list = [{ name: "Connaught Place Area", district: "New Delhi District", state: "Delhi" }];
      } else {
        list = [
          { name: `Constituency Area A under ${pin}`, district: `District ${pin.substring(0, 3)}`, state: "State Region" },
          { name: `Constituency Area B under ${pin}`, district: `District ${pin.substring(0, 3)}`, state: "State Region" }
        ];
      }
      setVillageList(list);
      setRegArea(list[0].name);
      setRegDistrict(list[0].district);
      setRegState(list[0].state);
    };

    fetchPincode();
  }, [regPincode]);

  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regDistrict || !regMobile || !regPincode || !regArea || !regState) {
      setAuthError("Please fill in all details first.");
      return;
    }
    if (regMobile.length !== 10 || isNaN(Number(regMobile))) {
      setAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (regPincode.length !== 6 || isNaN(Number(regPincode))) {
      setAuthError("Please enter a valid 6-digit PIN code.");
      return;
    }
    if (!regConsent) {
      setAuthError("You must read and accept the Terms & Conditions and Privacy Policy to register.");
      return;
    }

    const currentList = JSON.parse(localStorage.getItem("poltica_candidates") || "[]");
    const exists = currentList.some((c: CandidateUser) => c.mobile === regMobile);
    if (exists) {
      setAuthError("Mobile number is already registered. Please sign in instead.");
      return;
    }

    setAuthError("");
    const result = await apiSendOtp(regMobile);
    if (!result.success) {
      const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setSignupGeneratedOtp(fallbackOtp);
    } else {
      setSignupGeneratedOtp(result.otp || "");
    }
    setSignupStep(2);
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSignupVerifying(true);
    setAuthError("");

    const result = await apiVerifyOtp(regMobile, signupEnteredOtp);
    if (!result.success) {
      if (signupGeneratedOtp && signupEnteredOtp === signupGeneratedOtp) {
        setIsSignupVerifying(false);
        setSignupStep(3);
        return;
      }
      setAuthError(result.message || "Invalid OTP. Please check and try again.");
      setIsSignupVerifying(false);
      return;
    }

    setIsSignupVerifying(false);
    setSignupStep(3);
  };

  const handleNextToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (finalPrice <= 0) {
      setAuthError("Please configure campaign credits to proceed.");
      return;
    }
    setAuthError("");
    setSignupStep(4);
  };

  const completePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaying(true);

    setTimeout(() => {
      const cleanVillageName = (regArea || regDistrict || "town").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const cleanCandName = regName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const generatedUniqueUrl = `poltica.in-${cleanVillageName}-${cleanCandName}`;

      const newCandidate = {
        id: `CAN-${Math.floor(100 + Math.random() * 900)}`,
        name: regName,
        district: regDistrict,
        area: regArea,
        state: regState,
        pincode: regPincode,
        status: "Active",
        balances: { sms: smsQty, ivr: ivrQty, wa: waQty },
        payments: finalPrice,
        contacts: population,
        mobile: regMobile,
        uniqueUrl: generatedUniqueUrl,
        manifestoUrl: "",
        brochureUrl: "",
        // Recorded proof of acceptance of the legal policies at registration.
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: POLICY_VERSION,
      };

      const currentList = JSON.parse(localStorage.getItem("poltica_candidates") || "[]");
      const exists = currentList.some((c: CandidateUser) => c.mobile === regMobile);
      if (!exists) {
        currentList.push(newCandidate);
        localStorage.setItem("poltica_candidates", JSON.stringify(currentList));
      }

      localStorage.setItem("currentCustomerUser", JSON.stringify(newCandidate));
      // Best-effort: persist the new account (with consent record) server-side.
      candidatesApi.create(newCandidate).catch(() => {});
      setIsPaying(false);
      setSignupStep(5);

      setTimeout(() => {
        router.push("/customer");
      }, 2000);
    }, 2000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginMobile || loginMobile.length !== 10 || isNaN(Number(loginMobile))) {
      setAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const currentList = JSON.parse(localStorage.getItem("poltica_candidates") || "[]");
    const userFound = currentList.find((c: CandidateUser) => c.mobile === loginMobile);

    if (!userFound) {
      setAuthError("Mobile number is not registered. Please register first.");
      return;
    }

    if (userFound.status === "Suspended") {
      setAuthError("This candidate account has been suspended. Please contact support.");
      return;
    }

    setAuthError("");
    setIsSendingOtp(true);

    const result = await apiSendOtp(loginMobile);
    setIsSendingOtp(false);

    if (!result.success) {
      const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(fallbackOtp);
    } else {
      setGeneratedOtp(result.otp || "");
    }
    setOtpSent(true);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsVerifying(true);

    const cacheFromPool = () => {
      const pool = JSON.parse(localStorage.getItem("poltica_candidates") || "[]");
      const userFound = pool.find((c: CandidateUser) => c.mobile === loginMobile);
      if (userFound) localStorage.setItem("currentCustomerUser", JSON.stringify(userFound));
    };

    const result = await apiVerifyOtp(loginMobile, enteredOtp);
    if (result.success) {
      // Hydrate the session user from the API (source of truth); fall back to
      // the local pool cache if the profile fetch fails.
      try {
        const me = await candidatesApi.me();
        localStorage.setItem("currentCustomerUser", JSON.stringify(me));
      } catch {
        cacheFromPool();
      }
      router.push("/customer");
      return;
    }

    // Offline fallback — API unreachable, validate against the locally shown OTP.
    if (generatedOtp && enteredOtp === generatedOtp) {
      cacheFromPool();
      router.push("/customer");
      return;
    }

    setAuthError(result.message || "Invalid OTP. Please try again.");
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen mesh-bg text-[#1e293b] dark:text-[#f1f5f9] font-sans flex flex-col transition-colors duration-500">
      
      {/* Premium Glassmorphic Navigation Header */}
      <header className="glass border-b border-[#e2e8f0]/30 dark:border-zinc-800/40 sticky top-0 z-45 select-none h-14 flex items-center px-6 transition-all duration-300">
        <div className="flex items-center justify-between w-full max-w-[1280px] mx-auto">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="h-6 w-6 bg-[#2563eb] flex items-center justify-center rounded-sm shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="6" fill="white" />
                  <rect x="9" y="1" width="6" height="6" fill="white" opacity="0.8" />
                  <rect x="1" y="9" width="6" height="6" fill="white" opacity="0.8" />
                  <rect x="9" y="9" width="6" height="6" fill="white" opacity="0.5" />
                </svg>
              </div>
              <span className="font-bold text-sm tracking-tight font-sans text-zinc-900 dark:text-white uppercase transition-colors duration-300 group-hover:text-[#2563eb]">
                Poltica <span className="text-[10px] text-zinc-400 font-normal">Systems</span>
              </span>
            </div>

            {/* Menu Items */}
            <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
              <span className="cursor-pointer hover:text-[#2563eb] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2563eb] after:scale-x-0 hover:after:scale-x-100 after:transition-transform">Campaign OS</span>
              <span className="cursor-pointer hover:text-[#2563eb] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2563eb] after:scale-x-0 hover:after:scale-x-100 after:transition-transform">Telecom SLA</span>
              <span className="cursor-pointer hover:text-[#2563eb] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2563eb] after:scale-x-0 hover:after:scale-x-100 after:transition-transform">Compliance</span>
              <span className="cursor-pointer hover:text-[#2563eb] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#2563eb] after:scale-x-0 hover:after:scale-x-100 after:transition-transform">Pricing Plan</span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden lg:inline text-[10px] text-zinc-400 font-mono bg-zinc-200/40 dark:bg-zinc-800/40 px-2 py-0.5 rounded">
              Entity: octaleads Private Limited
            </span>
            <Button 
              onClick={() => { setActiveTab("signin"); setSignupStep(1); }} 
              variant="outline" 
              className="h-8 text-[11px] px-4 border-zinc-200 dark:border-zinc-700 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:scale-105 transition-all duration-200"
            >
              Portal Login
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid Hero & Control Console */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-12 grid gap-10 lg:grid-cols-12 items-start animate-fade-in-up">
        
        {/* Left Hand: Enterprise Value Proposition & Showcase Dashboard */}
        <section className="lg:col-span-7 space-y-8 animate-fade-in-up">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2563eb]/10 text-[#2563eb] text-[10px] font-bold uppercase tracking-widest animate-pulse">
              <ShieldCheck className="h-3.5 w-3.5" /> ECI & TRAI Compliant Gateway
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.1] bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
              Enterprise Electoral Communications Infrastructure.
            </h1>
            <p className="text-zinc-650 dark:text-zinc-300 text-sm sm:text-base leading-relaxed max-w-[620px]">
              Poltica Systems delivers high-capacity, direct-carrier telecom routing for political campaigns. Orchestrate carrier-grade SMS, verified Meta WhatsApp broadcast API, and interactive automated cloud IVR phone dialers in one single secured tenant console.
            </p>
          </div>

          {/* Interactive Live Metrics Mock Console */}
          <div className="glass-card p-6 space-y-5 hover:scale-[1.01] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="h-4.5 w-4.5 text-[#2563eb]" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                  Global Campaign Delivery Console
                </span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/50 dark:bg-zinc-950/40 p-4 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wide">SMS Bandwidth</span>
                <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100 block mt-0.5">12,000 / sec</span>
                <span className="text-[9px] text-[#16a34a] font-semibold block mt-1">✓ DLT Route Active</span>
              </div>
              <div className="bg-white/50 dark:bg-zinc-950/40 p-4 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wide">WA Cloud Node</span>
                <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100 block mt-0.5">Meta Cloud API</span>
                <span className="text-[9px] text-[#16a34a] font-semibold block mt-1">✓ Official Session</span>
              </div>
              <div className="bg-white/50 dark:bg-zinc-950/40 p-4 rounded-lg border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wide">IVR Parallel lines</span>
                <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100 block mt-0.5">850 Ports</span>
                <span className="text-[9px] text-[#16a34a] font-semibold block mt-1">✓ Live PRI Dialers</span>
              </div>
            </div>

            {/* Architecture Steps visual */}
            <div className="space-y-2.5 pt-2 text-[11px] border-t border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2.5 text-zinc-650 dark:text-zinc-300">
                <Check className="h-4 w-4 text-[#16a34a] shrink-0" />
                <span>Intermediary Exemption governed under <strong>Section 79 of Information Technology Act, 2000</strong>.</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-650 dark:text-zinc-300">
                <Check className="h-4 w-4 text-[#16a34a] shrink-0" />
                <span>100% Client&apos;s own interest: Company held completely immune from campaign liabilities.</span>
              </div>
            </div>
          </div>

          {/* Infrastructure Feature Catalog */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="flex gap-4 p-3 rounded-lg hover:bg-white/40 dark:hover:bg-zinc-900/30 transition-all duration-300">
              <div className="h-9 w-9 bg-[#2563eb]/10 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <Radio className="h-4.5 w-4.5 text-[#2563eb]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">DLT Carrier Bindings</h4>
                <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">Register corporate DLT headers and template scripts with direct telecom operator integration.</p>
              </div>
            </div>

            <div className="flex gap-4 p-3 rounded-lg hover:bg-white/40 dark:hover:bg-zinc-900/30 transition-all duration-300">
              <div className="h-9 w-9 bg-[#10b981]/10 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <Globe className="h-4.5 w-4.5 text-[#10b981]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Public Campaign Page URL</h4>
                <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">Automatically compiled public web pages where citizens view profile data and download campaign materials.</p>
              </div>
            </div>

            <div className="flex gap-4 p-3 rounded-lg hover:bg-white/40 dark:hover:bg-zinc-900/30 transition-all duration-300">
              <div className="h-9 w-9 bg-[#dc2626]/10 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <FileSpreadsheet className="h-4.5 w-4.5 text-[#dc2626]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Unified Voter Contact Sheets</h4>
                <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">Segment constituency target numbers via CSV logs to run customized parallel phone outreach.</p>
              </div>
            </div>

            <div className="flex gap-4 p-3 rounded-lg hover:bg-white/40 dark:hover:bg-zinc-900/30 transition-all duration-300">
              <div className="h-9 w-9 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Secured Payments Ledger</h4>
                <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">Transactions processed securely via international grade SSL certified payment pipelines.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Hand: Interactive Portal Access & Signup Console */}
        <section className="lg:col-span-5">
          <div className="bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(37,99,235,0.08)] dark:shadow-[0_20px_50px_rgba(37,99,235,0.15)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(37,99,235,0.15)] hover:scale-[1.005]">
            <div className="h-[4px] bg-gradient-to-r from-[#2563eb] via-[#10b981] to-[#2563eb] w-full" />
            
            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setAuthError(""); setOtpSent(false); setSignupStep(1); }} className="flex flex-col w-full">
              <div className="px-6 pt-5 border-b border-zinc-100 dark:border-zinc-900">
                <TabsList className="grid w-full grid-cols-2 bg-zinc-100/80 dark:bg-zinc-850 p-1 h-[38px] rounded-lg">
                  <TabsTrigger value="signin" className="text-xs font-semibold rounded-md transition-all duration-200">Sign In Portal</TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs font-semibold rounded-md transition-all duration-200">Candidate Signup</TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="pt-6 px-6 pb-8">
                {authError && (
                  <div className="mb-4 bg-[#fef2f2] dark:bg-zinc-950/40 border-l-4 border-[#dc2626] p-3.5 rounded-r-md text-[12px] text-[#dc2626] flex items-start gap-2.5 animate-scale-in">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{authError}</span>
                  </div>
                )}

                {/* SIGN IN VIEW */}
                <TabsContent value="signin" className="m-0 space-y-4 animate-scale-fade">
                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-5 animate-scale-fade">
                      <div className="space-y-1">
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Candidate Login</h2>
                        <p className="text-[12px] text-[#64748b] dark:text-zinc-400">Provide your registered mobile ID to receive a secure access code.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mobile" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">10-Digit Mobile ID</Label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                          <Input
                            id="mobile"
                            type="text"
                            placeholder="9876543210"
                            value={loginMobile}
                            onChange={(e) => setLoginMobile(e.target.value)}
                            maxLength={10}
                            required
                            className="pl-9 h-10 text-[13px] border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0 bg-white/50 dark:bg-zinc-900/50"
                          />
                        </div>
                      </div>

                      <Button type="submit" disabled={isSendingOtp} className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white h-10 rounded-lg font-bold text-xs gap-2 shadow-sm transition-all hover:scale-[1.02]">
                        {isSendingOtp ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Request Passcode"} <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-5 animate-scale-fade">
                      <div className="space-y-1">
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Verify Passcode</h2>
                        <p className="text-[12px] text-[#64748b] dark:text-zinc-400">Passcode issued to (+91) {loginMobile}</p>
                      </div>

                      {generatedOtp ? (
                        <div className="bg-[#fffbeb] dark:bg-zinc-950/40 border-l-4 border-[#f59e0b] p-4 rounded-r-md text-[12px] text-[#b45309] dark:text-zinc-300 flex items-start gap-2.5 select-all animate-scale-in">
                          <Lock className="h-4.5 w-4.5 shrink-0 mt-0.5 text-[#b45309]" />
                          <div>
                            <p className="font-bold text-xs">Simulated Gateway Response</p>
                            <p className="mt-1">Use Passcode: <strong className="text-[15px] text-zinc-900 dark:text-white tracking-widest">{generatedOtp}</strong> to authorize.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#f0fdf4] dark:bg-zinc-950/40 border-l-4 border-[#16a34a] p-4 rounded-r-md text-[12px] text-[#16a34a] flex items-start gap-2.5 animate-scale-in">
                          <ShieldCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-xs">OTP Dispatched</p>
                            <p className="mt-1">A 6-digit passcode has been sent to (+91) {loginMobile}.</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="otp" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">6-Digit Passcode</Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="000000"
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value)}
                          maxLength={6}
                          required
                          className="text-center tracking-[6px] font-bold text-[16px] h-10 border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563eb] bg-white/50 dark:bg-zinc-900/50"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setOtpSent(false)} className="w-1/2 border-[#e2e8f0] dark:border-zinc-700 h-10 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900">
                          Change ID
                        </Button>
                        <Button type="submit" disabled={isVerifying} className="w-1/2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white h-10 rounded-lg font-bold text-xs transition-all hover:scale-[1.02]">
                          {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Verify Session"}
                        </Button>
                      </div>
                    </form>
                  )}
                </TabsContent>

                {/* SIGN UP WIZARD VIEW */}
                <TabsContent value="signup" className="m-0 space-y-4 animate-scale-fade">
                  {signupStep <= 4 && (
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 pb-2.5 mb-1 select-none">
                      <span className="font-medium">Console Setup {signupStep} of 4</span>
                      <span className="font-bold text-[#2563eb] bg-[#2563eb]/10 px-2 py-0.5 rounded-sm">
                        {signupStep === 1 && "Basic Details"}
                        {signupStep === 2 && "OTP Verification"}
                        {signupStep === 3 && "Outreach Estimator"}
                        {signupStep === 4 && "Final Payment"}
                      </span>
                    </div>
                  )}

                  {/* STEP 1: Basic details */}
                  {signupStep === 1 && (
                    <form onSubmit={handleSendSignupOtp} className="space-y-4 animate-scale-fade">
                      <div className="space-y-1">
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Candidate Account Setup</h2>
                        <p className="text-[12px] text-[#64748b] dark:text-zinc-400">Enter your details. Your mobile number acts as your gateway ID.</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="regPincode" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Constituency PIN Code</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                            <Input
                              id="regPincode"
                              type="text"
                              placeholder="6-digit PIN code, e.g. 411030"
                              value={regPincode}
                              onChange={(e) => setRegPincode(e.target.value)}
                              maxLength={6}
                              required
                              className="pl-9 pr-8 h-10 text-[13px] border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg bg-white/50 dark:bg-zinc-900/50"
                            />
                            {isLoadingPincode && (
                              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-[#2563eb]" />
                            )}
                          </div>
                        </div>

                        {villageList.length > 0 && (
                          <div className="space-y-1.5 animate-scale-in">
                            <Label htmlFor="regVillageSelect" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Select Ward / Constituency village</Label>
                            <select
                              id="regVillageSelect"
                              value={regArea}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRegArea(val);
                                const matched = villageList.find(v => v.name === val);
                                if (matched) {
                                  setRegDistrict(matched.district);
                                  setRegState(matched.state);
                                }
                              }}
                              className="flex h-10 w-full rounded-lg border border-[#e2e8f0] dark:border-[#2D2D2D] bg-white px-3 py-1.5 text-[13px] text-[#1e293b] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#2563eb] dark:bg-zinc-900 dark:text-white"
                            >
                              {villageList.map((village) => (
                                <option key={village.name} value={village.name}>
                                  {village.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label htmlFor="regName" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Candidate Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                            <Input
                              id="regName"
                              type="text"
                              placeholder="Rahul Sharma"
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              required
                              className="pl-9 h-10 text-[13px] border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg bg-white/50 dark:bg-zinc-900/50"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="regMobile" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">10-Digit Mobile ID</Label>
                          <div className="relative">
                            <Smartphone className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                            <Input
                              id="regMobile"
                              type="text"
                              placeholder="9876543210"
                              value={regMobile}
                              onChange={(e) => setRegMobile(e.target.value)}
                              maxLength={10}
                              required
                              className="pl-9 h-10 text-[13px] border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg bg-white/50 dark:bg-zinc-900/50"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="regDistrict" className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">District</Label>
                            <Input id="regDistrict" type="text" value={regDistrict} readOnly className="h-9 text-[12px] bg-zinc-100/50 dark:bg-zinc-900/50 border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg cursor-not-allowed" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="regState" className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">State</Label>
                            <Input id="regState" type="text" value={regState} readOnly className="h-9 text-[12px] bg-zinc-100/50 dark:bg-zinc-900/50 border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg cursor-not-allowed" />
                          </div>
                        </div>
                      </div>

                      {/* Consent checkbox — mandatory to register */}
                      <div className="flex items-start gap-2.5 pt-2 select-none">
                        <input
                          id="regConsent"
                          type="checkbox"
                          checked={regConsent}
                          onChange={(e) => setRegConsent(e.target.checked)}
                          required
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 cursor-pointer accent-[#2563eb]"
                        />
                        <label htmlFor="regConsent" className="text-[10px] text-zinc-550 dark:text-zinc-400 leading-relaxed cursor-pointer">
                          I have read, understood and agree to the{" "}
                          <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#2563eb] font-bold hover:underline"
                          >
                            Terms &amp; Conditions
                          </a>{" "}
                          and{" "}
                          <a
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#2563eb] font-bold hover:underline"
                          >
                            Privacy Policy
                          </a>. I accept that Poltica Systems is only a technology (SaaS) tool
                          provider and an intermediary under Sec&nbsp;79 of the IT Act 2000, and that
                          all campaigns, content, voter data and communications are run{" "}
                          <strong className="text-zinc-600 dark:text-zinc-300">solely at my own interest, risk and legal responsibility</strong>{" "}
                          — I alone am liable and answerable for any legal issue, complaint or
                          consequence arising from my use of the platform.
                        </label>
                      </div>

                      <Button type="submit" disabled={!regConsent} className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white h-10 rounded-lg font-bold text-xs gap-1.5 mt-2 transition-all hover:scale-[1.02] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                        Next: Verify ID <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>
                  )}

                  {/* STEP 2: Mobile verification */}
                  {signupStep === 2 && (
                    <form onSubmit={handleVerifySignupOtp} className="space-y-4 animate-scale-fade">
                      <div className="space-y-1">
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Gateway Authorization</h2>
                        <p className="text-[12px] text-[#64748b] dark:text-zinc-400">Passcode issued to (+91) {regMobile}.</p>
                      </div>

                      {signupGeneratedOtp ? (
                        <div className="bg-[#fffbeb] dark:bg-zinc-950/40 border-l-4 border-[#f59e0b] p-4 rounded-r-md text-[12px] text-[#b45309] dark:text-zinc-300 flex items-start gap-2.5 select-all animate-scale-in">
                          <Lock className="h-4.5 w-4.5 shrink-0 mt-0.5 text-[#b45309]" />
                          <div>
                            <p className="font-bold text-xs">Simulated Passcode</p>
                            <p className="mt-1">Use code: <strong className="text-[15px] text-zinc-900 dark:text-white tracking-widest">{signupGeneratedOtp}</strong></p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-[#f0fdf4] dark:bg-zinc-950/40 border-l-4 border-[#16a34a] p-4 rounded-r-md text-[12px] text-[#16a34a] flex items-start gap-2.5 animate-scale-in">
                          <ShieldCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-xs">OTP Sent Successfully</p>
                            <p className="mt-1">A 6-digit passcode has been sent to (+91) {regMobile}.</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="signupOtp" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">6-Digit Verification Code</Label>
                        <Input
                          id="signupOtp"
                          type="text"
                          placeholder="000000"
                          value={signupEnteredOtp}
                          onChange={(e) => setSignupEnteredOtp(e.target.value)}
                          maxLength={6}
                          required
                          className="text-center tracking-[6px] font-bold text-[16px] h-10 border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg focus-visible:ring-1 focus-visible:ring-[#2563eb] bg-white/50 dark:bg-zinc-900/50"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setSignupStep(1)} className="w-1/3 border-[#e2e8f0] dark:border-zinc-700 h-10 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900">
                          Back
                        </Button>
                        <Button type="submit" disabled={isSignupVerifying} className="w-2/3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white h-10 rounded-lg font-bold text-xs transition-all hover:scale-[1.02] shadow-sm">
                          {isSignupVerifying ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Verify & Continue"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* STEP 3: Dynamic Price Planner */}
                  {signupStep === 3 && (
                    <form onSubmit={handleNextToPayment} className="space-y-4 animate-scale-fade">
                      <div className="space-y-1">
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Campaign Capacity Planner</h2>
                        <p className="text-[12px] text-[#64748b] dark:text-zinc-400">Configure target audience reach and communication frequency credits.</p>
                      </div>

                      <div className="space-y-4">
                        {/* Voter Count slider */}
                        <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 shadow-inner">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="population" className="text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Constituency Reach</Label>
                            <span className="text-xs font-bold text-[#2563eb] bg-[#2563eb]/10 px-2.5 py-0.5 rounded-full">
                              {population.toLocaleString()} Voters
                            </span>
                          </div>
                          <div className="flex gap-4 items-center">
                            <input
                              id="populationSlider"
                              type="range"
                              min="1000"
                              max="300000"
                              step="1000"
                              value={population}
                              onChange={(e) => setPopulation(Number(e.target.value))}
                              className="w-2/3 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
                            />
                            <Input
                              id="population"
                              type="number"
                              value={population}
                              min="1000"
                              max="1000000"
                              onChange={(e) => setPopulation(Math.max(0, Number(e.target.value)))}
                              className="w-1/3 h-8 text-[12px] border-[#e2e8f0] dark:border-zinc-700 px-2.5 rounded-lg text-right font-semibold"
                            />
                          </div>
                        </div>

                        {/* Resource Slider lists */}
                        <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-800 rounded-xl">
                          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Credits Per Voter</span>
                          
                          {/* SMS */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-zinc-850 dark:text-zinc-300">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <MessageSquare className="h-4 w-4 text-[#2563eb] shrink-0" /> SMS (₹0.50)
                              </span>
                              <span className="font-bold">{smsPerPerson}x Messages</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={smsPerPerson}
                              onChange={(e) => setSmsPerPerson(Number(e.target.value))}
                              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
                            />
                            <div className="flex justify-between text-[10px] text-zinc-400">
                              <span>Qty: {smsQty.toLocaleString()}</span>
                              <span className="font-bold text-zinc-750 dark:text-zinc-300">₹{smsCost.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* WhatsApp */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-zinc-850 dark:text-zinc-300">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <MessageCircle className="h-4 w-4 text-[#16a34a] shrink-0" /> WhatsApp (₹1.00)
                              </span>
                              <span className="font-bold">{waPerPerson}x Messages</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="10"
                              step="1"
                              value={waPerPerson}
                              onChange={(e) => setWaPerPerson(Number(e.target.value))}
                              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#16a34a]"
                            />
                            <div className="flex justify-between text-[10px] text-zinc-400">
                              <span>Qty: {waQty.toLocaleString()}</span>
                              <span className="font-bold text-zinc-750 dark:text-zinc-300">₹{waCost.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* IVR Voice calls */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-zinc-850 dark:text-zinc-300">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <PhoneCall className="h-4 w-4 text-[#dc2626] shrink-0" /> Cloud IVR (₹0.95)
                              </span>
                              <span className="font-bold">{ivrPerPerson}x Audio Calls</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="5"
                              step="1"
                              value={ivrPerPerson}
                              onChange={(e) => setIvrPerPerson(Number(e.target.value))}
                              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#dc2626]"
                            />
                            <div className="flex justify-between text-[10px] text-zinc-400">
                              <span>Qty: {ivrQty.toLocaleString()}</span>
                              <span className="font-bold text-zinc-750 dark:text-zinc-300">₹{ivrCost.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Calculated base estimate */}
                        <div className="border border-dashed border-[#e2e8f0] dark:border-zinc-800 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/20">
                          <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-white">
                            <span>Electoral Budget Plan:</span>
                            <span className="text-[#2563eb] text-base">₹{finalPrice.toLocaleString()}</span>
                          </div>
                          {finalPrice === 55000 && (
                            <p className="text-[9px] text-zinc-400 text-right mt-1.5">
                              * Includes base SLA software setup and DLT setup fee
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setSignupStep(2)} className="w-1/3 border-[#e2e8f0] dark:border-zinc-700 h-10 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900">
                          Back
                        </Button>
                        <Button type="submit" className="w-2/3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white h-10 rounded-lg font-bold text-xs transition-all hover:scale-[1.02] shadow-sm">
                          Pay Plan (₹{finalPrice.toLocaleString()})
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* STEP 4: Checkout payment gateway */}
                  {signupStep === 4 && (
                    <form onSubmit={completePayment} className="space-y-4 animate-scale-fade">
                      <div className="space-y-1">
                        <h2 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Payment Terminal</h2>
                        <p className="text-[12px] text-[#64748b] dark:text-zinc-400">Razorpay Direct API payment simulation.</p>
                      </div>

                      <div className="bg-[#EFF6FC] dark:bg-[#1a2d3c] border border-[#2563eb]/10 p-4 rounded-xl text-[11px] text-[#2563eb] space-y-1">
                        <p className="font-bold">Allocated Capacity Quotas:</p>
                        <p>• SMS Credits: {smsQty.toLocaleString()}</p>
                        <p>• WhatsApp Credits: {waQty.toLocaleString()}</p>
                        <p>• Voice IVR Credits: {ivrQty.toLocaleString()}</p>
                        <p className="font-extrabold border-t border-[#2563eb]/15 mt-1.5 pt-1.5 text-xs">Total Charged: ₹{finalPrice.toLocaleString()}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="cardName" className="text-xs font-bold">Cardholder Name</Label>
                          <Input id="cardName" type="text" placeholder="Rahul Sharma" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} required className="h-9 text-xs border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg bg-white/50 dark:bg-zinc-900/50" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="cardNumber" className="text-xs font-bold">Card Number</Label>
                          <Input id="cardNumber" type="text" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required className="h-9 text-xs border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg bg-white/50 dark:bg-zinc-900/50" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="expiry" className="text-xs font-bold">Expiry Date</Label>
                            <Input id="expiry" type="text" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} required className="h-9 text-xs border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg bg-white/50 dark:bg-zinc-900/50" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="cvc" className="text-xs font-bold">CVC Code</Label>
                            <Input id="cvc" type="text" placeholder="000" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} required maxLength={3} className="h-9 text-xs border-[#e2e8f0] dark:border-[#2D2D2D] rounded-lg bg-white/50 dark:bg-zinc-900/50" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#f0fdf4] dark:bg-zinc-950/40 border-l-4 border-[#16a34a] p-3 rounded-r-md text-[10px] text-[#16a34a] flex gap-2 font-semibold items-center">
                        <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
                        <span>Protected by Razorpay SECURE SSL 256-bit gateway.</span>
                      </div>

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setSignupStep(3)} className="w-1/3 border-[#e2e8f0] dark:border-zinc-700 h-10 rounded-lg text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900">
                          Back
                        </Button>
                        <Button type="submit" disabled={isPaying} className="w-2/3 bg-[#16a34a] hover:bg-[#0c5c0c] text-white h-10 rounded-lg font-bold text-xs transition-all hover:scale-[1.02] shadow-sm">
                          {isPaying ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Complete Transaction`}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* STEP 5: Success screen redirection */}
                  {signupStep === 5 && (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-5 select-none animate-scale-in">
                      <div className="h-14 w-14 bg-[#f0fdf4] rounded-full flex items-center justify-center text-[#16a34a] shadow-sm">
                        <CheckCircle2 className="h-7 w-7" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Outreach Active</h2>
                        <p className="text-[12px] text-zinc-400">Campaign tenant allocated for {regName}.</p>
                      </div>
                      <div className="bg-[#EFF6FC] dark:bg-[#1a2d3c]/50 border border-[#2563eb]/10 p-3 rounded-lg text-[11px] text-[#2563eb] font-mono font-bold shadow-inner">
                        Gateway ID: {regMobile}
                      </div>
                      <div className="text-[10px] text-zinc-400 animate-pulse font-medium">Launching Candidate Dashboard Workspace...</div>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </div>
        </section>
      </main>

      {/* Compliance / Intermediary Exemption Panel */}
      <section className="bg-white/50 dark:bg-black/30 border-y border-[#e2e8f0]/30 dark:border-zinc-800/40 py-10 select-none backdrop-blur-md">
        <div className="max-w-[1280px] w-full mx-auto px-6 grid gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">TRAI/DLT Routing Status</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              We coordinate transactional and promotional routes via registered carrier gateways, adhering fully to ECI MCC guidelines. Candidates provide approved content templates.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">IT Act 2000 Section 79 Compliance</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Poltica Systems (octaleads Private Limited) acts strictly as a technology intermediary pipeline. The candidate accepts sole responsibility, risk, and cost for messages transmitted.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Secure Hosting & Privacy</h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              All constituent numbers and custom profile details are siloed per tenant. Platform does not access voter registries. Protected under standard database encryption policies.
            </p>
          </div>
        </div>
      </section>

      {/* Corporate registered footer */}
      <footer className="bg-zinc-100/50 dark:bg-[#0c0c0c] py-10 text-zinc-500 border-t border-zinc-200/50 dark:border-zinc-900 select-none text-[11px]">
        <div className="max-w-[1280px] w-full mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 text-left">
            <p className="font-bold text-zinc-800 dark:text-zinc-200 uppercase text-xs">
              Poltica Systems
            </p>
            <p className="max-w-[500px]">
              A Campaign Communications Intermediary Brand powered by <strong>octaleads Private Limited</strong>.
            </p>
            <p className="text-[10px] text-zinc-400">
              Reg Office: Flat 12, Sahakar Niwas, Near Shaniwar Wada, Pune, Maharashtra - 411030
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1.5 text-center md:text-right">
            <p className="flex items-center gap-1 justify-center">
              <ShieldCheck className="h-3.5 w-3.5" /> Secured SSL Communications System.
            </p>
            <p>
              © 2026 octaleads Private Limited. All rights reserved. Subject to Indian Judiciary.
            </p>
          </div>
        </div>
      </footer>

      {/* Terms of Service & Intermediary Exemption Dialog */}
      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-[500px] bg-white dark:bg-[#1b1b1b] border border-[#e2e8f0] dark:border-[#333] max-h-[80vh] flex flex-col p-6 rounded-md">
          <DialogHeader className="pb-3 border-b border-[#e2e8f0] dark:border-[#333]">
            <DialogTitle className="text-[13px] font-bold uppercase tracking-wider text-[#1e293b] dark:text-white">
              Terms of Service & Intermediary Disclaimer
            </DialogTitle>
            <DialogDescription className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
              Legal compliance under the Information Technology Act, 2000 (India) & TRAI / ECI rules.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-3 space-y-3.5 font-sans text-[11px] leading-relaxed text-[#1e293b] dark:text-zinc-300">
            <div>
              <h3 className="font-bold text-xs uppercase text-[#2563eb] mb-1">1. Ownership & Brand Identity</h3>
              <p>
                The campaign software, portal brand <strong>Poltica Systems</strong>, and its communication pipelines (SMS, WhatsApp, and Voice Broadcast/IVR) are developed, operated, and powered by <strong>octaleads Private Limited</strong>.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xs uppercase text-[#2563eb] mb-1">2. Intermediary Protection (Section 79, IT Act, 2000)</h3>
              <p>
                <strong>octaleads Private Limited</strong> is strictly an &ldquo;Intermediary&rdquo; under Indian law. The company provides a technical pipeline and holds no editorial responsibility, prior knowledge, or influence over the text, audio recordings, templates, or media transmitted by the candidate.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xs uppercase text-[#2563eb] mb-1">3. 100% Customer&apos;s Own Interest, Risk & Consequences</h3>
              <p>
                All campaigns, broadcasts, and voter communication requests processed through the platform are executed at the Customer&apos;s own interest, cost, risk, and consequences. The Customer assumes 100% of all risks, legal liabilities, or outcomes of utilizing this campaign infrastructure. The Customer warrants to fully indemnify and hold <strong>octaleads Private Limited</strong>, its directors, and gateway providers completely immune and risk-free from all legal proceedings, police cases, TRAI complaints, court summons, or fines.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xs uppercase text-[#2563eb] mb-1">4. Privacy Policy & Data Security</h3>
              <p>
                Under Section 43A of the IT Act, 2000, we follow standard security practices to protect data. However, the Candidate remains the legal custodian of all voter data they import. The platform never shares or accesses candidate registries.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-xs uppercase text-[#2563eb] mb-1">5. Jurisdiction</h3>
              <p>
                Any dispute, litigation, or legal claim is subject to the exclusive jurisdiction of the competent courts in India.
              </p>
            </div>
          </div>
          
          <DialogFooter className="pt-3 border-t border-[#e2e8f0] dark:border-[#333]">
            <Button size="sm" className="w-full bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-xs h-9 rounded-sm font-semibold" onClick={() => setTermsOpen(false)}>
              Accept Legal Terms & Disclaimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
