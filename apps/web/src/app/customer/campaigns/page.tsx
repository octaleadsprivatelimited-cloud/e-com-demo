"use client";

import React, { useState } from "react";
import { 
  Megaphone, 
  Plus, 
  MessageSquare, 
  MessageCircle,
  PhoneCall, 
  Search, 
  Play, 
  Pause, 
  FileText, 
  Trash2,
  CalendarClock,
  Download,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import Link from "next/link";
import { campaignsApi } from "@/lib/api";

type Campaign = {
  id: string;
  name: string;
  type: "SMS" | "IVR" | "WhatsApp";
  status: "Active" | "Scheduled" | "Completed" | "Draft" | "Paused";
  audienceSize: number;
  progress: number;
  date: string;
  cost: number;
};

const initialCampaigns: Campaign[] = [
  { id: "CMP-001", name: "Diwali Greetings Blast", type: "SMS", status: "Completed", audienceSize: 45000, progress: 100, date: "12 Nov 2026", cost: 45000 },
  { id: "CMP-002", name: "Rally Invite - Shivaji Park", type: "IVR", status: "Active", audienceSize: 18000, progress: 65, date: "Today", cost: 18000 },
  { id: "CMP-003", name: "Youth Manifesto Announcement", type: "WhatsApp", status: "Scheduled", audienceSize: 22000, progress: 0, date: "15 Nov 2026, 10:00 AM", cost: 22000 },
  { id: "CMP-004", name: "Pre-Election Reminder", type: "SMS", status: "Draft", audienceSize: 45000, progress: 0, date: "-", cost: 45000 },
  { id: "CMP-005", name: "Weekly Ward Update", type: "IVR", status: "Completed", audienceSize: 12000, progress: 100, date: "01 Nov 2026", cost: 12000 },
];

export default function CustomerCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Modal States
  const [selectedCamp, setSelectedCamp] = useState<Campaign | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPauseConfirmOpen, setIsPauseConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Load this tenant's real campaigns from the API; fall back to the demo
  // ledger only when the account has none yet.
  React.useEffect(() => {
    (async () => {
      try {
        const list = await campaignsApi.list();
        if (list.length) {
          setCampaigns(
            list.map((c: any) => ({
              id: c.id,
              name: c.name,
              type: c.channel === "wa" ? "WhatsApp" : c.channel === "ivr" ? "IVR" : "SMS",
              status: "Completed",
              audienceSize: c.recipientCount,
              progress: 100,
              date: new Date(c.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
              cost: c.creditsUsed,
            })),
          );
        }
      } catch {
        // Not signed in / API down — keep the demo ledger.
      }
    })();
  }, []);

  const filteredCampaigns = campaigns.filter(camp => {
    const matchesFilter = filter === "All" || camp.status === filter;
    const matchesSearch = camp.name.toLowerCase().includes(search.toLowerCase()) || camp.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handlePause = () => {
    if(!selectedCamp) return;
    setCampaigns(campaigns.map(c => 
      c.id === selectedCamp.id 
        ? { ...c, status: c.status === "Active" ? "Paused" : "Active" } 
        : c
    ));
    setIsPauseConfirmOpen(false);
  };

  const handleDelete = () => {
    if(!selectedCamp) return;
    setCampaigns(campaigns.filter(c => c.id !== selectedCamp.id));
    setIsDeleteConfirmOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><Play className="h-3 w-3 mr-1" /> Live</Badge>;
      case "Scheduled":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20"><CalendarClock className="h-3 w-3 mr-1" /> Scheduled</Badge>;
      case "Completed":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "Paused":
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20"><Pause className="h-3 w-3 mr-1" /> Paused</Badge>;
      case "Draft":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Draft</Badge>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "SMS": return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "IVR": return <PhoneCall className="h-4 w-4 text-emerald-500" />;
      case "WhatsApp": return <Megaphone className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  // Mock data generator for reports
  const getReportData = (camp: Campaign) => {
    if (camp.type === "IVR") {
      return [
        { name: 'Answered', value: Math.floor(camp.audienceSize * 0.65), color: '#10b981' },
        { name: 'Busy/No Answer', value: Math.floor(camp.audienceSize * 0.25), color: '#f59e0b' },
        { name: 'Failed', value: Math.floor(camp.audienceSize * 0.10), color: '#ef4444' },
      ];
    }
    return [
      { name: 'Delivered', value: Math.floor(camp.audienceSize * 0.96), color: '#3b82f6' },
      { name: 'Pending', value: Math.floor(camp.audienceSize * 0.02), color: '#f59e0b' },
      { name: 'Failed', value: Math.floor(camp.audienceSize * 0.02), color: '#ef4444' },
    ];
  };

  const getFailureReasons = (type: "SMS" | "IVR" | "WhatsApp", count: number) => {
    if (type === "WhatsApp") {
      return [
        { reason: "No WhatsApp Account", description: "Voter does not have a registered WhatsApp account on this number.", percentage: 65, count: Math.floor(count * 0.65) },
        { reason: "Device Offline / Network Timeout", description: "Mobile phone is switched off or lacks internet connection.", percentage: 25, count: Math.floor(count * 0.25) },
        { reason: "Invalid Number Format", description: "Mobile number is incorrect or has an invalid country code.", percentage: 10, count: Math.floor(count * 0.10) }
      ];
    } else if (type === "SMS") {
      return [
        { reason: "DND (Do Not Disturb) Blocked", description: "Voter is registered under TRAI's Do-Not-Disturb registry.", percentage: 55, count: Math.floor(count * 0.55) },
        { reason: "Inbox Full / Storage Exceeded", description: "Voter's device cannot receive messages due to storage limits.", percentage: 25, count: Math.floor(count * 0.25) },
        { reason: "Carrier Delivery Failure", description: "Telecom operator gateway timed out or experienced transit error.", percentage: 20, count: Math.floor(count * 0.20) }
      ];
    } else { // IVR
      return [
        { reason: "Switched Off / Out of Network", description: "Phone was switched off or out of coverage when call was placed.", percentage: 50, count: Math.floor(count * 0.50) },
        { reason: "Call Declined / User Busy", description: "Voter rejected the incoming campaign call or was active on another line.", percentage: 35, count: Math.floor(count * 0.35) },
        { reason: "No Response / Rings Out", description: "Voter phone rang but call was not answered within 30 seconds.", percentage: 15, count: Math.floor(count * 0.15) }
      ];
    }
  };

  const getSampleVoterLogs = (type: "SMS" | "IVR" | "WhatsApp") => {
    if (type === "WhatsApp") {
      return [
        { name: "Amit Kumar 42", mobile: "9876543201", status: "Delivered", details: "Sent via WhatsApp Cloud API successfully" },
        { name: "Priya Singh 79", mobile: "9123456780", status: "Failed", details: "Ignored (No WhatsApp Account)" },
        { name: "Rahul Dev 112", mobile: "9234567891", status: "Failed", details: "Failed (Device Offline / Network Timeout)" },
        { name: "Sneha Patel 231", mobile: "9345678902", status: "Delivered", details: "Read (Double blue check)" },
        { name: "Sunita Sharma 504", mobile: "9456789013", status: "Failed", details: "Ignored (No WhatsApp Account)" },
        { name: "Rajesh Gupta 1109", mobile: "9567890124", status: "Delivered", details: "Delivered (Double grey check)" },
      ];
    } else if (type === "SMS") {
      return [
        { name: "Karan Johar 88", mobile: "9876543220", status: "Failed", details: "Blocked (DND Registry Active)" },
        { name: "Vikram Rathore 142", mobile: "9123456799", status: "Delivered", details: "Delivered (Operator Success Acknowledgement)" },
        { name: "Divya Deshmukh 602", mobile: "9234567802", status: "Failed", details: "Failed (Carrier Route Reject)" },
        { name: "Sunita Sharma 712", mobile: "9345678912", status: "Delivered", details: "Delivered (Operator Success Acknowledgement)" },
        { name: "Rahul Dev 944", mobile: "9456789022", status: "Failed", details: "Blocked (DND Registry Active)" },
      ];
    } else { // IVR
      return [
        { name: "Rahul Dev 6", mobile: "9876543205", status: "Answered", details: "Completed (Duration: 42s)" },
        { name: "Sneha Patel 38", mobile: "9123456708", status: "Failed", details: "Switched Off / Out of Network" },
        { name: "Amit Kumar 99", mobile: "9234567809", status: "Failed", details: "Call Declined / User Busy" },
        { name: "Vijay Yadav 150", mobile: "9345678910", status: "Answered", details: "Completed (Duration: 18s)" },
        { name: "Rajesh Gupta 299", mobile: "9456789011", status: "Failed", details: "No Response / Rings Out" },
      ];
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Campaigns</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create, manage, and track your ongoing multi-channel campaigns.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/customer/sms">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 rounded-sm">
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> New SMS Blast
            </Button>
          </Link>
          <Link href="/customer/whatsapp">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-sm">
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> New WhatsApp Broadcast
            </Button>
          </Link>
          <Link href="/customer/ivr">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9 rounded-sm">
              <PhoneCall className="mr-1.5 h-3.5 w-3.5" /> New IVR Call
            </Button>
          </Link>
        </div>
      </div>
      
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Campaign Ledger</CardTitle>
              <CardDescription>
                Overview of all your active, scheduled, completed, and drafted campaigns.
              </CardDescription>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                className="w-full bg-background/50 pl-9 border-border/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="All" className="w-full" onValueChange={setFilter}>
            <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="bg-card border border-border/50 w-max sm:w-auto inline-flex mb-4">
                <TabsTrigger value="All" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary px-6">All Campaigns</TabsTrigger>
                <TabsTrigger value="Active" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary px-6">Active Live</TabsTrigger>
                <TabsTrigger value="Scheduled" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary px-6">Scheduled</TabsTrigger>
                <TabsTrigger value="Completed" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary px-6">Completed</TabsTrigger>
                <TabsTrigger value="Draft" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary px-6">Drafts</TabsTrigger>
              </TabsList>
            </div>

            <div className="rounded-md border border-border/50 bg-background/30 overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-card/30">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Target Audience</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No campaigns found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((camp) => (
                      <TableRow key={camp.id} className="border-border/50">
                        <TableCell>
                          <div className="font-medium text-sm text-foreground">{camp.name}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            {getTypeIcon(camp.type)} {camp.type} • {camp.id} • {camp.date}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(camp.status)}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">{camp.audienceSize.toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-secondary h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${camp.status === 'Completed' ? 'bg-emerald-500' : 'bg-primary'}`} 
                                style={{ width: `${camp.progress}%` }} 
                              />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium w-8">{camp.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {camp.cost.toLocaleString()} Cr.
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(camp.status === "Active" || camp.status === "Paused") && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" 
                                title={camp.status === "Active" ? "Pause Campaign" : "Resume Campaign"}
                                onClick={() => { setSelectedCamp(camp); setIsPauseConfirmOpen(true); }}
                              >
                                {camp.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                            )}
                            {(camp.status === "Completed" || camp.status === "Active" || camp.status === "Paused") && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10" 
                                title="View Report"
                                onClick={() => { setSelectedCamp(camp); setIsReportOpen(true); }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            {(camp.status === "Draft" || camp.status === "Scheduled") && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                title="Delete"
                                onClick={() => { setSelectedCamp(camp); setIsDeleteConfirmOpen(true); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Advanced Campaign Report Modal */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-[750px] bg-card/95 backdrop-blur-xl border-border/50 overflow-hidden">
          {selectedCamp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  {getTypeIcon(selectedCamp.type)} {selectedCamp.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Detailed analytics report and failure logs for campaign {selectedCamp.id}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="overview" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1 rounded-md">
                  <TabsTrigger value="overview" className="text-xs font-semibold rounded-sm">Overview</TabsTrigger>
                  <TabsTrigger value="failures" className="text-xs font-semibold rounded-sm">Failure Analysis</TabsTrigger>
                  <TabsTrigger value="logs" className="text-xs font-semibold rounded-sm">Voter Delivery Logs</TabsTrigger>
                </TabsList>
                
                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="space-y-4 pt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Stats Summary */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          <div>{getStatusBadge(selectedCamp.status)}</div>
                        </div>
                        <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                          <p className="text-xs text-muted-foreground mb-1">Total Sent</p>
                          <p className="font-semibold text-lg">{Math.floor(selectedCamp.audienceSize * (selectedCamp.progress/100)).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="bg-background/50 p-3 rounded-lg border border-border/50 space-y-3">
                        <p className="font-semibold text-sm">Delivery Breakdown</p>
                        {getReportData(selectedCamp).map((data, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
                              <span className="text-muted-foreground">{data.name}</span>
                            </div>
                            <span className="font-medium">{data.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-sm p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <span className="font-semibold text-primary">Total Credits Used</span>
                        <span className="font-bold text-primary">{Math.floor(selectedCamp.cost * (selectedCamp.progress/100)).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Donut Chart */}
                    <div className="h-[250px] flex items-center justify-center bg-background/30 rounded-lg border border-border/50 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getReportData(selectedCamp)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {getReportData(selectedCamp).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Failure Analysis */}
                <TabsContent value="failures" className="space-y-4 pt-4">
                  <div className="space-y-3 bg-background/50 p-4 rounded-lg border border-border/50">
                    <h3 className="font-semibold text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Failure Reasons Analysis
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Overview of reasons why messages or calls were undelivered or failed.
                    </p>
                    
                    <div className="space-y-4 mt-3">
                      {getFailureReasons(
                        selectedCamp.type, 
                        getReportData(selectedCamp).find(d => d.name === "Failed")?.value || Math.floor(selectedCamp.audienceSize * 0.05)
                      ).map((fail, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{fail.reason}</span>
                            <span className="text-muted-foreground">{fail.count.toLocaleString()} ({fail.percentage}%)</span>
                          </div>
                          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full" style={{ width: `${fail.percentage}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{fail.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Voter Delivery Logs */}
                <TabsContent value="logs" className="space-y-3 pt-4">
                  <div className="border border-border/50 rounded-lg overflow-hidden bg-background/30 max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-muted/55">
                        <TableRow className="border-border/50">
                          <TableHead className="py-2 text-xs">Voter Name</TableHead>
                          <TableHead className="py-2 text-xs">Mobile</TableHead>
                          <TableHead className="py-2 text-xs">Status</TableHead>
                          <TableHead className="py-2 text-xs">Delivery Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getSampleVoterLogs(selectedCamp.type).map((log, i) => (
                          <TableRow key={i} className="border-border/50">
                            <TableCell className="font-medium text-xs py-2">{log.name}</TableCell>
                            <TableCell className="font-mono text-xs py-2">{log.mobile}</TableCell>
                            <TableCell className="py-2">
                              {log.status === "Delivered" || log.status === "Answered" ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0 px-1.5">
                                  Success
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] py-0 px-1.5">
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground py-2">{log.details}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center italic mt-1">
                    Showing sample delivery records. Export the CSV report below to view the full list.
                  </p>
                </TabsContent>
              </Tabs>

              <DialogFooter className="border-t border-border/50 pt-4 mt-2">
                <Button variant="ghost" onClick={() => setIsReportOpen(false)} className="h-9 text-xs">Close</Button>
                <Button className="bg-primary text-xs h-9 font-semibold">
                  <Download className="mr-2 h-4 w-4" /> Export CSV Report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pause Confirmation Modal */}
      <Dialog open={isPauseConfirmOpen} onOpenChange={setIsPauseConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>{selectedCamp?.status === "Active" ? "Pause Campaign?" : "Resume Campaign?"}</DialogTitle>
            <DialogDescription>
              {selectedCamp?.status === "Active" 
                ? "Are you sure you want to pause this active campaign? No further messages/calls will be dispatched until you resume."
                : "Resume this campaign? It will immediately start dispatching the remaining load."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPauseConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handlePause} variant={selectedCamp?.status === "Active" ? "outline" : "default"} className={selectedCamp?.status === "Active" ? "border-amber-500 text-amber-500 hover:bg-amber-500/10" : "bg-primary"}>
              {selectedCamp?.status === "Active" ? "Confirm Pause" : "Confirm Resume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete "{selectedCamp?.name}"? This action cannot be undone. Reserved credits will be refunded to your balance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
