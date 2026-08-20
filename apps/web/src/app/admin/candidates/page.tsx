"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Plus, 
  MoreVertical, 
  Wallet, 
  Trash2, 
  Activity, 
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  ExternalLink
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { candidatesApi } from "@/lib/api";

type Candidate = {
  id: string;
  name: string;
  district: string;
  area?: string;
  status: 'Active' | 'Suspended' | 'Pending';
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
};

const generateCandidateLinks = (name: string, district: string, area: string, id: string) => {
  const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  const cleanDistrict = district.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  const cleanArea = (area || "sadashiv-peth").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  const cleanId = id.toLowerCase().trim();
  
  return {
    uniqueUrl: `https://poltica.in/candidate/${cleanDistrict}/${cleanArea}/${cleanName}`,
    photoUrl: `https://poltica.in/assets/candidates/${cleanName}-${cleanId}.jpg`,
    manifestoUrl: `https://poltica.in/manifestos/${cleanName}-${cleanId}-manifesto.pdf`,
    brochureUrl: `https://poltica.in/brochures/${cleanName}-${cleanId}-brochure.pdf`,
  };
};

const initialCandidates: Candidate[] = [
  { 
    id: "CAN-001", 
    name: "Rahul Sharma", 
    district: "Pune", 
    area: "Sadashiv Peth", 
    status: "Active", 
    balances: { sms: 5000, ivr: 0, wa: 12000 }, 
    payments: 25000, 
    contacts: 45000, 
    mobile: "9876543210", 
    address: "Plot 42, Laxmi Road, Near Gram Panchayat Office, Pune",
    pincode: "411030",
    ...generateCandidateLinks("Rahul Sharma", "Pune", "Sadashiv Peth", "CAN-001")
  },
  { 
    id: "CAN-002", 
    name: "Priya Singh", 
    district: "Nashik", 
    area: "Nashik East", 
    status: "Active", 
    balances: { sms: 100000, ivr: 50000, wa: 0 }, 
    payments: 150000, 
    contacts: 85000, 
    mobile: "9876543211", 
    address: "Flat 12, Shivneri Arcade, Nashik East",
    pincode: "422003",
    ...generateCandidateLinks("Priya Singh", "Nashik", "Nashik East", "CAN-002")
  },
  { 
    id: "CAN-003", 
    name: "Amit Kumar", 
    district: "Nagpur", 
    area: "Nagpur South", 
    status: "Suspended", 
    balances: { sms: 0, ivr: 0, wa: 0 }, 
    payments: 0, 
    contacts: 0, 
    mobile: "9876543212", 
    address: "Plot 89, Ring Road, Nagpur South",
    pincode: "440024",
    ...generateCandidateLinks("Amit Kumar", "Nagpur", "Nagpur South", "CAN-003")
  },
];

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isAddCreditModalOpen, setIsAddCreditModalOpen] = useState(false);
  const [isNewCandidateModalOpen, setIsNewCandidateModalOpen] = useState(false);

  // Form states
  const [creditType, setCreditType] = useState("sms");
  const [creditAmount, setCreditAmount] = useState("");
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const [manifestoUrl, setManifestoUrl] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");

  // New Candidate States
  const [newCandName, setNewCandName] = useState("");
  const [newCandDistrict, setNewCandDistrict] = useState("");
  const [newCandArea, setNewCandArea] = useState("");
  const [newCandMobile, setNewCandMobile] = useState("");
  const [newCandAddress, setNewCandAddress] = useState("");
  const [newCandPincode, setNewCandPincode] = useState("");

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName || !newCandDistrict || !newCandMobile) {
      alert("Name, District, and Mobile Number are required!");
      return;
    }

    const newId = `CAN-0${candidates.length + 1}`;
    const generated = generateCandidateLinks(newCandName, newCandDistrict, newCandArea || "Sadashiv Peth", newId);
    const newCandidate: Candidate = {
      id: newId,
      name: newCandName,
      district: newCandDistrict,
      area: newCandArea || "Sadashiv Peth",
      status: "Active",
      balances: { sms: 1000, ivr: 0, wa: 500 }, // Default signup credit
      payments: 0,
      contacts: 0,
      mobile: newCandMobile,
      address: newCandAddress || `${newCandArea || newCandDistrict}, Maharashtra`,
      pincode: newCandPincode || "411001",
      uniqueUrl: generated.uniqueUrl,
      photoUrl: generated.photoUrl,
      manifestoUrl: generated.manifestoUrl,
      brochureUrl: generated.brochureUrl,
    };

    const updated = [...candidates, newCandidate];
    setCandidates(updated);
    localStorage.setItem("poltica_candidates", JSON.stringify(updated));
    // Persist the new tenant server-side.
    candidatesApi.create(newCandidate).catch(() => {});

    // Reset inputs
    setNewCandName("");
    setNewCandDistrict("");
    setNewCandArea("");
    setNewCandMobile("");
    setNewCandAddress("");
    setNewCandPincode("");
    setIsNewCandidateModalOpen(false);
    alert(`Candidate ${newCandName} registered successfully with real-time domain links!`);
  };

  const handleOpenMaterials = (cand: Candidate) => {
    setSelectedCandidate(cand);
    setManifestoUrl(cand.manifestoUrl || "");
    setBrochureUrl(cand.brochureUrl || "");
    setIsMaterialsModalOpen(true);
  };

  const handleSaveMaterials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    const updated = candidates.map(c => {
      if (c.id === selectedCandidate.id) {
        return {
          ...c,
          manifestoUrl,
          brochureUrl,
        };
      }
      return c;
    });
    setCandidates(updated);
    localStorage.setItem("poltica_candidates", JSON.stringify(updated));
    // Persist campaign materials server-side.
    candidatesApi.update(selectedCandidate.id, { manifestoUrl, brochureUrl }).catch(() => {});

    // Update active session user if matching
    const sessionUser = localStorage.getItem("currentCustomerUser");
    if (sessionUser) {
      try {
        const parsed = JSON.parse(sessionUser);
        if (parsed.id === selectedCandidate.id || parsed.mobile === selectedCandidate.mobile) {
          parsed.manifestoUrl = manifestoUrl;
          parsed.brochureUrl = brochureUrl;
          localStorage.setItem("currentCustomerUser", JSON.stringify(parsed));
        }
      } catch (err) {}
    }

    // Propagate changes in real-time
    window.dispatchEvent(new Event("storage"));
    setIsMaterialsModalOpen(false);
  };

  const decorate = (c: any) => {
    const generated = generateCandidateLinks(c.name, c.district, c.area || "Sadashiv Peth", c.id);
    return {
      ...c,
      address: c.address || `${c.area || c.district}, Maharashtra`,
      pincode: c.pincode || "411030",
      photoUrl: c.photoUrl || generated.photoUrl,
      uniqueUrl: c.uniqueUrl && c.uniqueUrl.startsWith("http") ? c.uniqueUrl : generated.uniqueUrl,
      manifestoUrl: c.manifestoUrl && c.manifestoUrl.startsWith("http") ? c.manifestoUrl : generated.manifestoUrl,
      brochureUrl: c.brochureUrl && c.brochureUrl.startsWith("http") ? c.brochureUrl : generated.brochureUrl,
    };
  };

  // Load the full candidate roster from the API (admin JWT); fall back to any
  // locally cached list if the API is unreachable.
  const loadCandidatesFromStorage = React.useCallback(async () => {
    try {
      const list = await candidatesApi.list();
      if (Array.isArray(list)) {
        setCandidates(list.map(decorate));
        localStorage.setItem("poltica_candidates", JSON.stringify(list));
        return;
      }
    } catch {
      // fall through to local cache
    }
    const cached = localStorage.getItem("poltica_candidates");
    if (cached) {
      setCandidates(JSON.parse(cached).map(decorate));
    } else {
      localStorage.setItem("poltica_candidates", JSON.stringify(initialCandidates));
      setCandidates(initialCandidates);
    }
  }, []);

  React.useEffect(() => {
    // Initial load
    loadCandidatesFromStorage();

    // Real-time sync: listen for storage events (from other tabs / payment callbacks)
    window.addEventListener("storage", loadCandidatesFromStorage);

    // Real-time sync: re-read when admin tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadCandidatesFromStorage();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    // Real-time: reflect customer sends / signups / payments while open.
    const interval = setInterval(loadCandidatesFromStorage, 10000);

    return () => {
      window.removeEventListener("storage", loadCandidatesFromStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [loadCandidatesFromStorage]);

  const handleRemove = (id: string) => {
    if (confirm("Are you sure you want to permanently remove this candidate?")) {
      const updated = candidates.filter(c => c.id !== id);
      setCandidates(updated);
      localStorage.setItem("poltica_candidates", JSON.stringify(updated));
      // Delete the tenant server-side.
      candidatesApi.remove(id).catch(() => {});

      // Clear session user if matching
      const sessionUser = localStorage.getItem("currentCustomerUser");
      if (sessionUser) {
        try {
          const parsed = JSON.parse(sessionUser);
          if (parsed.id === id) {
            localStorage.removeItem("currentCustomerUser");
          }
        } catch (e) {}
      }

      window.dispatchEvent(new Event("storage"));
    }
  };

  const handleToggleStatus = (id: string) => {
    const updated = candidates.map(c => {
      if (c.id === id) {
        const newStatus: Candidate['status'] = c.status === "Active" ? "Suspended" : "Active";
        
        // Update session user if matching
        const sessionUser = localStorage.getItem("currentCustomerUser");
        if (sessionUser) {
          try {
            const parsed = JSON.parse(sessionUser);
            if (parsed.id === id || parsed.mobile === (c as any).mobile) {
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
    // Persist the status change (suspend / activate) server-side.
    const changed = updated.find((c) => c.id === id);
    if (changed) candidatesApi.update(id, { status: changed.status }).catch(() => {});
    window.dispatchEvent(new Event("storage"));
  };

  const handleAddCredits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    let updatedUser: any = null;
    const updated = candidates.map(c => {
      if (c.id === selectedCandidate.id) {
        const newCandidate = {
          ...c,
          balances: {
            ...c.balances,
            [creditType]: (c.balances[creditType as keyof typeof c.balances] || 0) + parseInt(creditAmount || "0")
          },
          payments: (c.payments || 0) + (parseInt(creditAmount || "0") * 0.2) // Mock payment logic
        };
        updatedUser = newCandidate;
        return newCandidate;
      }
      return c;
    });

    setCandidates(updated);
    localStorage.setItem("poltica_candidates", JSON.stringify(updated));
    // Persist the credit disbursal server-side (new balances + spend total).
    if (updatedUser) {
      candidatesApi
        .update(updatedUser.id, { balances: updatedUser.balances, payments: updatedUser.payments })
        .catch(() => {});
    }

    // Update active session user if matching
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
    setIsAddCreditModalOpen(false);
    setCreditAmount("");
  };

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidate Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Control accounts, manage quotas, and track payments for all politicians.
          </p>
        </div>
        <Button onClick={() => setIsNewCandidateModalOpen(true)} className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Candidate
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> All Candidates</CardTitle>
          <CardDescription>
            Overview of client balances, uploaded contact sizes, and account status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-card/30">
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Unique Campaign URL & Materials</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remaining Balance</TableHead>
                  <TableHead>Voter Contacts</TableHead>
                  <TableHead>Payments Rcvd</TableHead>
                  <TableHead className="text-right">Admin Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((cand) => (
                  <TableRow key={cand.id} className="border-border/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border/80">
                          <AvatarImage src={cand.photoUrl} alt={cand.name} className="object-cover" />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {cand.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="font-semibold text-sm text-foreground">{cand.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {cand.id} • Mobile: {cand.mobile || "N/A"}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            Pincode: {cand.pincode || "N/A"}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5 max-w-[200px]" title={cand.address}>
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{cand.address || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase font-extrabold text-muted-foreground w-12 shrink-0">Portal:</span>
                          {cand.disabledAssets?.portal ? (
                            <span className="font-mono text-[10px] text-muted-foreground line-through decoration-destructive/50 truncate max-w-[220px]" title="Link deactivated by administrator">
                              {cand.uniqueUrl}
                            </span>
                          ) : (
                            <a 
                              href={cand.uniqueUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-mono text-[11px] text-primary hover:underline flex items-center gap-0.5 truncate max-w-[220px]"
                              title={cand.uniqueUrl}
                            >
                              <span className="truncate">{cand.uniqueUrl}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase font-extrabold text-muted-foreground w-12 shrink-0">Manifesto:</span>
                          {cand.disabledAssets?.manifesto ? (
                            <span className="font-mono text-[10px] text-muted-foreground line-through decoration-destructive/50 truncate max-w-[220px]" title="Link deactivated by administrator">
                              {cand.manifestoUrl}
                            </span>
                          ) : (
                            <a 
                              href={cand.manifestoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 truncate max-w-[220px]"
                              title={cand.manifestoUrl}
                            >
                              <span className="truncate">{cand.manifestoUrl}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase font-extrabold text-muted-foreground w-12 shrink-0">Brochure:</span>
                          {cand.disabledAssets?.brochure ? (
                            <span className="font-mono text-[10px] text-muted-foreground line-through decoration-destructive/50 truncate max-w-[220px]" title="Link deactivated by administrator">
                              {cand.brochureUrl}
                            </span>
                          ) : (
                            <a 
                              href={cand.brochureUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="font-mono text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 truncate max-w-[220px]"
                              title={cand.brochureUrl}
                            >
                              <span className="truncate">{cand.brochureUrl}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cand.status === "Active" ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Suspended</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between w-28">
                          <span className="text-muted-foreground">SMS:</span>
                          <span className={cand.balances.sms === 0 ? "text-destructive" : ""}>{cand.balances.sms.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between w-28">
                          <span className="text-muted-foreground">WhatsApp:</span>
                          <span className={cand.balances.wa === 0 ? "text-destructive" : ""}>{(cand.balances.wa || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between w-28">
                          <span className="text-muted-foreground">IVR:</span>
                          <span className={cand.balances.ivr === 0 ? "text-destructive" : ""}>{cand.balances.ivr.toLocaleString()}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                        {cand.contacts.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-emerald-500">
                        ₹{cand.payments.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 border-primary/30 hover:bg-primary/10"
                          onClick={() => { setSelectedCandidate(cand); setIsAddCreditModalOpen(true); }}
                        >
                          <Wallet className="h-3 w-3 mr-1" /> Add Credits
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          onClick={() => handleOpenMaterials(cand)}
                        >
                          <FileText className="h-3 w-3 mr-1" /> Materials
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`h-8 ${cand.status === "Active" ? "border-destructive/30 hover:bg-destructive/10 text-destructive" : "border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-500"}`}
                          onClick={() => handleToggleStatus(cand.id)}
                        >
                          {cand.status === "Active" ? "Suspend" : "Activate"}
                        </Button>
                        <Link href={`/admin/candidates/${cand.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:bg-primary/10" title="Manage Account (Google style)">
                            <Activity className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(cand.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Credits Modal */}
      <Dialog open={isAddCreditModalOpen} onOpenChange={setIsAddCreditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-border/50">
          <form onSubmit={handleAddCredits}>
            <DialogHeader>
              <DialogTitle>Add Manual Credits</DialogTitle>
              <DialogDescription>
                Assign backend credits to {selectedCandidate?.name}. This will also log a manual payment receipt.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Credit Type</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={creditType}
                  onChange={(e) => setCreditType(e.target.value)}
                >
                  <option value="sms">SMS Credits</option>
                  <option value="ivr">IVR Call Credits</option>
                  <option value="wa">WhatsApp Credits</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Amount to Add</Label>
                <Input 
                  type="number" 
                  required 
                  placeholder="e.g. 50000" 
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="bg-background/50" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddCreditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Confirm Top-Up</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Campaign Materials Modal */}
      <Dialog open={isMaterialsModalOpen} onOpenChange={setIsMaterialsModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card/95 backdrop-blur-xl border-border/50">
          <form onSubmit={handleSaveMaterials}>
            <DialogHeader>
              <DialogTitle>Manage Campaign Materials</DialogTitle>
              <DialogDescription>
                Control and upload PDF, brochures, and links for {selectedCandidate?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Unique Campaign URL (Derived)</Label>
                <Input 
                  readOnly 
                  value={selectedCandidate?.uniqueUrl || "Not Generated"} 
                  className="bg-muted text-muted-foreground font-mono text-xs select-all cursor-default" 
                />
                <p className="text-[11px] text-muted-foreground">Unique URL format: <code className="bg-[#e2e8f0] dark:bg-[#333] px-1 py-0.5 rounded">&lt;domain&gt;-&lt;village&gt;-&lt;candidate&gt;</code></p>
              </div>
              
              <div className="grid gap-2">
                <Label className="flex items-center justify-between">
                  <span>Manifesto PDF Link</span>
                  {selectedCandidate?.manifestoUrl && (
                    <span className="text-emerald-500 text-[10px] font-semibold">Active</span>
                  )}
                </Label>
                <Input 
                  placeholder="https://example.com/manifesto.pdf" 
                  value={manifestoUrl}
                  onChange={(e) => setManifestoUrl(e.target.value)}
                  className="bg-background/50 font-mono text-xs" 
                />
              </div>
              
              <div className="grid gap-2">
                <Label className="flex items-center justify-between">
                  <span>Campaign Brochure PDF Link</span>
                  {selectedCandidate?.brochureUrl && (
                    <span className="text-emerald-500 text-[10px] font-semibold">Active</span>
                  )}
                </Label>
                <Input 
                  placeholder="https://example.com/brochure.pdf" 
                  value={brochureUrl}
                  onChange={(e) => setBrochureUrl(e.target.value)}
                  className="bg-background/50 font-mono text-xs" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsMaterialsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Materials</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* New Candidate Modal */}
      <Dialog open={isNewCandidateModalOpen} onOpenChange={setIsNewCandidateModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-border/50">
          <form onSubmit={handleCreateCandidate}>
            <DialogHeader>
              <DialogTitle>Register New Candidate</DialogTitle>
              <DialogDescription>
                Create a new tenant account on the platform. Real-time domain links will be auto-generated.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid gap-1">
                <Label className="text-xs">Candidate Name</Label>
                <Input 
                  placeholder="Full Name" 
                  value={newCandName}
                  onChange={(e) => setNewCandName(e.target.value)}
                  required
                  className="bg-background/50 h-9 text-sm" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">District</Label>
                  <Input 
                    placeholder="e.g. Pune" 
                    value={newCandDistrict}
                    onChange={(e) => setNewCandDistrict(e.target.value)}
                    required
                    className="bg-background/50 h-9 text-sm" 
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Area / Constituency</Label>
                  <Input 
                    placeholder="e.g. Sadashiv Peth" 
                    value={newCandArea}
                    onChange={(e) => setNewCandArea(e.target.value)}
                    className="bg-background/50 h-9 text-sm" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Mobile Number</Label>
                  <Input 
                    placeholder="10-digit mobile" 
                    value={newCandMobile}
                    onChange={(e) => setNewCandMobile(e.target.value)}
                    required
                    maxLength={10}
                    className="bg-background/50 h-9 text-sm" 
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Pincode</Label>
                  <Input 
                    placeholder="6-digit pincode" 
                    value={newCandPincode}
                    onChange={(e) => setNewCandPincode(e.target.value)}
                    maxLength={6}
                    className="bg-background/50 h-9 text-sm" 
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Office Address</Label>
                <Input 
                  placeholder="Street details, building, landmarks" 
                  value={newCandAddress}
                  onChange={(e) => setNewCandAddress(e.target.value)}
                  className="bg-background/50 h-9 text-sm" 
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsNewCandidateModalOpen(false)}>Cancel</Button>
              <Button type="submit">Create Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
