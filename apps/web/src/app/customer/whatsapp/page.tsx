"use client";

import React, { useState } from "react";
import { MessageCircle, Send, CalendarClock, BookTemplate, Info, Loader2, CheckCircle2, AlertCircle, Image, Link2, Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { candidatesApi, campaignsApi } from "@/lib/api";

const isValidHttpUrl = (str: string) => {
  let url;
  try {
    url = new URL(str);
  } catch (_) {
    return false;  
  }
  return url.protocol === "http:" || url.protocol === "https:";
};

const WHATSAPP_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "te", label: "తెలుగు" },
  { code: "hi", label: "हिंदी" },
] as const;

type WhatsAppLanguage = typeof WHATSAPP_LANGUAGES[number]["code"];

const TEMPLATE_COPY = {
  welcome: {
    en: { message: "Namaskar Voter! Support our vision for a progressive future. Candidate *[Candidate Name]* invites you to our upcoming town hall.\n\nDate: [Date]\nTime: [Time]\nVenue: [Location]\n\nUse the button below to RSVP.", button: "Register RSVP" },
    te: { message: "నమస్కారం ఓటరు! ప్రగతిశీల భవిష్యత్తు కోసం మా దృక్పథానికి మద్దతు ఇవ్వండి. అభ్యర్థి *[Candidate Name]* మిమ్మల్ని రాబోయే ప్రజా సమావేశానికి ఆహ్వానిస్తున్నారు.\n\nతేదీ: [Date]\nసమయం: [Time]\nవేదిక: [Location]\n\nహాజరు నమోదు కోసం క్రింది బటన్‌ను నొక్కండి.", button: "హాజరు నమోదు" },
    hi: { message: "नमस्कार मतदाता! प्रगतिशील भविष्य के हमारे संकल्प का समर्थन करें। उम्मीदवार *[Candidate Name]* आपको आगामी जनसभा में आमंत्रित करते हैं।\n\nदिनांक: [Date]\nसमय: [Time]\nस्थान: [Location]\n\nउपस्थिति दर्ज करने के लिए नीचे दिए बटन को दबाएँ।", button: "उपस्थिति दर्ज करें" },
  },
  appeal: {
    en: { message: "Dear citizen, your vote is your power! Vote for progress, transparency and development on *[Date]* and support *[Candidate Name]*. Use the button below to view our manifesto.", button: "View Manifesto" },
    te: { message: "ప్రియమైన పౌరుడా, మీ ఓటే మీ శక్తి! *[Date]* నాడు ప్రగతి, పారదర్శకత మరియు అభివృద్ధి కోసం ఓటు వేసి *[Candidate Name]* కు మద్దతు ఇవ్వండి. మా మేనిఫెస్టో చూడటానికి క్రింది బటన్‌ను నొక్కండి.", button: "మేనిఫెస్టో చూడండి" },
    hi: { message: "प्रिय नागरिक, आपका वोट आपकी शक्ति है! *[Date]* को प्रगति, पारदर्शिता और विकास के लिए मतदान करें तथा *[Candidate Name]* का समर्थन करें। हमारा घोषणापत्र देखने के लिए नीचे दिए बटन को दबाएँ।", button: "घोषणापत्र देखें" },
  },
} as const;

