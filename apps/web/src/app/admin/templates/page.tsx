"use client";

import React, { useState, useEffect } from "react";
import { BookTemplate, Check, X, Search, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { templatesApi } from "@/lib/api";

type TemplateReq = {
  id: string;
  candidate: string;
  district: string;
  message: string;
  status: "Pending" | "Approved" | "Rejected";
  date: string;
  messageType?: string;
  templateName?: string;
};

export default function AdminDLTApprovals() {
  const [templates, setTemplates] = useState<TemplateReq[]>([]);
  const [search, setSearch] = useState("");
  
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateReq | null>(null);
  const [actionType, setActionType] = useState<"Approve" | "Reject" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const apiList = await templatesApi.list();
        if (Array.isArray(apiList) && apiList.length) {
          setTemplates(apiList as TemplateReq[]);
          return;
        }
      } catch {
        // fall through to local cache / seed below
      }
      loadLocalTemplates();
    })();
  }, []);

  const loadLocalTemplates = () => {
    const list = localStorage.getItem("poltica_dlt_templates");
    if (list) {
      // Map properties if needed (unified format compatibility)
      const parsed = JSON.parse(list).map((item: any) => ({
        id: item.id || `TMP-${Math.floor(Math.random() * 1000)}`,
        candidate: item.candidate || item.candidateName || "Rahul Sharma",
        district: item.district || "Pune",
        message: item.message || item.content || "",
        status: item.status || "Pending",
        date: item.date || "Today",
        messageType: item.messageType || "SMS",
        templateName: item.templateName || "Custom_Template"
      }));
      setTemplates(parsed);
    } else {
      const initial: TemplateReq[] = [
        { id: "DLT-882", candidate: "Rahul Sharma", district: "Pune", message: "Dear Voter, Join Rahul Sharma on 12th July for the Pune Gram Panchayat election rally. Your vote matters!", status: "Pending", date: "Today, 10:30 AM", messageType: "SMS", templateName: "Election_Greeting_2026" },
        { id: "DLT-904", candidate: "Priya Singh", district: "Nashik", message: "Greetings! Click here to download Priya Singh's development manifesto for Nashik East.", status: "Pending", date: "Yesterday", messageType: "WhatsApp", templateName: "WhatsApp_Manifesto_Launch" },
        { id: "DLT-711", candidate: "Amit Kumar", district: "Nagpur", message: "Listen to the vision of Amit Kumar for clean water and better roads in Nagpur South.", status: "Pending", date: "Yesterday", messageType: "SMS", templateName: "IVR_Audio_Script" }
      ];
      localStorage.setItem("poltica_dlt_templates", JSON.stringify(initial));
      setTemplates(initial);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.candidate.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = () => {
    if (!selectedTemplate || !actionType) return;

    const newStatus = actionType === "Approve" ? ("Approved" as const) : ("Rejected" as const);
    const updated = templates.map(t =>
      t.id === selectedTemplate.id ? { ...t, status: newStatus } : t
    );
    setTemplates(updated);
    localStorage.setItem("poltica_dlt_templates", JSON.stringify(updated));
    // Persist the approval decision server-side.
    templatesApi.setStatus(selectedTemplate.id, newStatus).catch(() => {});

    setSelectedTemplate(null);
    setActionType(null);
    alert(`Template has been ${actionType === "Approve" ? "approved" : "rejected"} successfully.`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20"><AlertCircle className="h-3 w-3 mr-1" /> Pending Review</Badge>;
      case "Approved":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case "Rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DLT Template Approvals</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and approve custom SMS messages requested by candidates.
          </p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><BookTemplate className="h-5 w-5" /> Submission Queue</CardTitle>
              <CardDescription>
                Ensure messages comply with telecom DLT regulations before authorizing dispatch.
              </CardDescription>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates or ID..."
                className="w-full bg-background/50 pl-9 border-border/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 bg-background/30 overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-card/30">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>Template ID</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead className="w-[40%]">Message Content</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No template submissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((tmp) => (
                    <TableRow key={tmp.id} className="border-border/50">
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{tmp.id}</div>
                        <div className="text-xs text-muted-foreground mt-1">{tmp.date}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{tmp.candidate}</div>
                        <div className="text-xs text-muted-foreground">{tmp.district}</div>
                      </TableCell>
                      <TableCell>
                        <div className="bg-background/50 p-3 rounded-lg text-sm border border-border/50 relative group">
                          {tmp.message}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tmp.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {tmp.status === "Pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                              onClick={() => { setSelectedTemplate(tmp); setActionType("Approve"); }}
                            >
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => { setSelectedTemplate(tmp); setActionType("Reject"); }}
                            >
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Processed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className={actionType === "Approve" ? "text-emerald-500" : "text-destructive"}>
              {actionType === "Approve" ? "Approve DLT Template?" : "Reject DLT Template?"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "Approve" 
                ? "You are about to authorize this custom message. The candidate will immediately be able to send this out in bulk SMS campaigns." 
                : "You are rejecting this template. The candidate will be notified that this message violates telecom guidelines."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 bg-background/50 p-4 rounded-lg border border-border/50 text-sm">
            <span className="text-muted-foreground text-xs block mb-1">Message Content:</span>
            {selectedTemplate?.message}
          </div>

          {actionType === "Reject" && (
            <div className="space-y-2 mb-4">
              <Label>Reason for Rejection (Optional)</Label>
              <Input placeholder="e.g. Violates DLT promotional guidelines regarding cash promises..." className="bg-background/50" />
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedTemplate(null)}>Cancel</Button>
            <Button 
              variant={actionType === "Approve" ? "default" : "destructive"} 
              className={actionType === "Approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              onClick={handleAction}
            >
              Confirm {actionType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
