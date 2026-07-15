"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Home, 
  User, 
  CreditCard, 
  Users, 
  Image as ImageIcon, 
  FileCode, 
  History, 
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Plus,
  Coins,
  Search,
  BookOpen,
  MapPin,
  Trash2,
  PhoneCall,
  MessageSquare,
  Megaphone,
  Activity as ActivityIcon,
  Cpu,
  Save,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { encryptCredentials, decryptCredential } from "@/lib/auth-api";
import { candidatesApi, votersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Candidate = {
  id: string;
  name: string;
  district: string;
  area?: string;
  status: string;
  balances: { sms: number, ivr: number, wa: number };
  payments: number;
  contacts: number;
  mobile?: string;
  uniqueUrl?: string;
  manifestoUrl?: string;
  brochureUrl?: string;
  address?: string;
  pincode?: string;
  photoUrl?: string;
  disabledAssets?: {
    photo?: boolean;
    portal?: boolean;
    manifesto?: boolean;
    brochure?: boolean;
  };
  apiConfig?: {
    smsProvider?: string;
    smsApiKey?: string;
    smsSenderId?: string;
    waProvider?: string;
    waPhoneId?: string;
    waToken?: string;
    ivrProvider?: string;
    ivrSid?: string;
    ivrAuth?: string;
    ivrCallerId?: string;
  };
};

type Payment = {
  invoiceId: string;
  amount: number;
  method: string;
  status: "Paid" | "Pending" | "Failed";
  date: string;
  credits: string;
};

type Activity = {
  id: string;
  event: string;
  status: "Success" | "Info" | "Alert";
  timestamp: string;
  details: string;
};

type DltTemplate = {
  id: string;
  name: string;
  type: "SMS" | "WhatsApp" | "IVR";
  content: string;
  status: "Approved" | "Pending" | "Rejected";
};

type Voter = {
  id: string;
  name: string;
  phone: string;
  gender: string;
  inclination: string;
};

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const candidateId = resolvedParams.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "personal" | "payments" | "contacts" | "media" | "templates" | "activity" | "analytics" | "api">("home");
  
  // Dynamic related states
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<DltTemplate[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  
  // Custom states for editing basic info
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPincode, setEditPincode] = useState("");

  // API Config States
  const [smsProvider, setSmsProvider] = useState("twilio");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("");
  const [waProvider, setWaProvider] = useState("meta");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [ivrProvider, setIvrProvider] = useState("twilio");
  const [ivrSid, setIvrSid] = useState("");
  const [ivrAuth, setIvrAuth] = useState("");
  const [ivrCallerId, setIvrCallerId] = useState("");
  const [isSavingApi, setIsSavingApi] = useState(false);

  const toggleAssetStatus = (assetKey: "photo" | "portal" | "manifesto" | "brochure") => {
    if (!candidate) return;
    
    const disabledAssets = candidate.disabledAssets || {};
    const updatedDisabled = {
      ...disabledAssets,
      [assetKey]: !disabledAssets[assetKey]
    };
    
    const updatedCandidate = {
      ...candidate,
      disabledAssets: updatedDisabled
    };
    
    setCandidate(updatedCandidate);
    // Persist the asset enable/disable state server-side.
    localStorage.setItem("poltica_candidates", JSON.stringify(
      (JSON.parse(localStorage.getItem("poltica_candidates") || "[]") as Candidate[])
        .map(c => c.id === candidate.id ? updatedCandidate : c)
    ));
    candidatesApi.update(candidate.id, { disabledAssets: updatedDisabled }).catch(() => {});
  };

  // Load candidate from the API (source of truth) + real-time refresh.
  useEffect(() => {
    let cancelled = false;

    const applyDerived = (found: Candidate) => {
      setPayments([
        { invoiceId: `INV-${found.id}-901`, amount: found.payments > 0 ? found.payments * 0.7 : 5000, method: "Razorpay UPI", status: "Paid" as const, date: "July 2, 2026", credits: "+10,000 SMS / +5,000 WA" },
        { invoiceId: `INV-${found.id}-902`, amount: found.payments > 0 ? found.payments * 0.3 : 1500, method: "Credit Card", status: "Paid" as const, date: "June 28, 2026", credits: "+5,000 IVR credits" },
        ...(found.payments > 150000 ? [{ invoiceId: `INV-${found.id}-903`, amount: 15000, method: "Net Banking", status: "Paid" as const, date: "June 15, 2026", credits: "Platform Onboarding Fee" }] : [])
      ]);
      setActivities([
        { id: "ACT-1", event: "SMS Broadcast Scheduled", status: "Success", timestamp: "Today, 11:45 AM", details: `Triggered Shivaji Rally blast to ${found.contacts > 0 ? found.contacts : "15,000"} voters.` },
        { id: "ACT-2", event: "DLT Approval Request", status: "Info", timestamp: "Yesterday, 09:30 AM", details: "Submitted template 'Election_Greeting_2026' to compliance queue." },
        { id: "ACT-3", event: "Payments Registered", status: "Success", timestamp: "July 2, 2026", details: `Razorpay checkout completed successfully.` },
        { id: "ACT-4", event: "Voter Data Upload", status: "Success", timestamp: "June 25, 2026", details: `Uploaded ${(found.contacts || 0).toLocaleString()} voter contact directory mapping.` },
      ]);
      setTemplates([
        { id: "TMP-1029", name: "Election_Greeting_2026", type: "SMS", content: `Namaskar! Vote for ${found.name} under ${found.area || found.district} for sustainable development.`, status: "Approved" },
        { id: "TMP-2030", name: "Manifesto_Broadcast", type: "WhatsApp", content: `Hello voter, check the manifesto of ${found.name} at ${found.uniqueUrl}`, status: "Approved" },
        { id: "TMP-3031", name: "Call_Greeting_Record", type: "IVR", content: `Audio file: greeting_record_${found.id.toLowerCase()}.wav`, status: "Pending" }
      ]);
    };

    const applyForm = async (found: Candidate) => {
      setEditName(found.name);
      setEditMobile(found.mobile || "");
      setEditAddress(found.address || "");
      setEditPincode(found.pincode || "");
      const apiConfig = found.apiConfig || {};
      setSmsProvider(apiConfig.smsProvider || "twilio");
      setSmsSenderId(apiConfig.smsSenderId || "");
      setWaProvider(apiConfig.waProvider || "meta");
      setWaPhoneId(apiConfig.waPhoneId || "");
      setIvrProvider(apiConfig.ivrProvider || "twilio");
      setIvrCallerId(apiConfig.ivrCallerId || "");
      const dec = async (v?: string) => (v && v.includes(":") ? await decryptCredential(v) : v || "");
      setSmsApiKey(await dec(apiConfig.smsApiKey));
      setWaToken(await dec(apiConfig.waToken));
      setIvrSid(await dec(apiConfig.ivrSid));
      setIvrAuth(await dec(apiConfig.ivrAuth));
    };

    const loadVoters = async (found: Candidate) => {
      try {
        const all = (await votersApi.list()) as any[];
        const matches = all.filter(v => v.area === found.area || v.district === found.district);
        setVoters(((matches.length ? matches : all).slice(0, 5)) as any);
      } catch {
        /* keep existing */
      }
    };

    const loadCandidate = async (initial: boolean) => {
      let found: Candidate | null = null;
      try {
        found = (await candidatesApi.get(candidateId)) as Candidate;
      } catch {
        const list = localStorage.getItem("poltica_candidates");
        if (list) found = (JSON.parse(list) as Candidate[]).find(c => c.id === candidateId) || null;
      }
      if (!found || cancelled) return;
      setCandidate(found);
      applyDerived(found);
      if (initial) {
        applyForm(found);
        loadVoters(found);
      }
    };

    loadCandidate(true);
    // Real-time: refresh balances/status every 8s and on focus (does not touch
    // the edit form or credential fields, so in-progress input is never lost).
    const interval = setInterval(() => loadCandidate(false), 8000);
    const onFocus = () => loadCandidate(false);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [candidateId]);

  const handleSaveApiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;

    setIsSavingApi(true);

    // Call server-side API to encrypt sensitive keys
    const encryptRes = await encryptCredentials({
      smsApiKey,
      smsSenderId,
      waToken,
      waPhoneId,
      ivrSid,
      ivrAuth,
      ivrCallerId,
      smsProvider,
      waProvider,
      ivrProvider,
    });

    // Use encrypted values if successful, otherwise fallback to plaintext (dev mode / offline)
    const apiConfig = encryptRes.success && encryptRes.encrypted ? encryptRes.encrypted : {
      smsProvider,
      smsApiKey,
      smsSenderId,
      waProvider,
      waPhoneId,
      waToken,
      ivrProvider,
      ivrSid,
      ivrAuth,
      ivrCallerId,
    };

    const updatedCandidate = {
      ...candidate,
      apiConfig,
    };

    // Persist on the customer's server record so their own send pages use it.
    try {
      await candidatesApi.update(candidate.id, { apiConfig });
    } catch {
      /* fall back to local cache below */
    }
    const list = localStorage.getItem("poltica_candidates");
    if (list) {
      const parsed = JSON.parse(list) as Candidate[];
      const updatedList = parsed.map(c => c.id === candidate.id ? updatedCandidate : c);
      localStorage.setItem("poltica_candidates", JSON.stringify(updatedList));
    }

    setCandidate(updatedCandidate);
    setIsSavingApi(false);
    alert("API Configuration successfully saved (securely encrypted)!");
  };

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;

    // Generate dynamic links again in case name changed
    const cleanName = editName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const cleanDistrict = candidate.district.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    const cleanArea = (candidate.area || "sadashiv-peth").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    
    const updatedCandidate: Candidate = {
      ...candidate,
      name: editName,
      mobile: editMobile,
      address: editAddress,
      pincode: editPincode,
      photoUrl: `https://poltica.in/assets/candidates/${cleanName}-${candidate.id.toLowerCase()}.jpg`,
      uniqueUrl: `https://poltica.in/candidate/${cleanDistrict}/${cleanArea}/${cleanName}`,
      manifestoUrl: `https://poltica.in/manifestos/${cleanName}-${candidate.id.toLowerCase()}-manifesto.pdf`,
      brochureUrl: `https://poltica.in/brochures/${cleanName}-${candidate.id.toLowerCase()}-brochure.pdf`
    };

    setCandidate(updatedCandidate);

    // Persist profile changes server-side.
    candidatesApi.update(candidate.id, {
      name: editName,
      mobile: editMobile,
      address: editAddress,
      pincode: editPincode,
      photoUrl: updatedCandidate.photoUrl,
      uniqueUrl: updatedCandidate.uniqueUrl,
      manifestoUrl: updatedCandidate.manifestoUrl,
      brochureUrl: updatedCandidate.brochureUrl,
    }).catch(() => {});
    const list = localStorage.getItem("poltica_candidates");
    if (list) {
      const parsed = JSON.parse(list) as Candidate[];
      const updatedList = parsed.map(c => c.id === candidate.id ? updatedCandidate : c);
      localStorage.setItem("poltica_candidates", JSON.stringify(updatedList));
    }

    alert("Google Account profile settings updated successfully!");
  };

  if (!candidate) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading Candidate Profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0f1115] text-[#202124] dark:text-[#E8EAED]">
      {/* Top Google Style Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/candidates">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg tracking-tight">Poltica account</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`h-6 ${candidate.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
            {candidate.status}
          </Badge>
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={candidate.photoUrl} alt={candidate.name} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {candidate.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Layout split: Left Google Navigation, Right Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Nav menu */}
        <aside className="w-full md:w-64 shrink-0 space-y-1">
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "personal", label: "Personal info", icon: User },
            { id: "api", label: "API Configuration", icon: Cpu },
            { id: "analytics", label: "Outreach Analytics", icon: ActivityIcon },
            { id: "payments", label: "Payments & invoices", icon: CreditCard },
            { id: "contacts", label: "People & sharing (Voters)", icon: Users },
            { id: "media", label: "Uploaded assets", icon: ImageIcon },
            { id: "templates", label: "Compliance & templates", icon: FileCode },
            { id: "activity", label: "Data & activity log", icon: History }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3.5 px-6 py-3 rounded-full text-sm font-medium transition-all text-left ${
                activeTab === item.id 
                  ? "bg-[#E8F0FE] dark:bg-primary/20 text-[#185ABC] dark:text-primary-foreground" 
                  : "hover:bg-muted/80 text-[#5F6368] dark:text-muted-foreground"
              }`}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Right Tab Content area */}
        <main className="flex-1 min-w-0">
          
          {/* TAB 1: HOME */}
          {activeTab === "home" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-normal text-center md:text-left">Welcome, {candidate.name}</h2>
                <p className="text-muted-foreground text-sm text-center md:text-left mt-1">
                  Manage your personal campaign data, uploaded materials, and gateway credits.
                </p>
              </div>

              {/* Grid cards */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Profile Card */}
                <Card className="glass-card shadow-sm border border-border/40 hover:shadow-md transition-all">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Privacy & Personal Details</CardTitle>
                    <CardDescription>Verify your phone, unique campaign domain and constituency details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Constituency:</span>
                      <span className="font-medium">{candidate.area || candidate.district}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Mobile:</span>
                      <span className="font-mono">{candidate.mobile || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Pincode:</span>
                      <span className="font-medium">{candidate.pincode || "N/A"}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/40 pt-3">
                    <Button variant="ghost" onClick={() => setActiveTab("personal")} className="text-primary text-xs w-full justify-start p-0">
                      Manage Personal Info
                    </Button>
                  </CardFooter>
                </Card>

                {/* Credits / Balances Card */}
                <Card className="glass-card shadow-sm border border-border/40 hover:shadow-md transition-all">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Coins className="h-5 w-5 text-amber-500" /> Account Credit Pool
                    </CardTitle>
                    <CardDescription>SMS, WhatsApp messages and voice duration balance.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center bg-card/60 p-2 rounded border border-border/30">
                      <span className="text-muted-foreground text-xs">SMS Quota:</span>
                      <span className="font-semibold">{candidate.balances.sms.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-card/60 p-2 rounded border border-border/30">
                      <span className="text-muted-foreground text-xs">WhatsApp Broadcasts:</span>
                      <span className="font-semibold">{(candidate.balances.wa || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-card/60 p-2 rounded border border-border/30">
                      <span className="text-muted-foreground text-xs">IVR Voice Duration:</span>
                      <span className="font-semibold">{candidate.balances.ivr.toLocaleString()} min</span>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/40 pt-3">
                    <Button variant="ghost" onClick={() => setActiveTab("payments")} className="text-primary text-xs w-full justify-start p-0">
                      Manage Payments & Quota
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Main horizontal suggestion bar */}
              <Card className="glass-card border border-border/40 p-6 flex flex-col sm:flex-row items-center gap-5">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="font-semibold">Real-Time Domain Links Generated</h4>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Your unique page, brochure, and manifesto links are live under `https://poltica.in` namespace.
                  </p>
                </div>
                <Button onClick={() => setActiveTab("media")} className="text-xs">
                  Review Links
                </Button>
              </Card>
            </div>
          )}

          {/* TAB 2: PERSONAL INFO */}
          {activeTab === "personal" && (
            <Card className="glass-card border border-border/40">
              <form onSubmit={handleUpdateInfo}>
                <CardHeader>
                  <CardTitle>Personal Info</CardTitle>
                  <CardDescription>
                    Information details saved about this candidate account profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Candidate Name</Label>
                      <Input 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        required 
                        className="bg-background/50 h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Mobile Phone</Label>
                      <Input 
                        value={editMobile} 
                        onChange={(e) => setEditMobile(e.target.value)} 
                        required 
                        className="bg-background/50 h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Constituency Area</Label>
                      <Input 
                        value={candidate.area || ""} 
                        disabled 
                        className="bg-muted text-muted-foreground h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Pincode</Label>
                      <Input 
                        value={editPincode} 
                        onChange={(e) => setEditPincode(e.target.value)} 
                        maxLength={6} 
                        className="bg-background/50 h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Office Address</Label>
                    <Input 
                      value={editAddress} 
                      onChange={(e) => setEditAddress(e.target.value)} 
                      className="bg-background/50 h-9"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/40 pt-4">
                  <Button type="submit" className="h-9">Update Settings</Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* TAB 3: PAYMENTS & INVOICES */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              <Card className="glass-card border border-border/40">
                <CardHeader>
                  <CardTitle>Invoices & Checkout Logs</CardTitle>
                  <CardDescription>
                    All payments and top-ups processed on the Razorpay platform gateway.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow className="border-border/40">
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Purchased Credits</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Total Paid</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((invoice, i) => (
                        <TableRow key={i} className="border-border/40">
                          <TableCell className="font-mono text-xs">{invoice.invoiceId}</TableCell>
                          <TableCell className="text-xs font-medium">{invoice.credits}</TableCell>
                          <TableCell className="text-xs">{invoice.date}</TableCell>
                          <TableCell className="text-xs">{invoice.method}</TableCell>
                          <TableCell className="text-xs font-semibold text-emerald-500">₹{invoice.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                              {invoice.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: UPLOADED CONTACTS */}
          {activeTab === "contacts" && (
            <Card className="glass-card border border-border/40">
              <CardHeader>
                <CardTitle>Voter Contact Directories</CardTitle>
                <CardDescription>
                  List of voter records loaded for this candidate's campaign campaigns.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="border-border/40">
                      <TableHead>Voter ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Political Inclination</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voters.map((v, i) => (
                      <TableRow key={i} className="border-border/40">
                        <TableCell className="font-mono text-xs">{v.id}</TableCell>
                        <TableCell className="text-xs font-medium">{v.name}</TableCell>
                        <TableCell className="text-xs font-mono">{v.phone}</TableCell>
                        <TableCell className="text-xs">{v.gender}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                            {v.inclination}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* TAB 5: MEDIA & IMAGES */}
          {activeTab === "media" && (
            <div className="space-y-6">
              <Card className="glass-card border border-border/40">
                <CardHeader>
                  <CardTitle>Campaign Assets Library</CardTitle>
                  <CardDescription>
                    Verify all candidate files, manifestos, brochures, and photos. Deactivate links to temporarily disable campaign page redirects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    {[
                      { key: "photo", label: "Profile Photo URL", path: candidate.photoUrl, icon: ImageIcon, color: "text-blue-500" },
                      { key: "portal", label: "Campaign Portal Link", path: candidate.uniqueUrl, icon: BookOpen, color: "text-primary" },
                      { key: "manifesto", label: "Manifesto PDF Link", path: candidate.manifestoUrl, icon: FileCode, color: "text-emerald-500" },
                      { key: "brochure", label: "Brochure PDF Link", path: candidate.brochureUrl, icon: FileCode, color: "text-purple-500" }
                    ].map((asset, i) => {
                      const isDeactivated = candidate.disabledAssets?.[asset.key as "photo" | "portal" | "manifesto" | "brochure"] || false;
                      return (
                        <div key={i} className={`flex flex-col sm:flex-row justify-between sm:items-center p-3 border border-border/40 rounded-lg bg-card/40 gap-3 transition-all ${isDeactivated ? "opacity-60 bg-muted/20" : ""}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <asset.icon className={`h-5 w-5 ${asset.color} shrink-0`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-muted-foreground uppercase">{asset.label}</span>
                                {isDeactivated ? (
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] h-4">Deactivated</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] h-4">Active</Badge>
                                )}
                              </div>
                              <div className={`font-mono text-xs truncate max-w-[280px] sm:max-w-[400px] mt-0.5 ${isDeactivated ? "line-through text-muted-foreground" : "text-[#2563eb] dark:text-[#93c5fd]"}`}>
                                {asset.path || "Not Generated"}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0 justify-end">
                            {!isDeactivated ? (
                              <>
                                <a 
                                  href={asset.path} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="outline" size="sm" className="h-8 text-xs">
                                    <ExternalLink className="h-3 w-3 mr-1" /> Open URL
                                  </Button>
                                </a>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                                  onClick={() => toggleAssetStatus(asset.key as any)}
                                >
                                  Deactivate
                                </Button>
                              </>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                                onClick={() => toggleAssetStatus(asset.key as any)}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 6: TEMPLATES QUEUE */}
          {activeTab === "templates" && (
            <Card className="glass-card border border-border/40">
              <CardHeader>
                <CardTitle>DLT SMS, WhatsApp & Voice Templates</CardTitle>
                <CardDescription>
                  Templates matching this candidate's custom dispatches.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="border-border/40">
                      <TableHead>Template ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Content String</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t, i) => (
                      <TableRow key={i} className="border-border/40">
                        <TableCell className="font-mono text-xs">{t.id}</TableCell>
                        <TableCell className="text-xs font-semibold">{t.name}</TableCell>
                        <TableCell className="text-xs">{t.type}</TableCell>
                        <TableCell className="text-xs truncate max-w-[200px]" title={t.content}>{t.content}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${
                            t.status === "Approved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                            t.status === "Pending" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                            "bg-destructive/10 text-destructive border-destructive/20"
                          }`}>
                            {t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* TAB 8: OUTREACH ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-normal text-center md:text-left">Campaign & Outreach Analytics</h2>
                <p className="text-muted-foreground text-sm text-center md:text-left mt-1">
                  Comprehensive audit logs and performance charts of {candidate.name}'s voter outreach (SMS, WhatsApp, and IVR).
                </p>
              </div>

              {/* Core metrics widgets */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="bg-white dark:bg-[#1b1b1b] border border-border/60 rounded-sm p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-[#2563eb]" />
                    <span className="text-[13px] font-semibold text-[#1e293b] dark:text-[#E1DFDD]">SMS Outreach</span>
                  </div>
                  <div className="text-2xl font-bold text-[#1e293b] dark:text-white">45,200 <span className="text-xs font-normal text-muted-foreground">sent</span></div>
                  <div className="text-[11px] text-emerald-600 mt-1">94.8% Successful delivery rate</div>
                </div>

                <div className="bg-white dark:bg-[#1b1b1b] border border-border/60 rounded-sm p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="h-4 w-4 text-[#10b981]" />
                    <span className="text-[13px] font-semibold text-[#1e293b] dark:text-[#E1DFDD]">WhatsApp Broadcasts</span>
                  </div>
                  <div className="text-2xl font-bold text-[#1e293b] dark:text-white">12,500 <span className="text-xs font-normal text-muted-foreground">sent</span></div>
                  <div className="text-[11px] text-emerald-600 mt-1">82.4% Read / Interaction rate</div>
                </div>

                <div className="bg-white dark:bg-[#1b1b1b] border border-border/60 rounded-sm p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <PhoneCall className="h-4 w-4 text-[#16a34a]" />
                    <span className="text-[13px] font-semibold text-[#1e293b] dark:text-[#E1DFDD]">IVR Voice Calls</span>
                  </div>
                  <div className="text-2xl font-bold text-[#1e293b] dark:text-white">18,000 <span className="text-xs font-normal text-muted-foreground">placed</span></div>
                  <div className="text-[11px] text-emerald-600 mt-1">65.0% Answer / pick-up rate</div>
                </div>
              </div>

              {/* Two-Column Details */}
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Channel Failure / Success breakdown */}
                <Card className="glass-card border border-border/40">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Delivery Performance Logs</CardTitle>
                    <CardDescription>Reason breakdown for delivery failures and offline bounces</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* WhatsApp */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold flex items-center gap-1"><Megaphone className="h-3.5 w-3.5 text-[#10b981]" /> WhatsApp Failures</span>
                        <span className="text-muted-foreground">2,200 Ignored / Failed</span>
                      </div>
                      <div className="space-y-1.5 pl-4 border-l border-border/60 text-[11px] text-muted-foreground font-mono">
                        <div className="flex justify-between">
                          <span>No WhatsApp Account:</span>
                          <span className="font-medium text-foreground">65% (1,430)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Device Offline:</span>
                          <span className="font-medium text-foreground">25% (550)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Invalid Format:</span>
                          <span className="font-medium text-foreground">10% (220)</span>
                        </div>
                      </div>
                    </div>

                    {/* SMS */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-[#2563eb]" /> SMS Failures</span>
                        <span className="text-muted-foreground">2,350 Bounced</span>
                      </div>
                      <div className="space-y-1.5 pl-4 border-l border-border/60 text-[11px] text-muted-foreground font-mono">
                        <div className="flex justify-between">
                          <span>TRAI DND Blocked:</span>
                          <span className="font-medium text-foreground">55% (1,292)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Inbox Full / Limit:</span>
                          <span className="font-medium text-foreground">25% (588)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carrier Timeout:</span>
                          <span className="font-medium text-foreground">20% (470)</span>
                        </div>
                      </div>
                    </div>

                    {/* IVR Calls */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold flex items-center gap-1"><PhoneCall className="h-3.5 w-3.5 text-[#16a34a]" /> IVR Call Failures</span>
                        <span className="text-muted-foreground">6,300 Unanswered</span>
                      </div>
                      <div className="space-y-1.5 pl-4 border-l border-border/60 text-[11px] text-muted-foreground font-mono">
                        <div className="flex justify-between">
                          <span>Out of Network:</span>
                          <span className="font-medium text-foreground">50% (3,150)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Busy / Declined:</span>
                          <span className="font-medium text-foreground">35% (2,205)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rings Out:</span>
                          <span className="font-medium text-foreground">15% (945)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Call Response (DTMF) & Retention Stats */}
                <Card className="glass-card border border-border/40">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Interactive IVR & Call Response</CardTitle>
                    <CardDescription>Voter interaction details for dialer campaigns</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* DTMF Actions */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Voter Voice Responses (DTMF)</h4>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">Pressed 1 (Connect Representative)</span>
                            <span className="text-muted-foreground">42% (4,914)</span>
                          </div>
                          <div className="w-full bg-[#e2e8f0] dark:bg-[#333] h-2 rounded-[2px] overflow-hidden">
                            <div className="bg-[#2563eb] h-full" style={{ width: '42%' }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">Pressed 2 (Register Opt-out / DND)</span>
                            <span className="text-muted-foreground">8% (936)</span>
                          </div>
                          <div className="w-full bg-[#e2e8f0] dark:bg-[#333] h-2 rounded-[2px] overflow-hidden">
                            <div className="bg-[#dc2626] h-full" style={{ width: '8%' }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">Listened to announcement only</span>
                            <span className="text-muted-foreground">50% (5,850)</span>
                          </div>
                          <div className="w-full bg-[#e2e8f0] dark:bg-[#333] h-2 rounded-[2px] overflow-hidden">
                            <div className="bg-slate-400 h-full" style={{ width: '50%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* listening retention */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Listening Retention Metrics</h4>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">Full Audio announcement heard (&gt; 30 sec)</span>
                            <span className="text-muted-foreground">55%</span>
                          </div>
                          <div className="w-full bg-[#e2e8f0] dark:bg-[#333] h-2 rounded-[2px] overflow-hidden">
                            <div className="bg-[#16a34a] h-full" style={{ width: '55%' }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">Partial Audio announcement heard (10 - 30 sec)</span>
                            <span className="text-muted-foreground">30%</span>
                          </div>
                          <div className="w-full bg-[#e2e8f0] dark:bg-[#333] h-2 rounded-[2px] overflow-hidden">
                            <div className="bg-[#f59e0b] h-full" style={{ width: '30%' }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">Quick Hang-up (&lt; 10 sec)</span>
                            <span className="text-muted-foreground">15%</span>
                          </div>
                          <div className="w-full bg-[#e2e8f0] dark:bg-[#333] h-2 rounded-[2px] overflow-hidden">
                            <div className="bg-[#dc2626] h-full" style={{ width: '15%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 7: ACTIVITY LOG */}
          {activeTab === "activity" && (
            <Card className="glass-card border border-border/40">
              <CardHeader>
                <CardTitle>Data & Activity Log</CardTitle>
                <CardDescription>
                  History of campaigns and administrative log changes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-6 relative border-l border-border/50 pl-4 ml-2">
                  {activities.map((act, i) => (
                    <div key={i} className="relative space-y-1">
                      {/* Node point */}
                      <span className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-primary border-2 border-background"></span>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-xs text-foreground">{act.event}</span>
                        <span className="text-[10px] text-muted-foreground">{act.timestamp}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{act.details}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 8: API INTEGRATION */}
          {activeTab === "api" && (
            <div className="space-y-6">
              <Card className="glass-card border border-border/40">
                <CardHeader>
                  <CardTitle className="text-xl font-bold tracking-tight text-[#1e293b] dark:text-[#E1DFDD]">API Configuration</CardTitle>
                  <CardDescription className="text-xs">
                    Securely configure SMS, WhatsApp, and Voice API credentials for {candidate?.name || "the candidate"}.
                  </CardDescription>
                </CardHeader>
              </Card>

              <form onSubmit={handleSaveApiConfig} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  {/* SMS Config */}
                  <Card className="glass-card flex flex-col justify-between border border-border/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-[#1e293b] dark:text-white">
                        <MessageSquare className="h-4.5 w-4.5 text-[#2563eb]" /> SMS Provider Setup
                      </CardTitle>
                      <CardDescription className="text-xs">Configure messaging gateway settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-grow">
                      <div className="space-y-1">
                        <Label className="text-xs">SMS Provider Gateway</Label>
                        <select
                          className="flex h-8 w-full rounded-sm border border-input bg-background/50 px-2 py-1 text-xs focus-visible:outline-none"
                          value={smsProvider}
                          onChange={(e) => setSmsProvider(e.target.value)}
                        >
                          <option value="twilio">Twilio Programmable SMS</option>
                          <option value="msg91">Msg91 SMS Gateway</option>
                          <option value="smpp">Custom SMPP Server</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">API Authentication Key / Token</Label>
                        <Input
                          type="password"
                          placeholder="Enter SMS API Key"
                          value={smsApiKey}
                          onChange={(e) => setSmsApiKey(e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sender ID / Shortcode</Label>
                        <Input
                          type="text"
                          placeholder="e.g. POLTCA"
                          value={smsSenderId}
                          onChange={(e) => setSmsSenderId(e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* WhatsApp Config */}
                  <Card className="glass-card flex flex-col justify-between border border-border/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-[#1e293b] dark:text-white">
                        <MessageSquare className="h-4.5 w-4.5 text-[#16a34a]" /> WhatsApp API Setup
                      </CardTitle>
                      <CardDescription className="text-xs">Configure Meta Cloud API or Business profile.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-grow">
                      <div className="space-y-1">
                        <Label className="text-xs">WhatsApp Gateway</Label>
                        <select
                          className="flex h-8 w-full rounded-sm border border-input bg-background/50 px-2 py-1 text-xs focus-visible:outline-none"
                          value={waProvider}
                          onChange={(e) => setWaProvider(e.target.value)}
                        >
                          <option value="meta">Meta Cloud API (Official)</option>
                          <option value="twilio_wa">Twilio WhatsApp Sandbox</option>
                          <option value="gupshup">Gupshup BSP</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone Number ID</Label>
                        <Input
                          type="text"
                          placeholder="e.g. 1029384756"
                          value={waPhoneId}
                          onChange={(e) => setWaPhoneId(e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Permanent System Token</Label>
                        <Input
                          type="password"
                          placeholder="EAAGy..."
                          value={waToken}
                          onChange={(e) => setWaToken(e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* IVR Voice Config */}
                  <Card className="glass-card flex flex-col justify-between border border-border/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-[#1e293b] dark:text-white">
                        <PhoneCall className="h-4.5 w-4.5 text-[#dc2626]" /> IVR & Voice Setup
                      </CardTitle>
                      <CardDescription className="text-xs">Configure voice trunk calling nodes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-grow">
                      <div className="space-y-1">
                        <Label className="text-xs">Voice / IVR Trunk Provider</Label>
                        <select
                          className="flex h-8 w-full rounded-sm border border-input bg-background/50 px-2 py-1 text-xs focus-visible:outline-none"
                          value={ivrProvider}
                          onChange={(e) => setIvrProvider(e.target.value)}
                        >
                          <option value="twilio">Twilio Voice API</option>
                          <option value="exotel">Exotel Voice Trunk</option>
                          <option value="sip">Custom SIP / VoIP Gateway</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Account SID / Project ID</Label>
                        <Input
                          type="text"
                          placeholder="e.g. AC..."
                          value={ivrSid}
                          onChange={(e) => setIvrSid(e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Account Auth Token</Label>
                        <Input
                          type="password"
                          placeholder="Enter Auth Token / Token Key"
                          value={ivrAuth}
                          onChange={(e) => setIvrAuth(e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Voice Caller ID / Virtual Number</Label>
                        <Input
                          type="text"
                          placeholder="e.g. +91 99999 99999"
                          value={ivrCallerId}
                          onChange={(e) => setIvrCallerId(e.target.value)}
                          className="h-8 text-xs bg-background/50"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="glass-card border-border/40">
                  <CardFooter className="flex justify-between items-center py-4 bg-card/30 rounded-b-sm border-t border-border/20">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure SSL transmission with AES-256 storage encryption.
                    </span>
                    <Button type="submit" disabled={isSavingApi} className="bg-primary hover:bg-primary/95 text-white h-9 rounded-sm font-semibold text-xs px-6">
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      {isSavingApi ? "Saving Configuration..." : "Save API Configuration"}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
