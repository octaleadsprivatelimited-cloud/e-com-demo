"use client";

import React, { useState, useEffect } from "react";
import { Users, Search, Loader2, MessageSquareWarning, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supportApi, ticketsApi, type SupportCustomer } from "@/lib/api";

export default function SupportCustomers() {
  const [customers, setCustomers] = useState<SupportCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SupportCustomer | null>(null);

  // raise-complaint form
  const [subject, setSubject] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = () => supportApi.customers().then(setCustomers).catch(() => {}).finally(() => setLoading(false));
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  const filtered = customers.filter((c) => {
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.mobile.includes(search) || (c.district || "").toLowerCase().includes(s);
  });

  const raise = async () => {
    if (!selected || !subject || !desc) return;
    setBusy(true);
    try {
      await ticketsApi.createForCustomer({ customerId: selected.id, subject, description: desc, priority });
      setSelected(null); setSubject(""); setDesc(""); setPriority("Medium");
      alert("Complaint logged.");
    } catch (e: any) { alert(e?.message || "Could not log complaint."); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Customers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Read-only account overview. Numbers are masked and data export is disabled.</p>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/25 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        Support access is view-only. You cannot change balances, suspend accounts, see gateway credentials, or download data.
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, masked number or district…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">{c.mobile}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{c.area ? `${c.area}, ` : ""}{c.district || "—"}</div>
                </div>
                <Badge variant="outline" className={c.status === "Suspended" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}>
                  {c.status}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                {(["sms", "wa", "ivr"] as const).map((k) => (
                  <div key={k} className="bg-muted/40 rounded-lg py-1.5">
                    <div className="text-sm font-semibold">{(c.balances?.[k] || 0).toLocaleString()}</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{k}</div>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full mt-3 text-xs" onClick={() => setSelected(c)}>
                <MessageSquareWarning className="h-3.5 w-3.5 mr-1.5" /> Raise a complaint
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Complaint for {selected?.name}</DialogTitle>
            <DialogDescription>{selected?.mobile}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="Describe the issue…" value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[90px] resize-none" />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            <Button disabled={busy || !subject || !desc} onClick={raise}>{busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Log complaint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
