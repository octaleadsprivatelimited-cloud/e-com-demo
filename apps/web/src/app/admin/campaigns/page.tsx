"use client";

import React, { useState, useEffect } from "react";
import { Megaphone, Search, Plus, Trash2, Calendar, MessageSquare, PhoneCall, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
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
import { campaignsApi, candidatesApi } from "@/lib/api";

type Campaign = {
  id: string;
  candidateName: string;
  title: string;
  type: "SMS" | "WhatsApp" | "IVR";
  recipients: number;
  status: "Completed" | "In Progress" | "Scheduled";
  date: string;
};

const initialCampaigns: Campaign[] = [
  { id: "CMP-801", candidateName: "Rahul Sharma", title: "Shivaji Rally Invitation", type: "SMS", recipients: 15000, status: "Completed", date: "Today, 09:00 AM" },
  { id: "CMP-802", candidateName: "Priya Singh", title: "Manifesto PDF Broadcast", type: "WhatsApp", recipients: 12500, status: "In Progress", date: "Today, 11:30 AM" },
  { id: "CMP-803", candidateName: "Amit Kumar", title: "Morning Voice Broadcaster", type: "IVR", recipients: 45000, status: "Completed", date: "Yesterday" },
  { id: "CMP-804", candidateName: "Rahul Sharma", title: "Final Vote Reminder", type: "SMS", recipients: 25000, status: "Scheduled", date: "Tomorrow, 08:00 AM" }
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Create Campaign States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCand, setNewCand] = useState("");
  const [newType, setNewType] = useState<"SMS" | "WhatsApp" | "IVR">("SMS");
  const [newRecipients, setNewRecipients] = useState("");

  const loadCampaigns = React.useCallback(async () => {
    try {
      const [all, cands] = await Promise.all([
        campaignsApi.listAll(),
        candidatesApi.list(),
      ]);
      const nameById = new Map((cands as any[]).map((c) => [c.id, c.name]));
      if (Array.isArray(all) && all.length) {
        setCampaigns(
          (all as any[]).map((c) => ({
            id: c.id,
            candidateName: nameById.get(c.ownerId) || c.ownerId,
            title: c.name,
            type: c.channel === "wa" ? "WhatsApp" : c.channel === "ivr" ? "IVR" : "SMS",
            recipients: c.recipientCount,
            status: c.status === "Scheduled" ? "Scheduled" : "Completed",
            date:
              c.status === "Scheduled"
                ? "Scheduled (Pending)"
                : new Date(c.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
          })),
        );
        return;
      }
    } catch {
      // fall through to demo data
    }
    const list = localStorage.getItem("poltica_admin_campaigns");
    setCampaigns(list ? JSON.parse(list) : initialCampaigns);
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newCand || !newRecipients) {
      alert("All fields are required!");
      return;
    }

    const channel = newType === "WhatsApp" ? "wa" : newType === "IVR" ? "ivr" : "sms";
    const title = newTitle;
    try {
      await campaignsApi.adminCreate({
        candidateName: newCand,
        channel,
        name: title,
        recipientCount: parseInt(newRecipients) || 0,
        status: "Scheduled",
      });
      await loadCampaigns(); // reflect the server-persisted campaign
    } catch (err: any) {
      alert(err?.message || "Could not create the campaign. Please try again.");
      return;
    }

    // Reset Form
    setNewTitle("");
    setNewCand("");
    setNewRecipients("");
    setIsCreateOpen(false);
    alert(`Campaign "${title}" created and scheduled successfully.`);
  };

  const handleCancelCampaign = (id: string) => {
    const updated = campaigns.map(c => {
      if (c.id === id) {
        return { ...c, status: "Completed" as const }; // Complete it
      }
      return c;
    });
    setCampaigns(updated);
    localStorage.setItem("poltica_admin_campaigns", JSON.stringify(updated));
    alert("Campaign marked as completed!");
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm("Are you sure you want to delete this campaign record?")) {
      const updated = campaigns.filter(c => c.id !== id);
      setCampaigns(updated);
      localStorage.setItem("poltica_admin_campaigns", JSON.stringify(updated));
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.candidateName.toLowerCase().includes(search.toLowerCase()) ||
                          c.id.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesType = typeFilter === "all" || c.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Completed</Badge>;
      case "In Progress":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1 w-fit"><RefreshCw className="h-3 w-3 animate-spin" /> In Progress</Badge>;
      case "Scheduled":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Scheduled</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            Campaign Monitoring CRM
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Oversee SMS, WhatsApp, and voice broadcasting campaigns scheduled by candidates.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="h-9 text-xs">
          <Plus className="mr-2 h-4 w-4" /> Trigger New Admin Campaign
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Campaigns", value: campaigns.length, desc: "Platform total", icon: Megaphone, color: "text-primary" },
          { title: "SMS Volume", value: campaigns.filter(c => c.type === "SMS").reduce((acc, c) => acc + c.recipients, 0).toLocaleString(), desc: "Delivered SMS messages", icon: MessageSquare, color: "text-blue-500" },
          { title: "WhatsApp Broadcasts", value: campaigns.filter(c => c.type === "WhatsApp").reduce((acc, c) => acc + c.recipients, 0).toLocaleString(), desc: "Media template dispatches", icon: Sparkles, color: "text-emerald-500" },
          { title: "IVR / Voice Duration", value: campaigns.filter(c => c.type === "IVR").reduce((acc, c) => acc + c.recipients, 0).toLocaleString(), desc: "Triggered phone calls", icon: PhoneCall, color: "text-indigo-500" }
        ].map((stat, i) => (
          <Card key={i} className="glass-card shadow-sm border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* campaigns list table */}
      <Card className="glass-card border border-border/50">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle>Campaign Dispatches</CardTitle>
              <CardDescription>Monitor status, target sizes, and candidate ownership.</CardDescription>
            </div>
            
            {/* filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px] lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns or candidates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-background/50 pl-9 h-9 border-border/50 text-xs"
                />
              </div>

              <select
                className="h-9 px-2 rounded-md border border-border/50 bg-background/50 text-xs focus:outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Scheduled">Scheduled</option>
              </select>

              <select
                className="h-9 px-2 rounded-md border border-border/50 bg-background/50 text-xs focus:outline-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Channels</option>
                <option value="SMS">SMS</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="IVR">IVR</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-card/40">
              <TableRow className="border-border/50">
                <TableHead>Campaign Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Candidate / Owner</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Dispatch Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No campaigns matching filters found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((camp) => (
                  <TableRow key={camp.id} className="border-border/50 hover:bg-accent/40">
                    <TableCell className="font-medium">
                      <div>{camp.title}</div>
                      <div className="text-[10px] text-muted-foreground">{camp.id} • {camp.date}</div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{camp.type}</TableCell>
                    <TableCell className="text-xs">{camp.candidateName}</TableCell>
                    <TableCell className="text-xs">{camp.recipients.toLocaleString()} voters</TableCell>
                    <TableCell>{getStatusBadge(camp.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {camp.status !== "Completed" && (
                          <Button 
                            onClick={() => handleCancelCampaign(camp.id)}
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-border text-xs"
                          >
                            Mark Completed
                          </Button>
                        )}
                        <Button 
                          onClick={() => handleDeleteCampaign(camp.id)}
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create campaign modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-border/50">
          <form onSubmit={handleCreateCampaign}>
            <DialogHeader>
              <DialogTitle>Schedule Platform Campaign</DialogTitle>
              <DialogDescription>
                Schedule an official administration or candidate announcement broadcast.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Campaign Title</Label>
                <Input 
                  placeholder="e.g. Panchayat Voter Awareness Drive" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  required 
                  className="bg-background/50"
                />
              </div>

              <div className="grid gap-2">
                <Label>Assign Candidate (Owner)</Label>
                <Input 
                  placeholder="e.g. Rahul Sharma" 
                  value={newCand} 
                  onChange={(e) => setNewCand(e.target.value)} 
                  required 
                  className="bg-background/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>Channel</Label>
                  <select
                    className="h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                  >
                    <option value="SMS">SMS Message</option>
                    <option value="WhatsApp">WhatsApp Message</option>
                    <option value="IVR">IVR Voice Call</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Target Volume</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 15000" 
                    value={newRecipients} 
                    onChange={(e) => setNewRecipients(e.target.value)} 
                    required 
                    className="bg-background/50"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Schedule Campaign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