export default function CustomerWhatsApp() {
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState<string>(TEMPLATE_COPY.welcome.en.message);
  const [mediaUrl, setMediaUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [audience, setAudience] = useState("all");
  const [templateMode, setTemplateMode] = useState("welcome");
  const [buttonText, setButtonText] = useState<string>(TEMPLATE_COPY.welcome.en.button);
  const [language, setLanguage] = useState<WhatsAppLanguage>("en");
  
  // Modals and logic state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  // User Data & API Config
  const [candidateName, setCandidateName] = useState("Rahul Sharma");
  const [availableCredits, setAvailableCredits] = useState(30000);
  const [apiConfig, setApiConfig] = useState<any>(null);
  const [manifestoUrl, setManifestoUrl] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");
  const [uniqueUrl, setUniqueUrl] = useState("");
  const [attachManifesto, setAttachManifesto] = useState(false);
  const [attachUniqueUrl, setAttachUniqueUrl] = useState(false);

  // Validate image URL in the background
  React.useEffect(() => {
    if (!mediaUrl) {
      setImageError(false);
      return;
    }
    
    if (!isValidHttpUrl(mediaUrl)) {
      setImageError(true);
      return;
    }

    const img = new window.Image();
    img.src = mediaUrl;
    img.onload = () => setImageError(false);
    img.onerror = () => setImageError(true);
  }, [mediaUrl]);

  const loadUserData = React.useCallback(async () => {
    try {
      const sessionUser = localStorage.getItem("currentCustomerUser");
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        if (parsed.name) setCandidateName(parsed.name);
        if (parsed.apiConfig) setApiConfig(parsed.apiConfig);
        if (parsed.balances?.wa !== undefined) setAvailableCredits(parsed.balances.wa);
        if (["en", "te", "hi"].includes(parsed.defaultLanguage)) {
          setLanguage(parsed.defaultLanguage);
        }
        setManifestoUrl(parsed.manifestoUrl || "");
        setBrochureUrl(parsed.brochureUrl || "");
        setUniqueUrl(parsed.uniqueUrl || "");
      }
    } catch {}

    // Authoritative WhatsApp balance + profile from the server.
    try {
      const me = await candidatesApi.me();
      if (me.balances?.wa !== undefined) setAvailableCredits(me.balances.wa);
      if (["en", "te", "hi"].includes((me as any).defaultLanguage)) {
        setLanguage((me as any).defaultLanguage);
      }
      if ((me as any).apiConfig) setApiConfig((me as any).apiConfig);
      if (me.manifestoUrl !== undefined) setManifestoUrl(me.manifestoUrl || "");
      if (me.uniqueUrl !== undefined) setUniqueUrl(me.uniqueUrl || "");
    } catch {
      // Not signed in / API down — keep cached values.
    }
  }, []);

  React.useEffect(() => {
    loadUserData();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadUserData();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(loadUserData, 10000); // real-time balance / gateway config
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [loadUserData]);

  const audienceMap: Record<string, number> = {
    all: 45000,
    youth: 18000,
    women: 22500,
  };

  const targetCount = audienceMap[audience];
  const totalCost = targetCount; // 1 credit per WhatsApp template message
  
  const hasEnoughCredits = availableCredits >= totalCost;

  // Process live preview variables
  const getPreviewText = () => {
    if (!message) return "";
    let txt = message
      .replace(/\[Candidate Name\]/g, candidateName)
      .replace(/\[Location\]/g, "Shivaji Park")
      .replace(/\[Time\]/g, "10:00 AM")
      .replace(/\[Date\]/g, "15th Nov")
      .replace(/\[Symbol\]/g, "Lotus");

    if (attachManifesto && manifestoUrl) {
      const label = language === "te" ? "మేనిఫెస్టో PDF" : language === "hi" ? "घोषणापत्र PDF" : "Manifesto PDF";
      txt += `\n\n📄 *${label}*: ${manifestoUrl}`;
    }
    if (attachUniqueUrl && uniqueUrl) {
      const label = language === "te" ? "ప్రచార లింక్" : language === "hi" ? "अभियान लिंक" : "Campaign URL";
      txt += `\n\n🌐 *${label}*: https://${uniqueUrl}`;
    }
    return txt;
  };

  const handleTemplateSelect = (val: string, selectedLanguage: WhatsAppLanguage = language) => {
    setTemplateMode(val);
    setImageError(false);
    if(val === "welcome") {
      setMediaUrl("https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=60");
      setMessage(TEMPLATE_COPY.welcome[selectedLanguage].message);
      setButtonText(TEMPLATE_COPY.welcome[selectedLanguage].button);
      setAttachManifesto(false);
      setAttachUniqueUrl(false);
    } else if(val === "appeal") {
      setMediaUrl("");
      setMessage(TEMPLATE_COPY.appeal[selectedLanguage].message);
      setButtonText(TEMPLATE_COPY.appeal[selectedLanguage].button);
      if (manifestoUrl) setAttachManifesto(true);
      if (uniqueUrl) setAttachUniqueUrl(true);
    } else {
      setMediaUrl("");
      setMessage("");
      setButtonText("");
      setAttachManifesto(false);
      setAttachUniqueUrl(false);
    }
  };

  React.useEffect(() => {
    if (templateMode === "welcome") {
      setMessage(TEMPLATE_COPY.welcome[language].message);
      setButtonText(TEMPLATE_COPY.welcome[language].button);
    } else if (templateMode === "appeal") {
      setMessage(TEMPLATE_COPY.appeal[language].message);
      setButtonText(TEMPLATE_COPY.appeal[language].button);
    }
  }, [language, templateMode]);

  const handleSendProcess = async () => {
    setIsSending(true);
    setSendError("");
    try {
      const res = await campaignsApi.send({
        channel: "wa",
        name: campaignName || "WhatsApp Broadcast",
        message,
        recipientCount: totalCost,
        language,
      });
      setAvailableCredits(res.balances.wa);
      try {
        const su = localStorage.getItem("currentCustomerUser");
        if (su) {
          const u = JSON.parse(su);
          u.balances = { ...(u.balances || {}), ...res.balances };
          localStorage.setItem("currentCustomerUser", JSON.stringify(u));
        }
      } catch {}
      setIsSuccess(true);
    } catch (err: any) {
      setSendError(err?.message || "Could not send the broadcast. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setIsSuccess(false);
    setIsConfirmOpen(false);
    setIsScheduleOpen(false);
    setSendError("");
    setCampaignName("");
    setScheduleTime("");
    setImageError(false);
    handleTemplateSelect("welcome");
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-[24px] font-semibold text-[#1e293b] dark:text-white leading-tight">Compose WhatsApp Broadcast</h1>
        <p className="text-[13px] text-[#64748b] dark:text-[#999] mt-1">
          Send rich media templates, manifestos, and interactive CTA button messages on WhatsApp.
        </p>
      </div>

      {/* Active Gateway / Sandbox Mode Indicator */}
      {apiConfig && apiConfig.waToken && apiConfig.waPhoneId ? (
        <div className="bg-[#EFF6FC] dark:bg-zinc-900 border-l-4 border-[#2563eb] p-4 rounded-sm flex items-center justify-between">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-[#2563eb] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#2563eb]">Live WhatsApp Business API Configured</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Broadcasting via <strong>{apiConfig.waProvider === 'meta' ? 'Meta Cloud API (Official)' : apiConfig.waProvider === 'twilio_wa' ? 'Twilio WhatsApp API' : 'Gupshup BSP Gateway'}</strong> (Phone ID: <code className="bg-[#e2e8f0] dark:bg-[#333] px-1 py-0.5 rounded font-mono text-[11px]">{apiConfig.waPhoneId}</code>).
              </p>
            </div>
          </div>
          <Link href="/customer/settings">
            <Button variant="outline" className="border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/10 h-8 text-xs font-semibold rounded-sm">Change Credentials</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-[#fffbeb] dark:bg-zinc-900 border-l-4 border-[#f59e0b] p-4 rounded-sm flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#b45309] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#b45309]">Running in Sandbox Mode</p>
              <p className="mt-0.5 text-xs text-muted-foreground">No WhatsApp API credentials configured. Messages will be simulated. Please configure Meta Cloud API settings to activate live delivery.</p>
            </div>
          </div>
          <Link href="/customer/settings">
            <Button variant="outline" className="border-[#f59e0b] text-[#b45309] hover:bg-[#fffbeb] h-8 text-xs font-semibold rounded-sm">Set Up Gateway</Button>
          </Link>
        </div>
      )}

      {/* Warning if credits are low */}
      {!hasEnoughCredits && campaignName && (
        <div className="bg-[#fef2f2] dark:bg-zinc-900 border-l-4 border-[#dc2626] p-4 rounded-sm flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#dc2626] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#dc2626]">Insufficient WhatsApp Balance</p>
              <p className="mt-0.5">This campaign requires {totalCost.toLocaleString()} messages, but you only have {availableCredits.toLocaleString()} available.</p>
            </div>
          </div>
          <Link href="/customer/billing">
            <Button className="bg-[#dc2626] hover:bg-[#831e22] text-white h-8 text-xs font-semibold rounded-sm">Buy Message Pack</Button>
          </Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card md:col-span-2 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Campaign Details</CardTitle>
            <CardDescription>
              Select your approved Meta Cloud API template and customize variables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 flex-1">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input 
                placeholder="e.g. WhatsApp Invitation Blast" 
                className="bg-background/50" 
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" /> Voter Message Language
              </Label>
              <Select
                value={language}
                onValueChange={(value) => {
                  const next = (value || "en") as WhatsAppLanguage;
                  setLanguage(next);
                  if (templateMode !== "custom") handleTemplateSelect(templateMode, next);
                }}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select message language" />
                </SelectTrigger>
                <SelectContent>
                  {WHATSAPP_LANGUAGES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Uses the Campaign Page default language. You can override it for this broadcast.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><BookTemplate className="h-4 w-4" /> Meta Approved Template</Label>
              <Select value={templateMode} onValueChange={(val) => handleTemplateSelect(val || "")}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Candidate Townhall Welcome (Media + Buttons)</SelectItem>
                  <SelectItem value="appeal">Voter Support Appeal (Text + CTA Button)</SelectItem>
                  <SelectItem value="custom">Blank Template (Simulate Custom Message)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templateMode === "welcome" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Image className="h-4 w-4" /> Media Header Image URL</Label>
                <Input 
                  placeholder="https://example.com/banner.jpg" 
                  className={`bg-background/50 ${(imageError || (mediaUrl && !isValidHttpUrl(mediaUrl))) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value);
                    setImageError(false);
                  }}
                />
                {(imageError || (mediaUrl && !isValidHttpUrl(mediaUrl))) && (
                  <p className="text-[11px] text-destructive flex items-center gap-1 mt-1 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" /> 
                    The image link appears to be broken or inaccessible. Make sure it is a direct image link (starting with http:// or https://).
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Message Content (Dynamic Fields Support)</Label>
              <Textarea 
                placeholder="Enter template message payload..."
                className="bg-background/50 min-h-[140px] resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={templateMode !== "custom"}
              />
            </div>

            {/* Campaign Materials Attachments */}
            <div className="bg-[#f1f5f9] dark:bg-zinc-800/50 p-3 rounded-lg border border-border/40 space-y-3">
              <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">Campaign Material Attachments</span>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input 
                    type="checkbox" 
                    checked={attachManifesto} 
                    onChange={(e) => setAttachManifesto(e.target.checked)} 
                    disabled={!manifestoUrl}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4 mr-1.5"
                  />
                  <div>
                    <span className="font-medium text-[#1e293b] dark:text-zinc-200">Attach Manifesto PDF</span>
                    {!manifestoUrl && (
                      <span className="text-[10px] text-destructive block">Not uploaded by admin yet</span>
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input 
                    type="checkbox" 
                    checked={attachUniqueUrl} 
                    onChange={(e) => setAttachUniqueUrl(e.target.checked)} 
                    disabled={!uniqueUrl}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4 mr-1.5"
                  />
                  <div>
                    <span className="font-medium text-[#1e293b] dark:text-zinc-200">Attach Unique Campaign URL</span>
                    {!uniqueUrl && (
                      <span className="text-[10px] text-destructive block">Not generated</span>
                    )}
                  </div>
                </label>
              </div>

              {(attachManifesto || attachUniqueUrl) && (
                <div className="pt-2 border-t border-border/50 text-xs space-y-1 font-mono text-muted-foreground bg-white/50 dark:bg-zinc-900/30 p-2 rounded">
                  {attachManifesto && manifestoUrl && (
                    <div className="truncate">📄 PDF: {manifestoUrl}</div>
                  )}
                  {attachUniqueUrl && uniqueUrl && (
                    <div className="truncate">🌐 URL: https://{uniqueUrl}</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTA Link Button Text</Label>
                <Input 
                  placeholder="e.g. Visit Website" 
                  className="bg-background/50" 
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  disabled={templateMode !== "custom"}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Target Audience List</Label>
                <Select value={audience} onValueChange={(val) => setAudience(val || "all")}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select target group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Voters ({audienceMap.all.toLocaleString()})</SelectItem>
                    <SelectItem value="youth">Youth Demographic ({audienceMap.youth.toLocaleString()})</SelectItem>
                    <SelectItem value="women">Women Voters ({audienceMap.women.toLocaleString()})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t border-border/50 pt-6">
            <Button 
              variant="outline" 
              disabled={!message || !campaignName || !hasEnoughCredits}
              onClick={() => setIsScheduleOpen(true)}
            >
              <CalendarClock className="mr-2 h-4 w-4" /> Schedule Broadcast
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!message || !campaignName || !hasEnoughCredits}
              onClick={() => { setSendError(""); setIsConfirmOpen(true); }}
            >
              <Send className="mr-2 h-4 w-4" /> Launch Broadcast Now
            </Button>
          </CardFooter>
        </Card>

        {/* Live Preview Pane */}
        <Card className="glass-card border-emerald-500/20 bg-emerald-500/5 h-fit sticky top-24">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-600 dark:text-emerald-400">WhatsApp Live Preview</CardTitle>
            <CardDescription>Chat window rendering on a smart phone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[8px] rounded-[2.5rem] h-[440px] w-full max-w-[260px] shadow-xl overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-4 bg-gray-800 rounded-b-xl w-32 mx-auto z-10"></div>
              <div className="bg-[#E5DDD5] h-full w-full flex flex-col pt-8">
                {/* Custom WhatsApp Header */}
                <div className="bg-[#075E54] text-white p-2 flex items-center gap-1.5 shrink-0 text-xs">
                  <div className="h-5 w-5 bg-teal-800 rounded-full flex items-center justify-center font-bold text-[8px]">
                    RS
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{candidateName}</p>
                    <p className="text-[9px] text-[#b3d4d0] truncate">Official Candidate Profile</p>
                  </div>
                </div>

                {/* WhatsApp Chat Body */}
                <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-2">
                  <div className="bg-white dark:bg-zinc-800 text-[#303030] dark:text-zinc-100 p-1.5 rounded-lg text-xs shadow-sm max-w-[210px] self-start border border-[#d8d8d8] dark:border-zinc-700">
                    {/* Media Image Header */}
                    {mediaUrl && (
                      <div className="w-full h-24 mb-1.5 rounded overflow-hidden relative bg-zinc-200 flex items-center justify-center">
                        {isValidHttpUrl(mediaUrl) && !imageError ? (
                          <img 
                            src={mediaUrl} 
                            alt="WhatsApp Campaign Header" 
                            className="object-cover w-full h-full animate-fade-in" 
                            onError={() => setImageError(true)}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 p-2 text-center">
                            <AlertCircle className="h-4 w-4 text-destructive mb-1 animate-bounce" />
                            <span className="text-[9px] font-medium text-destructive">Broken Image Link</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Message Body */}
                    {message ? (
                      <p className="whitespace-pre-line text-[11px] leading-relaxed">
                        {getPreviewText()}
                      </p>
                    ) : (
                      <span className="text-zinc-400 italic">No message drafted. Choose or type custom details.</span>
                    )}

                    {/* Interactive CTA buttons */}
                    {buttonText && (
                      <div className="mt-2 pt-1 border-t border-zinc-100 dark:border-zinc-700 flex flex-col gap-1">
                        <div className="text-center py-1 text-[#075E54] dark:text-emerald-400 font-semibold text-[10px] flex items-center justify-center gap-1">
                          <Link2 className="h-3 w-3" /> {buttonText}
                        </div>
                        {(attachManifesto || attachUniqueUrl) && uniqueUrl && (
                          <div className="text-center text-[9px] text-[#075E54]/70 dark:text-emerald-400/70 font-mono truncate max-w-[190px] mx-auto pb-1">
                            https://{uniqueUrl}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2 items-start text-xs text-muted-foreground">
              <Info className="h-4 w-4 text-emerald-500 shrink-0" />
              <p>WhatsApp broadcasts support images, custom CTA link buttons, and dynamic text fields.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Immediate Launch Modal */}
      <Dialog open={isConfirmOpen} onOpenChange={(open) => !isSending && setIsConfirmOpen(open)}>
        <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-border/50">
          {!isSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle>Launch WhatsApp Broadcast</DialogTitle>
                <DialogDescription>
                  You are about to launch a WhatsApp campaign to {targetCount.toLocaleString()} voters.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Campaign Name</span>
                  <span className="font-medium">{campaignName}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Target Recipients</span>
                  <span className="font-medium">{targetCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Message Language</span>
                  <span className="font-medium">{WHATSAPP_LANGUAGES.find((item) => item.code === language)?.label}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Delivery Route</span>
                  <span className="font-medium">
                    {apiConfig && apiConfig.waToken && apiConfig.waPhoneId
                      ? (apiConfig.waProvider === 'meta' ? 'Meta Cloud API Live' : apiConfig.waProvider === 'twilio_wa' ? 'Twilio WhatsApp Sandbox' : 'Gupshup BSP Gateway')
                      : 'Sandbox Simulator'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="font-semibold text-emerald-500">Balance Deducted</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-base">
                    {totalCost.toLocaleString()} messages
                  </Badge>
                </div>
              </div>
              {sendError && (
                <div className="mb-2 rounded-md bg-[#fef2f2] border border-[#dc2626]/30 px-3 py-2 text-xs text-[#dc2626] flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {sendError}
                </div>
              )}
              <DialogFooter>
                <Button variant="ghost" disabled={isSending} onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto" disabled={isSending} onClick={handleSendProcess}>
                  {isSending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Dispatching...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Confirm & Send</>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-semibold">Broadcast Dispatched!</h2>
              <p className="text-muted-foreground text-sm max-w-[300px]">
                Your WhatsApp campaign <strong>"{campaignName}"</strong> was successfully launched via <strong>{apiConfig && apiConfig.waToken && apiConfig.waPhoneId ? (apiConfig.waProvider === 'meta' ? 'Meta Cloud API' : apiConfig.waProvider === 'twilio_wa' ? 'Twilio WhatsApp' : 'Gupshup BSP') : 'Sandbox Simulator'}</strong>.
              </p>
              <Button variant="outline" className="mt-6" onClick={resetForm}>Create Another Campaign</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scheduling Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={(open) => !isSending && setIsScheduleOpen(open)}>
        <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-border/50">
          {!isSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle>Schedule WhatsApp Broadcast</DialogTitle>
                <DialogDescription>
                  Reserve credits and schedule the dispatch time for {targetCount.toLocaleString()} voters.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input 
                    type="datetime-local" 
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="bg-background/50" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">Timezone: IST (Indian Standard Time)</p>
                </div>

                <div className="bg-card/50 p-3 rounded-lg border border-border/50">
                  <div className="flex justify-between items-center text-sm pt-2">
                    <span className="font-semibold text-emerald-500">Messages to Reserve</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-base">
                      {totalCost.toLocaleString()} messages
                    </Badge>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" disabled={isSending} onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" 
                  disabled={isSending || !scheduleTime} 
                  onClick={handleSendProcess}
                >
                  {isSending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</>
                  ) : (
                    <><CalendarClock className="mr-2 h-4 w-4" /> Confirm Schedule</>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                <CalendarClock className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-semibold">Broadcast Scheduled!</h2>
              <p className="text-muted-foreground text-sm max-w-[300px]">
                Your WhatsApp broadcast <strong>"{campaignName}"</strong> has been successfully scheduled for {new Date(scheduleTime).toLocaleString()}.
              </p>
              <Button variant="outline" className="mt-6" onClick={resetForm}>Create Another Campaign</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
