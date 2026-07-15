"use client";

import React, { useState } from "react";
import { PhoneCall, Mic, UploadCloud, Play, CalendarClock, Globe, Volume2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function CustomerIVR() {
  const [file, setFile] = useState<File | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [audience, setAudience] = useState("all");
  
  // Modals and logic state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  // User Data & API Config State
  const [availableCredits, setAvailableCredits] = useState(25000);
  const [apiConfig, setApiConfig] = useState<any>(null);

  const loadUserData = React.useCallback(async () => {
    try {
      const sessionUser = localStorage.getItem("currentCustomerUser");
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        if (parsed.apiConfig) setApiConfig(parsed.apiConfig);
        if (parsed.balances?.ivr !== undefined) setAvailableCredits(parsed.balances.ivr);
      }
    } catch {}

    // Authoritative IVR balance from the server.
    try {
      const me = await candidatesApi.me();
      if (me.balances?.ivr !== undefined) setAvailableCredits(me.balances.ivr);
      if ((me as any).apiConfig) setApiConfig((me as any).apiConfig);
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
  const totalCost = targetCount; // 1 Credit = 1 Call attempt
  const hasEnoughCredits = availableCredits >= totalCost;

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSendProcess = async () => {
    setIsSending(true);
    setSendError("");
    try {
      const res = await campaignsApi.send({
        channel: "ivr",
        name: campaignName || "IVR Voice Campaign",
        message: "Automated voice broadcast",
        recipientCount: totalCost,
      });
      setAvailableCredits(res.balances.ivr);
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
      setSendError(err?.message || "Could not start the campaign. Please try again.");
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
    setFile(null);
  };

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Voice Campaign</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Launch automated IVR calls using recorded voice clips or text-to-speech.
          </p>
        </div>
      </div>

      {/* Active IVR Gateway / Sandbox Mode Indicator */}
      {apiConfig && apiConfig.ivrSid && apiConfig.ivrAuth ? (
        <div className="bg-[#EFF6FC] dark:bg-zinc-900 border-l-4 border-[#2563eb] p-4 rounded-sm flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-[#2563eb] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#2563eb]">Live Voice Trunk Configured</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Routing calls via <strong>{apiConfig.ivrProvider === 'twilio' ? 'Twilio Voice API' : apiConfig.ivrProvider === 'exotel' ? 'Exotel Voice Trunk' : 'Custom SIP Gateway'}</strong> using Caller ID <code className="bg-[#e2e8f0] dark:bg-[#333] px-1 py-0.5 rounded font-mono text-[11px]">{apiConfig.ivrCallerId || 'None'}</code>.
              </p>
            </div>
          </div>
          <Link href="/customer/settings">
            <Button variant="outline" className="border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/10 h-8 text-xs font-semibold rounded-sm">Change Trunk</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-[#fffbeb] dark:bg-zinc-900 border-l-4 border-[#f59e0b] p-4 rounded-sm flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#b45309] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#b45309]">Running in Sandbox Mode</p>
              <p className="mt-0.5 text-xs text-muted-foreground">No Voice Trunk credentials configured. Calls will be simulated. Set up your Twilio or Exotel credentials in Settings to route live IVR campaigns.</p>
            </div>
          </div>
          <Link href="/customer/settings">
            <Button variant="outline" className="border-[#f59e0b] text-[#b45309] hover:bg-[#fffbeb] h-8 text-xs font-semibold rounded-sm">Set Up Trunk</Button>
          </Link>
        </div>
      )}

      {/* Warning if credits are low */}
      {!hasEnoughCredits && campaignName && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-sm text-destructive">
              <p className="font-semibold">Insufficient IVR Credits</p>
              <p>This campaign requires {totalCost.toLocaleString()} credits, but you only have {availableCredits.toLocaleString()} available.</p>
            </div>
          </div>
          <Link href="/customer/billing">
            <Button variant="destructive" size="sm">Top-Up Now</Button>
          </Link>
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PhoneCall className="h-5 w-5" /> Campaign Setup</CardTitle>
            <CardDescription>
              Provide the details of your voice broadcast campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input 
                placeholder="e.g. Election Eve Reminder" 
                className="bg-background/50" 
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-card border border-border/50">
                <TabsTrigger value="upload" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <UploadCloud className="mr-2 h-4 w-4" /> Upload Audio
                </TabsTrigger>
                <TabsTrigger value="tts" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <Mic className="mr-2 h-4 w-4" /> Text-to-Speech
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="pt-4 space-y-4">
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-primary/30 rounded-lg p-12 text-center bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Play className="h-6 w-6 text-emerald-500" />
                      </div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <Button variant="outline" size="sm" onClick={() => setFile(null)} className="mt-2">
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className="h-10 w-10 text-primary mb-2" />
                      <p className="font-medium">Drag & drop your voice file here</p>
                      <p className="text-xs text-muted-foreground">Supported formats: .mp3, .wav (Max 5MB)</p>
                      <div className="mt-4">
                        <Button variant="secondary" size="sm">Browse Files</Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tts" className="pt-4 space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Language / Accent</Label>
                      <Select defaultValue="hi-IN">
                        <SelectTrigger className="bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hi-IN">Hindi (India)</SelectItem>
                          <SelectItem value="mr-IN">Marathi (India)</SelectItem>
                          <SelectItem value="en-IN">English (India)</SelectItem>
                          <SelectItem value="te-IN">Telugu (India)</SelectItem>
                          <SelectItem value="kn-IN">Kannada (India)</SelectItem>
                          <SelectItem value="ta-IN">Tamil (India)</SelectItem>
                          <SelectItem value="bn-IN">Bengali (India)</SelectItem>
                          <SelectItem value="gu-IN">Gujarati (India)</SelectItem>
                          <SelectItem value="ml-IN">Malayalam (India)</SelectItem>
                          <SelectItem value="pa-IN">Punjabi (India)</SelectItem>
                          <SelectItem value="od-IN">Odia (India)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Voice Type</Label>
                      <Select defaultValue="male1">
                        <SelectTrigger className="bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male1">Male (Standard)</SelectItem>
                          <SelectItem value="male2">Male (Authoritative)</SelectItem>
                          <SelectItem value="female1">Female (Standard)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Message Text</Label>
                    <Textarea 
                      placeholder="Type the message you want the AI to speak..." 
                      className="bg-background/50 min-h-[100px] resize-none"
                    />
                  </div>
                  <Button variant="outline" className="w-full">
                    <Volume2 className="mr-2 h-4 w-4 text-primary" /> Generate Preview
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
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
              <div className="space-y-2">
                <Label>Retry Logic</Label>
                <Select defaultValue="2">
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Retries</SelectItem>
                    <SelectItem value="1">1 Retry if Busy/No Answer</SelectItem>
                    <SelectItem value="2">2 Retries (Recommended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 pt-6">
            <Button 
              variant="outline"
              disabled={!campaignName || !hasEnoughCredits}
              onClick={() => setIsScheduleOpen(true)}
            >
              <CalendarClock className="mr-2 h-4 w-4" /> Schedule Call
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!campaignName || !hasEnoughCredits}
              onClick={() => { setSendError(""); setIsConfirmOpen(true); }}
            >
              <PhoneCall className="mr-2 h-4 w-4" /> Start Dialing Now
            </Button>
          </CardFooter>
        </Card>

        {/* Campaign Settings Pane */}
        <Card className="glass-card h-fit sticky top-24">
          <CardHeader>
            <CardTitle className="text-lg">IVR Configuration</CardTitle>
            <CardDescription>Advanced routing settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-background/50 border border-border/50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <Label className="font-semibold text-sm">Caller ID / Route</Label>
                <Badge variant="outline" className={apiConfig && apiConfig.ivrSid && apiConfig.ivrAuth ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}>
                  {apiConfig && apiConfig.ivrSid && apiConfig.ivrAuth ? "Verified" : "Sandbox"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" /> {apiConfig && apiConfig.ivrCallerId ? apiConfig.ivrCallerId : "Transactional (+91 98765 *****)"}
              </div>
            </div>

            <div className="p-3 bg-background/50 border border-border/50 rounded-lg space-y-2">
              <Label className="font-semibold text-sm block">Keypress Actions (DTMF)</Label>
              <div className="flex justify-between items-center text-sm text-muted-foreground border-b border-border/50 pb-2">
                <span>Press 1</span>
                <span className="text-foreground">Connect to Executive</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Press 2</span>
                <span className="text-foreground">Opt-out / DND</span>
              </div>
              <Button variant="link" className="px-0 h-auto text-primary text-xs w-full text-left justify-start">
                + Add Keypress Action
              </Button>
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
                <DialogTitle>Confirm IVR Broadcast</DialogTitle>
                <DialogDescription>
                  You are about to instantly broadcast this Voice Campaign to {targetCount.toLocaleString()} voters.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Campaign Name</span>
                  <span className="font-medium">{campaignName}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Total Recipients</span>
                  <span className="font-medium">{targetCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Voice Route</span>
                  <span className="font-medium">
                    {apiConfig && apiConfig.ivrSid && apiConfig.ivrAuth 
                      ? (apiConfig.ivrProvider === 'twilio' ? 'Twilio Voice Trunk' : apiConfig.ivrProvider === 'exotel' ? 'Exotel Voice Trunk' : 'SIP Trunk') 
                      : 'Sandbox Simulator'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="font-semibold text-emerald-500">Total IVR Credits</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-base">
                    {totalCost.toLocaleString()} Credits
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
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Dialing...</>
                  ) : (
                    <><PhoneCall className="mr-2 h-4 w-4" /> Confirm & Start</>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-semibold">Broadcasting Live!</h2>
              <p className="text-muted-foreground text-sm max-w-[300px]">
                Your IVR campaign <strong>"{campaignName}"</strong> is currently active and dispatching calls via <strong>{apiConfig && apiConfig.ivrSid && apiConfig.ivrAuth ? (apiConfig.ivrProvider === 'twilio' ? 'Twilio Voice' : apiConfig.ivrProvider === 'exotel' ? 'Exotel Voice' : 'SIP Trunk') : 'Sandbox Simulator'}</strong> to {targetCount.toLocaleString()} voters.
              </p>
              <Button variant="outline" className="mt-6" onClick={resetForm}>Create Another IVR</Button>
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
                <DialogTitle>Schedule IVR Broadcast</DialogTitle>
                <DialogDescription>
                  Choose a date and time to automatically initiate this voice broadcast to {targetCount.toLocaleString()} contacts.
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
                    <span className="font-semibold text-emerald-500">Credits to Reserve</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-base">
                      {totalCost.toLocaleString()} Credits
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
              <h2 className="text-2xl font-semibold">IVR Scheduled!</h2>
              <p className="text-muted-foreground text-sm max-w-[300px]">
                Your IVR broadcast <strong>"{campaignName}"</strong> is scheduled for {new Date(scheduleTime).toLocaleString()} to {targetCount.toLocaleString()} voters.
              </p>
              <Button variant="outline" className="mt-6" onClick={resetForm}>Back to Campaign Editor</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
