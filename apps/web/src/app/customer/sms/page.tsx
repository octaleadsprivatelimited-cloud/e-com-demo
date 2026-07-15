"use client";

import React, { useState } from "react";
import { MessageSquare, Send, CalendarClock, BookTemplate, Info, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
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

export default function CustomerSMSBlasts() {
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [templateMode, setTemplateMode] = useState("rally");
  
  // Modals and logic state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [customTemplateStatus, setCustomTemplateStatus] = useState<"Draft" | "Pending" | "Approved">("Draft");

  // Load User Data & API Config
  const [candidateName, setCandidateName] = useState("Rahul Sharma");
  const [availableCredits, setAvailableCredits] = useState(50000);
  const [apiConfig, setApiConfig] = useState<any>(null);

  const loadUserData = React.useCallback(async () => {
    // Name and gateway config come from the cached session (instant paint).
    try {
      const sessionUser = localStorage.getItem("currentCustomerUser");
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        if (parsed.name) setCandidateName(parsed.name);
        if (parsed.apiConfig) setApiConfig(parsed.apiConfig);
        if (parsed.balances?.sms !== undefined) setAvailableCredits(parsed.balances.sms);
      }
    } catch {}

    // Authoritative SMS balance from the server.
    try {
      const me = await candidatesApi.me();
      if (me.balances?.sms !== undefined) setAvailableCredits(me.balances.sms);
      if ((me as any).apiConfig) setApiConfig((me as any).apiConfig);
    } catch {
      // Not signed in / API down — keep the cached value.
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

  const charCount = message.length;
  const smsCountPerPerson = Math.ceil(charCount / 160) || 1;
  const targetCount = audienceMap[audience];
  const totalCost = targetCount * smsCountPerPerson;
  
  const hasEnoughCredits = availableCredits >= totalCost;
  
  // A campaign is ready to send IF it's not custom OR if the custom template is approved
  const isReadyToSend = (templateMode !== "custom") || (templateMode === "custom" && customTemplateStatus === "Approved");

  // Process live preview variables
  const getPreviewText = () => {
    if (!message) return "";
    return message
      .replace(/\[Candidate Name\]/g, candidateName)
      .replace(/\[Location\]/g, "Shivaji Park")
      .replace(/\[Time\]/g, "10:00 AM")
      .replace(/\[Date\]/g, "15th Nov")
      .replace(/\[Symbol\]/g, "Lotus");
  };

  const handleTemplateSelect = (val: string) => {
    setTemplateMode(val);
    if(val === "rally") {
      setMessage("Dear Voter, please join our grand rally tomorrow at [Location] at [Time]. Support [Candidate Name]! - Poltica");
    } else if(val === "vote") {
      setMessage("Vote for [Candidate Name] for a better future! Your vote counts on [Date]. Press the [Symbol] button. - Poltica");
    } else {
      setMessage("");
      setCustomTemplateStatus("Draft");
    }
  };

  const handleSendProcess = async () => {
    setIsSending(true);
    setSendError("");
    try {
      // Server-side: verifies credits, deducts atomically, records the campaign.
      const res = await campaignsApi.send({
        channel: "sms",
        name: campaignName || "SMS Campaign",
        message,
        recipientCount: totalCost,
      });

      // Reflect the authoritative post-send balance from the server.
      setAvailableCredits(res.balances.sms);
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
      setSendError(err?.message || "Could not send the campaign. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitForApproval = () => {
    setIsSubmittingApproval(true);
    setTimeout(() => {
      setIsSubmittingApproval(false);
      setCustomTemplateStatus("Pending");
    }, 1500);
  };

  const resetForm = () => {
    setIsSuccess(false);
    setIsConfirmOpen(false);
    setIsScheduleOpen(false);
    setSendError("");
    setMessage("");
    setCampaignName("");
    setScheduleTime("");
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-[24px] font-semibold text-[#1e293b] dark:text-white leading-tight">Compose SMS Campaign</h1>
        <p className="text-[13px] text-[#64748b] dark:text-[#999] mt-1">
          Draft and send targeted text messages to your voter base.
        </p>
      </div>

      {/* Active Gateway / Sandbox Mode Indicator */}
      {apiConfig && apiConfig.smsApiKey ? (
        <div className="bg-[#EFF6FC] dark:bg-zinc-900 border-l-4 border-[#2563eb] p-4 rounded-sm flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-[#2563eb] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#2563eb]">Live SMS Gateway Configured</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Using <strong>{apiConfig.smsProvider === 'twilio' ? 'Twilio Programmable SMS' : apiConfig.smsProvider === 'msg91' ? 'Msg91 SMS Gateway' : 'Custom SMPP Server'}</strong> with Sender ID/Shortcode <code className="bg-[#e2e8f0] dark:bg-[#333] px-1 py-0.5 rounded font-mono text-[11px]">{apiConfig.smsSenderId || 'None'}</code>.
              </p>
            </div>
          </div>
          <Link href="/customer/settings">
            <Button variant="outline" className="border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/10 h-8 text-xs font-semibold rounded-sm">Change Config</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-[#fffbeb] dark:bg-zinc-900 border-l-4 border-[#f59e0b] p-4 rounded-sm flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#b45309] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#b45309]">Running in Sandbox Mode</p>
              <p className="mt-0.5 text-xs text-muted-foreground">No SMS credentials configured. Campaign dispatches will be simulated. Set up your Twilio or Msg91 credentials in Settings to activate live delivery.</p>
            </div>
          </div>
          <Link href="/customer/settings">
            <Button variant="outline" className="border-[#f59e0b] text-[#b45309] hover:bg-[#fffbeb] h-8 text-xs font-semibold rounded-sm">Set Up Gateway</Button>
          </Link>
        </div>
      )}

      {/* Warning if credits are low */}
      {!hasEnoughCredits && message.length > 0 && (
        <div className="bg-[#fef2f2] dark:bg-zinc-900 border-l-4 border-[#dc2626] p-4 rounded-r flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#dc2626] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#dc2626]">Insufficient SMS Credits</p>
              <p className="mt-0.5">This campaign requires {totalCost.toLocaleString()} credits, but you only have {availableCredits.toLocaleString()} available.</p>
            </div>
          </div>
          <Link href="/customer/billing">
            <Button className="bg-[#dc2626] hover:bg-[#831e22] text-white h-8 text-xs font-semibold rounded-sm">Top-Up Now</Button>
          </Link>
        </div>
      )}

      {/* Warning for Custom Template Status */}
      {templateMode === "custom" && customTemplateStatus === "Pending" && (
        <div className="bg-[#fffbeb] dark:bg-zinc-900 border-l-4 border-[#f59e0b] p-4 rounded-r flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-[#b45309] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#b45309]">Approval Pending</p>
              <p className="mt-0.5">Your custom DLT template has been submitted to the Super Admin. You cannot send this campaign until it is approved.</p>
            </div>
          </div>
        </div>
      )}

      {templateMode === "custom" && customTemplateStatus === "Approved" && (
        <div className="bg-[#f0fdf4] dark:bg-zinc-900 border-l-4 border-[#16a34a] p-4 rounded-r flex items-center justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#16a34a] mt-0.5 shrink-0" />
            <div className="text-sm text-[#1e293b] dark:text-zinc-300">
              <p className="font-semibold text-[#16a34a]">Template Approved</p>
              <p className="mt-0.5">Your custom DLT template is approved and ready for dispatch.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card md:col-span-2 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Campaign Details</CardTitle>
            <CardDescription>
              Select your approved DLT template or request a new custom template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input 
                placeholder="e.g. Pre-Election Reminder" 
                className="bg-background/50" 
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><BookTemplate className="h-4 w-4" /> DLT Approved Template</Label>
              <Select value={templateMode} onValueChange={(val) => handleTemplateSelect(val || "")}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select a pre-approved template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rally">Grand Rally Invitation (ID: 10012938)</SelectItem>
                  <SelectItem value="vote">Voting Appeal (ID: 10012939)</SelectItem>
                  <SelectItem value="custom">Write Custom Message (Requires Admin Approval)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Message Content</Label>
                <span className={`text-xs ${charCount > 160 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {charCount} chars | {smsCountPerPerson} SMS credit(s) per person
                </span>
              </div>
              <Textarea 
                placeholder={templateMode === "custom" ? "Write your completely custom SMS template here..." : "Type your campaign message here..."}
                className="bg-background/50 min-h-[150px] resize-none"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (templateMode === "custom" && customTemplateStatus !== "Draft") {
                    setCustomTemplateStatus("Draft"); // Re-draft if they edit after approval/pending
                  }
                }}
                disabled={templateMode !== "custom" && templateMode !== ""}
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
          </CardContent>
          
          {/* Footer dynamically changes based on Template Mode */}
          {templateMode === "custom" && customTemplateStatus === "Draft" ? (
            <CardFooter className="flex justify-end border-t border-border/50 pt-6">
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={!message || isSubmittingApproval}
                onClick={handleSubmitForApproval}
              >
                {isSubmittingApproval ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <><Info className="mr-2 h-4 w-4" /> Submit Custom Template for Approval</>}
              </Button>
            </CardFooter>
          ) : (
            <CardFooter className="flex justify-between border-t border-border/50 pt-6">
              <Button 
                variant="outline" 
                disabled={!message || !campaignName || !hasEnoughCredits || !isReadyToSend}
                onClick={() => setIsScheduleOpen(true)}
              >
                <CalendarClock className="mr-2 h-4 w-4" /> Schedule
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!message || !campaignName || !hasEnoughCredits || !isReadyToSend}
                onClick={() => { setSendError(""); setIsConfirmOpen(true); }}
              >
                <Send className="mr-2 h-4 w-4" /> Send Blast Now
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Live Preview Pane */}
        <Card className="glass-card border-primary/20 bg-primary/5 h-fit sticky top-24">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary">Live Preview</CardTitle>
            <CardDescription>How it looks on a phone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[8px] rounded-[2.5rem] h-[400px] w-full max-w-[250px] shadow-xl overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-4 bg-gray-800 rounded-b-xl w-32 mx-auto z-10"></div>
              <div className="bg-white dark:bg-gray-100 h-full w-full flex flex-col pt-10">
                <div className="flex-1 bg-gray-100 dark:bg-gray-200 p-3 overflow-y-auto flex flex-col gap-2">
                  {message ? (
                    <div className="bg-blue-500 text-white p-3 rounded-2xl rounded-tr-sm text-sm shadow-sm ml-4 self-end break-words">
                      {getPreviewText()}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 text-xs mt-10">Type a message to preview</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-2 items-start text-xs text-muted-foreground">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <p>Variables like [Candidate Name] are dynamically replaced. Custom templates must be approved before they can be sent.</p>
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
                <DialogTitle>Confirm Immediate Launch</DialogTitle>
                <DialogDescription>
                  You are about to launch a live SMS campaign to {targetCount.toLocaleString()} contacts immediately.
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
                  <span className="text-muted-foreground">Route Gateway</span>
                  <span className="font-medium">
                    {apiConfig && apiConfig.smsApiKey 
                      ? (apiConfig.smsProvider === 'twilio' ? 'Twilio Live' : apiConfig.smsProvider === 'msg91' ? 'Msg91 Live' : 'SMPP Server') 
                      : 'Sandbox Simulator'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="font-semibold text-primary">Total Cost Deducted</span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-base">
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
                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto" disabled={isSending} onClick={handleSendProcess}>
                  {isSending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transmitting...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Confirm & Send</>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold">Blast Initiated!</h2>
              <p className="text-muted-foreground text-sm max-w-[300px]">
                Your SMS campaign <strong>"{campaignName}"</strong> has been successfully queued for delivery via <strong>{apiConfig && apiConfig.smsApiKey ? (apiConfig.smsProvider === 'twilio' ? 'Twilio' : apiConfig.smsProvider === 'msg91' ? 'Msg91' : 'SMPP') : 'Sandbox Simulator'}</strong>.
              </p>
              <Button variant="outline" className="mt-6" onClick={resetForm}>Create Another Campaign</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
