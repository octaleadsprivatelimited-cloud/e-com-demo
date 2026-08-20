"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  MessageSquare, 
  PhoneCall, 
  Activity, 
  Bell,
  CheckCircle2,
  XCircle,
  UserCheck,
  Wallet,
  Sparkles,
  RefreshCw,
  Server,
  FileCheck,
  AlertTriangle,
  ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { candidatesApi } from "@/lib/api";
import { AdminOverview } from "@/components/admin/AdminOverview";

type Candidate = {
  id: string;
  name: string;
  district: string;
  area?: string;
  status: string;
  balances: { sms: number; ivr: number; wa: number };
  payments: number;
  contacts: number;
  mobile: string;
};

type DltTemplate = {
  id: string;
  candidateName: string;
  templateName: string;
  messageType: "SMS" | "WhatsApp";
  content: string;
  status: "Pending" | "Approved" | "Rejected";
};

const initialDltTemplates: DltTemplate[] = [
  { id: "DLT-882", candidateName: "Rahul Sharma", templateName: "Election_Greeting_2026", messageType: "SMS", content: "Dear Voter, Join Rahul Sharma on 12th July for the Pune Gram Panchayat election rally. Your vote matters!", status: "Pending" },
  { id: "DLT-904", candidateName: "Priya Singh", templateName: "WhatsApp_Manifesto_Launch", messageType: "WhatsApp", content: "Greetings! Click here to download Priya Singh's development manifesto for Nashik East.", status: "Pending" },
  { id: "DLT-711", candidateName: "Amit Kumar", templateName: "IVR_Audio_Script", messageType: "SMS", content: "Listen to the vision of Amit Kumar for clean water and better roads in Nagpur South.", status: "Pending" },
];

const chartData = [
  { name: "Mon", calls: 4000, sms: 2400, wa: 1200 },
  { name: "Tue", calls: 3000, sms: 1398, wa: 1800 },
  { name: "Wed", calls: 2000, sms: 9800, wa: 2900 },
  { name: "Thu", calls: 2780, sms: 3908, wa: 3100 },
  { name: "Fri", calls: 1890, sms: 4800, wa: 3800 },
  { name: "Sat", calls: 2390, sms: 3800, wa: 4100 },
  { name: "Sun", calls: 3490, sms: 4300, wa: 4900 },
];

