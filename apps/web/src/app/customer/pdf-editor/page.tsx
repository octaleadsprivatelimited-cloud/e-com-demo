"use client";

import React, { useState, useEffect } from "react";
import { FileText, Save, RefreshCw, Printer, Check, Plus, Trash2, MapPin, User, Mail, Phone, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ManifestoPdfSettings {
  documentTitle: string;
  documentSubtitle: string;
  candidateBioHeadline: string;
  candidateBioContent: string;
  promises: string[];
  contactAddress: string;
  contactEmail: string;
  contactPhone: string;
  legalDisclaimer: string;
  themeStyle: "nationalist-tricolor" | "democratic-wave" | "swaraj-editorial";
  candidatePhotoUrl: string;
  partySymbolUrl: string;
  partyName: string;
  candidateSignatureLabel: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

const defaultSettings: ManifestoPdfSettings = {
  documentTitle: "SADASHIV PETH DEVELOPMENT BLUEPRINT",
  documentSubtitle: "Official Campaign Manifesto & Electoral Agenda 2026",
  candidateBioHeadline: "Empowering Our Community with Integrity, Action & Progress",
  candidateBioContent: "Dear Voter, I stand committed to transparent local governance. My roadmap guarantees clean drinking water, eco-friendly solar lighting, regular town hall audits, and secure community corridors for women and children in Sadashiv Peth.",
  promises: [
    "24/7 uninterrupted clean drinking water supply.",
    "Installation of 150+ high-efficiency solar street lights in residential lanes.",
    "A direct-to-voter digital portal to submit local issues and track resolutions.",
    "Revamp of local public gardens with elderly walk paths and children play zones."
  ],
  contactAddress: "Flat 12, Sahakar Niwas, Near Shaniwar Wada, Pune - 411030",
  contactEmail: "contact@rahulsharma.in",
  contactPhone: "+91 98765 43210",
  legalDisclaimer: "All campaign pledges are backed by strict personal commitments and designed for execution under Pune Municipal Corporation guidelines. Indian Judiciary limits.",
  themeStyle: "nationalist-tricolor",
  candidatePhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
  partySymbolUrl: "https://images.unsplash.com/photo-1590073844006-33379778ae09?w=100&auto=format&fit=crop&q=80",
  partyName: "Poltica Peoples Alliance",
  candidateSignatureLabel: "Rahul Sharma, Candidate",
  primaryColor: "#FF9933",
  secondaryColor: "#138808",
  accentColor: "#1e3a8a",
};

interface CandidateUser {
  id?: string;
  name?: string;
  area?: string;
  district?: string;
  mobile?: string;
  manifestoPdfSettings?: ManifestoPdfSettings;
}

export default function ManifestoPdfEditor() {
  const [settings, setSettings] = useState<ManifestoPdfSettings>(defaultSettings);
  const [newPromise, setNewPromise] = useState("");
  const [candidateUser, setCandidateUser] = useState<CandidateUser | null>(null);

  useEffect(() => {
    const sessionUser = localStorage.getItem("currentCustomerUser");
    let currentName = "Rahul Sharma";
    let currentArea = "Sadashiv Peth";

    if (sessionUser) {
      try {
        const parsed = JSON.parse(sessionUser);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCandidateUser(parsed);
        currentName = parsed.name || currentName;
        currentArea = parsed.area || parsed.district || currentArea;
      } catch (e) {}
    }

    try {
      const stored = localStorage.getItem("poltica_manifesto_pdf_settings");
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings(prev => ({
          ...prev,
          documentTitle: `${currentArea.toUpperCase()} ELECTION ROADMAP`,
          documentSubtitle: `Voter Agenda & Development Manifesto for ${currentName}`,
          candidateSignatureLabel: `${currentName}, Candidate`,
          contactPhone: candidateUser?.mobile || prev.contactPhone,
          primaryColor: "#FF9933",
          secondaryColor: "#138808",
          accentColor: "#1e3a8a",
        }));
      }
    } catch (e) {
      console.error("Failed loading settings:", e);
    }
  }, [candidateUser?.mobile]);

  const handleSelectTemplate = (style: "nationalist-tricolor" | "democratic-wave" | "swaraj-editorial") => {
    let primary = "#FF9933";
    let secondary = "#138808";
    let accent = "#1e3a8a";

    if (style === "democratic-wave") {
      primary = "#1e3a8a";
      secondary = "#3b82f6";
      accent = "#1e3a8a";
    } else if (style === "swaraj-editorial") {
      primary = "#7f1d1d";
      secondary = "#d97706";
      accent = "#7f1d1d";
    }

    setSettings(prev => ({
      ...prev,
      themeStyle: style,
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent
    }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem("poltica_manifesto_pdf_settings", JSON.stringify(settings));
      const pool = JSON.parse(localStorage.getItem("poltica_candidates") || "[]");
      if (candidateUser) {
        const updatedPool = pool.map((c: CandidateUser) => {
          if (c.id === candidateUser.id || c.mobile === candidateUser.mobile) {
            return {
              ...c,
              manifestoPdfSettings: settings
            };
          }
          return c;
        });
        localStorage.setItem("poltica_candidates", JSON.stringify(updatedPool));
      }
      toast.success("Election PDF blueprint saved and compiled!");
    } catch (e) {
      toast.error("Failed to save configuration.");
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    toast.success("Reset to predesigned layouts.");
  };

  const addPromise = () => {
    if (!newPromise.trim()) return;
    setSettings({
      ...settings,
      promises: [...settings.promises, newPromise.trim()]
    });
    setNewPromise("");
  };

  const removePromise = (index: number) => {
    setSettings({
      ...settings,
      promises: settings.promises.filter((_, i) => i !== index)
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "candidatePhotoUrl" | "partySymbolUrl") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #manifesto-pdf-print, #manifesto-pdf-print * {
            visibility: visible !important;
          }
          #manifesto-pdf-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 20mm !important;
          }
        }
      `}} />

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1e293b] dark:text-white flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" /> Candidate Manifesto PDF Editor
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Design beautiful, professional, high-impact election PDF manifestos & campaign brochures for voters.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Form Controls */}
        <div className="lg:col-span-5 min-w-0 space-y-6">
  <Card className="glass-card shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                🏛️ Predesigned Election Templates
              </CardTitle>
              <CardDescription>Select one of the optimized election layout presets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(["nationalist-tricolor", "democratic-wave", "swaraj-editorial"] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => handleSelectTemplate(style)}
                    className={`p-2.5 rounded text-left border transition-all flex flex-col justify-between ${
                      settings.themeStyle === style
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                        : "bg-background border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="h-2.5 w-full rounded-sm mb-1.5" style={{
                      background: style === "nationalist-tricolor" ? "linear-gradient(90deg, #ff9933 33%, #ffffff 33%, #ffffff 66%, #138808 66%)" :
                                  style === "democratic-wave" ? "linear-gradient(135deg, #1e3a8a, #3b82f6)" :
                                  "linear-gradient(135deg, #7f1d1d, #d97706)"
                    }} />
                    <span className="text-[10px] capitalize leading-tight">
                      {style.replace("-", " ")}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                🎨 Custom Branding Colors
              </CardTitle>
              <CardDescription>Select colors that represent your political identity & party branding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase block">Primary</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={settings.primaryColor || "#FF9933"}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer p-0 bg-transparent"
                    />
                    <span className="text-[10px] font-mono uppercase text-zinc-500">{settings.primaryColor || "#FF9933"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase block">Secondary</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={settings.secondaryColor || "#138808"}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer p-0 bg-transparent"
                    />
                    <span className="text-[10px] font-mono uppercase text-zinc-500">{settings.secondaryColor || "#138808"}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase block">Accent</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={settings.accentColor || "#1e3a8a"}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer p-0 bg-transparent"
                    />
                    <span className="text-[10px] font-mono uppercase text-zinc-500">{settings.accentColor || "#1e3a8a"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                👤 Candidate & Party Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">Party Name</label>
                  <Input
                    value={settings.partyName}
                    onChange={(e) => setSettings({ ...settings, partyName: e.target.value })}
                    className="h-8 text-xs bg-background/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground block">Signatory Label</label>
                  <Input
                    value={settings.candidateSignatureLabel}
                    onChange={(e) => setSettings({ ...settings, candidateSignatureLabel: e.target.value })}
                    className="h-8 text-xs bg-background/50"
                  />
                </div>
              </div>

              {/* Photo Uploads */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">Candidate Photo</label>
                  <div className="flex items-center gap-2">
                    <img src={settings.candidatePhotoUrl} className="h-10 w-10 object-cover rounded-md border" />
                    <label htmlFor="candidate-photo-upload" className="flex-1 cursor-pointer bg-muted hover:bg-muted/80 h-8 rounded border flex items-center justify-center text-[10px] gap-1 font-semibold">
                      <Upload className="h-3 w-3" /> Upload
                    </label>
                    <input id="candidate-photo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, "candidatePhotoUrl")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">Election Symbol</label>
                  <div className="flex items-center gap-2">
                    <img src={settings.partySymbolUrl} className="h-10 w-10 object-contain rounded-md border p-1 bg-white" />
                    <label htmlFor="party-symbol-upload" className="flex-1 cursor-pointer bg-muted hover:bg-muted/80 h-8 rounded border flex items-center justify-center text-[10px] gap-1 font-semibold">
                      <Upload className="h-3 w-3" /> Upload
                    </label>
                    <input id="party-symbol-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, "partySymbolUrl")} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                📝 Development Roadmap Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Manifesto Header Title</label>
                <Input
                  value={settings.documentTitle}
                  onChange={(e) => setSettings({ ...settings, documentTitle: e.target.value })}
                  className="h-9 bg-background/50 text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Campaign Subtitle</label>
                <Input
                  value={settings.documentSubtitle}
                  onChange={(e) => setSettings({ ...settings, documentSubtitle: e.target.value })}
                  className="h-9 bg-background/50 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Voter Greeting / Bio Headline</label>
                <Input
                  value={settings.candidateBioHeadline}
                  onChange={(e) => setSettings({ ...settings, candidateBioHeadline: e.target.value })}
                  className="h-9 bg-background/50 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Detailed Message to Voters</label>
                <Textarea
                  value={settings.candidateBioContent}
                  onChange={(e) => setSettings({ ...settings, candidateBioContent: e.target.value })}
                  className="bg-background/50 text-xs min-h-[90px]"
                />
              </div>

              {/* Promises lists */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Key Promises Checklist</label>
                <div className="space-y-1.5">
                  {settings.promises.map((promise, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 bg-muted/40 p-2 rounded text-[11px] border border-border/30">
                      <span className="truncate flex-1 min-w-0">{promise}</span>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removePromise(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Input
                    placeholder="Add an electoral promise..."
                    value={newPromise}
                    onChange={(e) => setNewPromise(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPromise()}
                    className="h-8 text-xs bg-background/50"
                  />
                  <Button type="button" size="sm" onClick={addPromise} className="h-8 text-xs bg-[#2563eb] hover:bg-[#2563eb]/90 text-white font-semibold">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Office Phone</label>
                  <Input
                    value={settings.contactPhone}
                    onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                    className="h-8 text-xs bg-background/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Office Email</label>
                  <Input
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    className="h-8 text-xs bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Office / Campaign Address</label>
                <Input
                  value={settings.contactAddress}
                  onChange={(e) => setSettings({ ...settings, contactAddress: e.target.value })}
                  className="h-8 text-xs bg-background/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Legal Disclaimer Footer</label>
                <textarea
                  value={settings.legalDisclaimer}
                  onChange={(e) => setSettings({ ...settings, legalDisclaimer: e.target.value })}
                  className="w-full text-[11px] p-2 rounded-sm border border-input bg-background/50 h-16 outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </CardContent>
            <div className="p-4 bg-muted/20 border-t border-border/40 flex justify-between gap-2 rounded-b-sm">
              <Button variant="outline" size="sm" onClick={handleReset} className="h-8 text-xs font-medium gap-1 text-muted-foreground">
                <RefreshCw className="h-3 w-3" /> Reset Predesigns
              </Button>
              <Button size="sm" onClick={handleSave} className="h-8 text-xs font-semibold gap-1 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white">
                <Save className="h-3 w-3" /> Compile Manifesto
              </Button>
            </div>
          </Card>
        </div>

        {/* Right column: Simulated A4 Page Display */}
        <div className="lg:col-span-7 min-w-0 flex flex-col space-y-4">
          <div className="flex justify-between items-center gap-2">
            <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground uppercase tracking-wider">A4 Electoral Manifesto Preview</span>
            <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0 h-8 font-mono text-[10px] uppercase border-[#e2e8f0] dark:border-[#333]">
              <Printer className="h-3.5 w-3.5 mr-1" /> Export as PDF
            </Button>
          </div>

          <Card className="glass-card shadow-md p-1.5 sm:p-6 bg-[#eaeaea] dark:bg-[#111] overflow-x-auto flex justify-start sm:justify-center items-center">
            <div className="min-w-[172mm] mx-auto p-2 sm:p-4 shrink-0">
              <div id="manifesto-pdf-print" className="w-[172mm] min-h-[243mm] bg-white dark:bg-zinc-950 p-8 rounded shadow-sm border border-border/40 flex flex-col justify-between text-left relative">
              
              {/* Cover Layout Predesigns */}
              <div>
                
                {/* 1. NATIONALIST TRICOLOR TEMPLATE */}
                {settings.themeStyle === "nationalist-tricolor" && (
                  <div className="space-y-6 animate-fade-in-up">
                    {/* Top Tricolor Banner */}
                    <div className="h-3 w-full flex rounded-sm overflow-hidden shrink-0">
                      <div className="flex-1" style={{ backgroundColor: settings.primaryColor || "#FF9933" }} />
                      <div className="flex-1 bg-white border-y border-zinc-100" />
                      <div className="flex-1" style={{ backgroundColor: settings.secondaryColor || "#138808" }} />
                    </div>

                    {/* Header */}
                    <div className="flex justify-between items-start gap-4 border-b pb-4 border-zinc-200">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: settings.primaryColor || "#FF9933" }}>
                          {settings.partyName || "Poltica Peoples Alliance"}
                        </span>
                        <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">{settings.documentTitle}</h2>
                        <p className="text-xs font-semibold text-zinc-500">{settings.documentSubtitle}</p>
                      </div>
                      {settings.partySymbolUrl && (
                        <div className="h-14 w-14 shrink-0 rounded border bg-white p-1 shadow-sm flex items-center justify-center">
                          <img src={settings.partySymbolUrl} alt="Symbol" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                    </div>

                    {/* Candidate Section */}
                    <div className="grid grid-cols-12 gap-5 items-start bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                      {settings.candidatePhotoUrl && (
                        <div className="col-span-4 relative">
                          <img src={settings.candidatePhotoUrl} alt="Candidate" className="w-full aspect-[3/4] object-cover rounded border-2 border-white shadow-sm" />
                          <div className="absolute -bottom-2 inset-x-2 text-white text-[8px] font-bold text-center py-0.5 rounded shadow" style={{ backgroundColor: settings.secondaryColor || "#138808" }}>
                            VOTE FOR PROGRESS
                          </div>
                        </div>
                      )}
                      <div className="col-span-8 space-y-2">
                        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide border-b border-zinc-200 pb-1 flex justify-between items-center">
                          <span>Candidate Profile</span>
                          <span className="text-[9px] font-extrabold font-mono" style={{ color: settings.primaryColor || "#FF9933" }}>CODE: {candidateUser?.id || "CAN-2026"}</span>
                        </h3>
                        <p className="text-xs font-bold text-zinc-900 leading-snug">{settings.candidateBioHeadline}</p>
                        <p className="text-[11px] text-zinc-600 leading-relaxed">{settings.candidateBioContent}</p>
                      </div>
                    </div>

                    {/* Manifesto Promises Grid */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider border-b pb-1" style={{ color: settings.secondaryColor || "#138808", borderBottomColor: settings.secondaryColor || "#138808" }}>
                        🔑 CORE DEVELOPMENT PLEDGES
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {settings.promises.map((promise, index) => (
                          <div key={index} className="flex items-start gap-2.5 p-2 bg-white rounded border border-zinc-150 text-xs">
                            <span className="h-4 w-4 text-white rounded flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5" style={{ backgroundColor: settings.secondaryColor || "#138808" }}>
                              {index + 1}
                            </span>
                            <span className="text-zinc-800 leading-normal font-medium">{promise}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DEMOCRATIC WAVE TEMPLATE */}
                {settings.themeStyle === "democratic-wave" && (
                  <div className="space-y-6 animate-fade-in-up">
                    {/* Modern Wave Header */}
                    <div className="p-4 rounded-lg text-white flex justify-between items-center relative overflow-hidden" style={{
                      background: `linear-gradient(135deg, ${settings.primaryColor || "#1e3a8a"} 0%, ${settings.secondaryColor || "#3b82f6"} 100%)`
                    }}>
                      <div className="space-y-0.5 relative z-10">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-sky-100 opacity-90">
                          {settings.partyName || "Poltica Alliance"}
                        </span>
                        <h2 className="text-lg font-black tracking-tight">{settings.documentTitle}</h2>
                        <p className="text-[10px] text-sky-100/80">{settings.documentSubtitle}</p>
                      </div>
                      
                      {settings.partySymbolUrl && (
                        <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur p-2 flex items-center justify-center relative z-10">
                          <img src={settings.partySymbolUrl} alt="Symbol" className="max-h-full max-w-full object-contain filter brightness-0 invert" />
                        </div>
                      )}
                    </div>

                    {/* Candidate Profile in 2 columns */}
                    <div className="grid grid-cols-12 gap-6 items-center">
                      <div className="col-span-8 space-y-2 text-left">
                        <div className="text-xs font-black uppercase tracking-wider" style={{ color: settings.primaryColor || "#1e3a8a" }}>Candidate message</div>
                        <h3 className="text-xs font-bold text-zinc-900 leading-snug">{settings.candidateBioHeadline}</h3>
                        <p className="text-[11px] text-zinc-600 leading-relaxed">{settings.candidateBioContent}</p>
                      </div>
                      
                      {settings.candidatePhotoUrl && (
                        <div className="col-span-4 flex flex-col items-center">
                          <div className="h-28 w-28 rounded-full overflow-hidden border-4 shadow-md" style={{ borderColor: settings.secondaryColor || "#3b82f6" }}>
                            <img src={settings.candidatePhotoUrl} alt="Candidate" className="h-full w-full object-cover" />
                          </div>
                          <span className="text-[9px] font-extrabold mt-2 uppercase tracking-widest" style={{ color: settings.primaryColor || "#1e3a8a" }}>
                            {candidateUser?.name || "Rahul Sharma"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Promises with Checkboxes */}
                    <div className="space-y-3 border-t pt-4 border-zinc-150">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: settings.primaryColor || "#1e3a8a" }}>
                        🗳️ ELECTORAL AGENDA & ACTION PLAN
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {settings.promises.map((promise, index) => (
                          <div key={index} className="flex gap-2 p-2 rounded border text-[11px]" style={{ 
                            backgroundColor: `${settings.secondaryColor || "#3b82f6"}08`, 
                            borderColor: `${settings.secondaryColor || "#3b82f6"}20` 
                          }}>
                            <span className="font-bold shrink-0" style={{ color: settings.primaryColor || "#1e3a8a" }}>✔</span>
                            <span className="text-zinc-700 leading-snug">{promise}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SWARAJ EDITORIAL TEMPLATE */}
                {settings.themeStyle === "swaraj-editorial" && (
                  <div className="space-y-5 font-serif animate-fade-in-up">
                    {/* Vintage Trim Header */}
                    <div className="text-center border-b-2 border-double pb-4 space-y-1" style={{ borderBottomColor: settings.primaryColor || "#7f1d1d" }}>
                      <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: settings.secondaryColor || "#d97706" }}>
                        {settings.partyName || "Poltica Peoples Alliance"}
                      </span>
                      <h2 className="text-xl font-bold tracking-wide uppercase" style={{ color: settings.primaryColor || "#7f1d1d" }}>{settings.documentTitle}</h2>
                      <p className="text-[10px] italic text-zinc-500">{settings.documentSubtitle}</p>
                    </div>

                    {/* Editorial Layout */}
                    <div className="flex gap-4">
                      {settings.candidatePhotoUrl && (
                        <div className="w-1/3 shrink-0">
                          <div className="border p-1 bg-amber-50/20" style={{ borderColor: settings.primaryColor || "#7f1d1d" }}>
                            <img src={settings.candidatePhotoUrl} alt="Candidate" className="w-full aspect-[3/4] object-cover grayscale contrast-125 border" style={{ borderColor: settings.primaryColor || "#7f1d1d" }} />
                          </div>
                        </div>
                      )}
                      
                      <div className="w-2/3 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: settings.secondaryColor || "#d97706" }}>Personal Commitment</div>
                        <h3 className="text-xs font-bold text-zinc-900 leading-snug italic">&ldquo;{settings.candidateBioHeadline}&rdquo;</h3>
                        <p className="text-[10px] text-zinc-700 leading-relaxed font-sans">{settings.candidateBioContent}</p>
                      </div>
                    </div>

                    {/* Traditional 1-column Promise List */}
                    <div className="space-y-3 pt-3 border-t" style={{ borderTopColor: `${settings.primaryColor || "#7f1d1d"}40` }}>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: settings.primaryColor || "#7f1d1d" }}>
                        📜 CONSTITUENCY RESOLUTIONS
                      </h4>
                      <div className="space-y-2 font-sans">
                        {settings.promises.map((promise, index) => (
                          <div key={index} className="flex gap-3 text-[11px] items-start border-b border-dashed border-zinc-200 pb-1.5">
                            <span className="font-serif font-bold shrink-0" style={{ color: settings.primaryColor || "#7f1d1d" }}>Pledge {index + 1}.</span>
                            <span className="text-zinc-800 leading-relaxed">{promise}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Unified Official Footer with Contacts & Signature Zone */}
              <div className="border-t border-zinc-200 pt-4 space-y-4 shrink-0">
                <div className="flex justify-between items-end">
                  <div className="space-y-1.5 max-w-[70%]">
                    <div className="grid grid-cols-1 gap-1 text-[9px] text-zinc-500 font-sans">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{settings.contactAddress}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{settings.contactEmail}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span>{settings.contactPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Candidate Signature Box */}
                  <div className="text-right space-y-1">
                    <div className="text-[10px] font-bold italic font-serif text-zinc-850 px-4 border-b border-zinc-400 pb-1">
                      {(settings.candidateSignatureLabel || "").split(",")[0] || "Rahul Sharma"}
                    </div>
                    <div className="text-[8px] text-zinc-400 uppercase tracking-wider font-sans">
                      Authorized Signatory
                    </div>
                  </div>
                </div>

                <div className="text-[8px] text-zinc-400/80 leading-normal text-center pt-2 border-t border-dashed border-zinc-150 font-sans">
                  {settings.legalDisclaimer}
                </div>
              </div>

            </div>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}