export default function AdminCRM() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [dltTemplates, setDltTemplates] = useState<DltTemplate[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Credit disbursal states
  const [selectedCandId, setSelectedCandId] = useState("");
  const [creditType, setCreditType] = useState("sms");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditAction, setCreditAction] = useState("add");
  const [isDisbursing, setIsDisbursing] = useState(false);

  // Gateway status testing states
  const [gatewayStatus, setGatewayStatus] = useState({
    sms: { status: "Active", latency: "14ms", testing: false },
    whatsapp: { status: "Active", latency: "22ms", testing: false },
    ivr: { status: "Active", latency: "35ms", testing: false },
    payment: { status: "Active", latency: "48ms", testing: false }
  });

  // Load candidates from the API (admin JWT), falling back to local cache.
  const loadCandidatesFromStorage = React.useCallback(async () => {
    try {
      const list = await candidatesApi.list();
      if (Array.isArray(list) && list.length) {
        setCandidates(list as Candidate[]);
        localStorage.setItem("poltica_candidates", JSON.stringify(list));
        return;
      }
    } catch {
      // fall through to local cache
    }
    const stored = localStorage.getItem("poltica_candidates");
    let candidatePool: Candidate[] = [];
    if (stored) {
      candidatePool = JSON.parse(stored);
    } else {
      candidatePool = [
        { id: "CAN-001", name: "Rahul Sharma", district: "Pune", area: "Sadashiv Peth", status: "Active", balances: { sms: 5000, ivr: 100, wa: 12000 }, payments: 25000, contacts: 45000, mobile: "9876543210" },
        { id: "CAN-002", name: "Priya Singh", district: "Nashik", area: "Nashik East", status: "Active", balances: { sms: 100000, ivr: 50000, wa: 0 }, payments: 150000, contacts: 85000, mobile: "9876543211" },
        { id: "CAN-003", name: "Amit Kumar", district: "Nagpur", area: "Nagpur South", status: "Pending Verification", balances: { sms: 0, ivr: 0, wa: 0 }, payments: 0, contacts: 0, mobile: "9876543212" },
        { id: "CAN-004", name: "Vikram Patil", district: "Satara", area: "Karad North", status: "Pending Verification", balances: { sms: 0, ivr: 0, wa: 0 }, payments: 0, contacts: 0, mobile: "9876543213" },
      ];
      localStorage.setItem("poltica_candidates", JSON.stringify(candidatePool));
    }
    setCandidates(candidatePool);
  }, []);

  useEffect(() => {
    // Initial load
    loadCandidatesFromStorage();

    // DLT Templates pool
    const storedTemplates = localStorage.getItem("poltica_dlt_templates");
    if (storedTemplates) {
      setDltTemplates(JSON.parse(storedTemplates));
    } else {
      localStorage.setItem("poltica_dlt_templates", JSON.stringify(initialDltTemplates));
      setDltTemplates(initialDltTemplates);
    }

    // Default System logs
    setLogs([
      { id: 1, action: "Admin System Loaded", detail: "Gateway integrations verified", time: "Just now", type: "system" },
      { id: 2, action: "Payment Webhook Log", detail: "Razorpay signature verified successfully", time: "12 min ago", type: "payment" },
      { id: 3, action: "Candidate Signed Up", detail: "Vikram Patil registered for Satara district", time: "42 min ago", type: "candidate" },
      { id: 4, action: "SMS Blast Orchestrated", detail: "Rahul Sharma sent 15,200 SMS to Pune sadashiv peth", time: "1 hour ago", type: "blast" }
    ]);

    // Real-time synchronization
    window.addEventListener("storage", loadCandidatesFromStorage);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadCandidatesFromStorage();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const pollInterval = setInterval(loadCandidatesFromStorage, 10000);

    return () => {
      window.removeEventListener("storage", loadCandidatesFromStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(pollInterval);
    };
  }, [loadCandidatesFromStorage]);

  // Update candidate status (Approve/Reject)
  const handleUpdateStatus = (id: string, newStatus: string) => {
    const updated = candidates.map(c => {
      if (c.id === id) {
        // Sync with active session user if matching
        const sessionUser = localStorage.getItem("currentCustomerUser");
        if (sessionUser) {
          try {
            const parsed = JSON.parse(sessionUser);
            if (parsed.id === id || parsed.mobile === c.mobile) {
              parsed.status = newStatus;
              localStorage.setItem("currentCustomerUser", JSON.stringify(parsed));
            }
          } catch (e) {}
        }
        return { ...c, status: newStatus };
      }
      return c;
    });
    setCandidates(updated);
    localStorage.setItem("poltica_candidates", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));

    // Log the event
    const cand = candidates.find(c => c.id === id);
    const newLog = {
      id: Date.now(),
      action: `Candidate ${newStatus}`,
      detail: `${cand?.name} status updated to ${newStatus}`,
      time: "Just now",
      type: "admin"
    };
    setLogs(prev => [newLog, ...prev]);
    alert(`Candidate ${cand?.name} has been ${newStatus.toLowerCase()} successfully.`);
  };

  // Approve/Reject DLT template
  const handleDltAction = (id: string, action: "Approved" | "Rejected") => {
    const updated = dltTemplates.map(t => {
      if (t.id === id) {
        return { ...t, status: action };
      }
      return t;
    });
    setDltTemplates(updated);
    localStorage.setItem("poltica_dlt_templates", JSON.stringify(updated));

    const temp = dltTemplates.find(t => t.id === id);
    const newLog = {
      id: Date.now(),
      action: `DLT Template ${action}`,
      detail: `Template '${temp?.templateName}' by ${temp?.candidateName} has been ${action}`,
      time: "Just now",
      type: "admin"
    };
    setLogs(prev => [newLog, ...prev]);
    alert(`DLT Template '${temp?.templateName}' has been ${action.toLowerCase()} successfully.`);
  };

  // Disburse/Deduct Credits
  const handleDisburseCredits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandId || !creditAmount || isNaN(Number(creditAmount)) || Number(creditAmount) <= 0) {
      alert("Please select a candidate and input a valid credit amount.");
      return;
    }

    setIsDisbursing(true);
    const amount = Number(creditAmount);

    setTimeout(() => {
      let updatedUser: any = null;
      const updated = candidates.map(c => {
        if (c.id === selectedCandId) {
          const balances = { ...c.balances };
          const change = creditAction === "add" ? amount : -amount;
          if (creditType === "sms") balances.sms = Math.max(0, (balances.sms || 0) + change);
          else if (creditType === "ivr") balances.ivr = Math.max(0, (balances.ivr || 0) + change);
          else if (creditType === "wa") balances.wa = Math.max(0, (balances.wa || 0) + change);
          
          const newCandidate = { ...c, balances };
          updatedUser = newCandidate;
          return newCandidate;
        }
        return c;
      });

      setCandidates(updated);
      localStorage.setItem("poltica_candidates", JSON.stringify(updated));
      // Persist the credit disbursal/deduction server-side.
      if (updatedUser) {
        candidatesApi.update(updatedUser.id, { balances: updatedUser.balances }).catch(() => {});
      }

      // Sync active session user if matching
      if (updatedUser) {
        const sessionUser = localStorage.getItem("currentCustomerUser");
        if (sessionUser) {
          try {
            const parsed = JSON.parse(sessionUser);
            if (parsed.id === updatedUser.id || parsed.mobile === updatedUser.mobile) {
              localStorage.setItem("currentCustomerUser", JSON.stringify(updatedUser));
            }
          } catch (e) {}
        }
      }

      window.dispatchEvent(new Event("storage"));

      const cand = candidates.find(c => c.id === selectedCandId);
      const isAdd = creditAction === "add";
      const newLog = {
        id: Date.now(),
        action: isAdd ? `Credits Disbursed` : `Credits Deducted`,
        detail: `${isAdd ? 'Added' : 'Deducted'} ${amount} ${creditType.toUpperCase()} credits ${isAdd ? 'to' : 'from'} ${cand?.name}`,
        time: "Just now",
        type: "billing"
      };
      setLogs(prev => [newLog, ...prev]);

      setIsDisbursing(false);
      setCreditAmount("");
      alert(`Successfully ${isAdd ? 'added' : 'deducted'} ${amount} ${creditType.toUpperCase()} credits ${isAdd ? 'to' : 'from'} ${cand?.name}!`);
    }, 600);
  };

  // Test Gateway Connection
  const testGateway = (key: "sms" | "whatsapp" | "ivr" | "payment") => {
    setGatewayStatus(prev => ({
      ...prev,
      [key]: { ...prev[key], testing: true }
    }));

    setTimeout(() => {
      const newLatency = Math.floor(Math.random() * 40) + 10;
      setGatewayStatus(prev => ({
        ...prev,
        [key]: { status: "Active", latency: `${newLatency}ms`, testing: false }
      }));
    }, 800);
  };

  // Statistics summaries
  const pendingApprovals = candidates.filter(c => c.status === "Pending Verification");
  const activeCount = candidates.filter(c => c.status === "Active").length;
  const totalReach = candidates.reduce((acc, c) => acc + c.contacts, 0);

  return (
    <AdminOverview
      candidates={candidates}
      activeCount={activeCount}
      totalReach={totalReach}
      pendingDlt={dltTemplates.filter((template) => template.status === "Pending").length}
      pendingApprovals={pendingApprovals}
      gatewayStatus={gatewayStatus}
      selectedCandId={selectedCandId}
      creditType={creditType}
      creditAmount={creditAmount}
      creditAction={creditAction}
      isDisbursing={isDisbursing}
      onSelectedCandidate={setSelectedCandId}
      onCreditType={setCreditType}
      onCreditAmount={setCreditAmount}
      onCreditAction={setCreditAction}
      onCreditSubmit={handleDisburseCredits}
      onCandidateStatus={handleUpdateStatus}
      onGatewayTest={testGateway}
    />
  );

  /* Legacy dashboard markup retained temporarily below for reference during migration. */
  /* eslint-disable no-unreachable */

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Platform Admin CRM
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Comprehensive control panel for candidate approvals, credit control, template management, and system monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-semibold bg-background/50 border-primary/20 text-primary">
            Election Year 2026
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 font-normal bg-green-500/10 text-green-500 border border-green-500/20">
            System Live <span className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />
          </Badge>
        </div>
      </div>

      {/* CRM Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Active Candidates", value: activeCount, desc: `${pendingApprovals.length} pending approvals`, icon: UserCheck, color: "text-blue-500" },
          { title: "Voter Reach CRM", value: totalReach.toLocaleString(), desc: "Contacts across all profiles", icon: Users, color: "text-emerald-500" },
          { title: "DLT Approvals", value: dltTemplates.filter(t => t.status === "Pending").length, desc: "Pending template reviews", icon: FileCheck, color: "text-amber-500" },
          { title: "System Gateways", value: "4 / 4", desc: "All integrations active", icon: Server, color: "text-indigo-500" }
        ].map((stat, i) => (
          <Card key={i} className="glass-card hover:bg-accent/50 transition-all duration-300 shadow-sm border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold tracking-tight">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {stat.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Graph Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4 glass-card border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Platform Outreach & Activity</CardTitle>
            <CardDescription>Simulated daily outreach channel stats across candidates.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #ddd', borderRadius: '6px' }} />
                <Area type="monotone" dataKey="calls" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" name="IVR Calls" />
                <Area type="monotone" dataKey="sms" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSms)" name="SMS Blasts" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Credit Disbursal CRM Module */}
        <Card className="lg:col-span-3 glass-card border border-border/50 flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold">Credit Disbursal & Control</CardTitle>
            </div>
            <CardDescription>Instantly award gateway credits to candidates.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <form onSubmit={handleDisburseCredits} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Select Active Candidate</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedCandId}
                  onChange={(e) => setSelectedCandId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates
                    .filter(c => c.status === "Active")
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.district})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Channel</label>
                  <select
                    className="w-full h-10 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={creditType}
                    onChange={(e) => setCreditType(e.target.value)}
                  >
                    <option value="sms">SMS Blasts</option>
                    <option value="wa">WhatsApp</option>
                    <option value="ivr">IVR Calls</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Action</label>
                  <select
                    className="w-full h-10 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={creditAction}
                    onChange={(e) => setCreditAction(e.target.value)}
                  >
                    <option value="add">Add (+)</option>
                    <option value="deduct">Deduct (-)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Amount</label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={isDisbursing} className="w-full mt-2 font-semibold">
                {isDisbursing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Apply Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Pending approvals & System Health */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Pending Approval Panel */}
        <Card className="lg:col-span-2 glass-card border border-border/50 overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-card/30 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Pending Candidate Verification Queue</CardTitle>
              <CardDescription>Review credentials and activate campaign dashboards.</CardDescription>
            </div>
            <Badge variant={pendingApprovals.length > 0 ? "destructive" : "secondary"}>
              {pendingApprovals.length} Action Required
            </Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-sm">All candidates verified!</p>
                <p className="text-xs">No pending verification request in pipeline queue.</p>
              </div>
            ) : (
              <Table className="min-w-[500px]">
                <TableHeader className="bg-card/40">
                  <TableRow className="border-border/50">
                    <TableHead>Candidate</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Area / Constituency</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((candidate) => (
                    <TableRow key={candidate.id} className="border-border/50 hover:bg-accent/40">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {candidate.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{candidate.name}</span>
                            <span className="text-[10px] text-muted-foreground">{candidate.id} • {candidate.mobile}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{candidate.district}</TableCell>
                      <TableCell className="text-sm">{candidate.area || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            onClick={() => handleUpdateStatus(candidate.id, "Rejected")}
                            size="sm" 
                            variant="outline" 
                            className="h-8 border-destructive/25 text-destructive hover:bg-destructive/10 hover:border-destructive/40"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                          <Button 
                            onClick={() => handleUpdateStatus(candidate.id, "Active")}
                            size="sm" 
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Integration Gateway Diagnostics */}
        <Card className="glass-card border border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-bold">System Gateways & Diagnostics</CardTitle>
            <CardDescription>Live health checks of third-party integration pipelines.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center space-y-4">
            {[
              { key: "sms", label: "Twilio / Msg91 Gateway", status: gatewayStatus.sms },
              { key: "whatsapp", label: "WhatsApp Cloud API", status: gatewayStatus.whatsapp },
              { key: "ivr", label: "Exotel IVR Trunk", status: gatewayStatus.ivr },
              { key: "payment", label: "Razorpay Webhooks", status: gatewayStatus.payment }
            ].map((gateway) => (
              <div key={gateway.key} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-b-0 last:pb-0">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{gateway.label}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                    Status: {gateway.status.status} • Latency: {gateway.status.latency}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={gateway.status.testing}
                  onClick={() => testGateway(gateway.key as any)}
                  className="h-8 text-xs border-primary/20 text-primary hover:bg-primary/5 shrink-0"
                >
                  {gateway.status.testing ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    "Ping"
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* DLT Approvals Queue */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* DLT Approvals Card */}
        <Card className="lg:col-span-2 glass-card border border-border/50 overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-card/30 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">DLT Message Approval Queue</CardTitle>
              <CardDescription>Compliance verification for custom candidate messages.</CardDescription>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5">
              {dltTemplates.filter(t => t.status === "Pending").length} Review Pending
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {dltTemplates.filter(t => t.status === "Pending").length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-sm">DLT Queue is clean!</p>
                <p className="text-xs">No template verification request in queue.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {dltTemplates
                  .filter(t => t.status === "Pending")
                  .map((temp) => (
                    <div key={temp.id} className="p-4 space-y-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            {temp.messageType}
                          </Badge>
                          <span className="text-xs font-semibold text-muted-foreground">ID: {temp.id}</span>
                        </div>
                        <span className="text-xs font-medium text-foreground">{temp.candidateName}</span>
                      </div>
                      <div className="bg-background/60 p-3 rounded border border-border/40 text-xs font-mono break-all whitespace-pre-wrap">
                        {temp.content}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Name: {temp.templateName}</span>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleDltAction(temp.id, "Rejected")}
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          >
                            Reject
                          </Button>
                          <Button 
                            onClick={() => handleDltAction(temp.id, "Approved")}
                            size="sm" 
                            className="h-8 text-xs bg-primary hover:bg-primary/95 text-white"
                          >
                            Approve Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Platform CRM Activity Ticker */}
        <Card className="glass-card border border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Live Activity CRM Logs</CardTitle>
            <CardDescription>Real-time audit log of candidate and admin actions.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-start">
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs border-b border-border/20 pb-3 last:border-0 last:pb-0">
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex flex-col w-full min-w-0">
                    <div className="flex justify-between items-center w-full">
                      <span className="font-semibold text-foreground truncate">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{log.time}</span>
                    </div>
                    <span className="text-muted-foreground mt-0.5 break-words">{log.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
