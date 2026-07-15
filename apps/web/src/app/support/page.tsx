"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquareWarning, Plus, Search, Loader2, Send, User, Clock, ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ticketsApi, supportApi, type Ticket, type SupportCustomer } from "@/lib/api";

const statusStyles: Record<string, string> = {
  Open: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "In-Progress": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};
const priorityStyles: Record<string, string> = {
  High: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  Medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Low: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

export default function SupportComplaints() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  // New complaint form
  const [newOpen, setNewOpen] = useState(false);
  const [customers, setCustomers] = useState<SupportCustomer[]>([]);
  const [ncCustomer, setNcCustomer] = useState("");
  const [ncSubject, setNcSubject] = useState("");
  const [ncDesc, setNcDesc] = useState("");
  const [ncPriority, setNcPriority] = useState("Medium");

  const load = useCallback(async () => {
    try {
      const list = await ticketsApi.all();
      setTickets(list);
      setSelected((s) => (s ? list.find((t) => t.id === s.id) || s : s));
    } catch {
      /* not authed */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    supportApi.customers().then(setCustomers).catch(() => {});
    const i = setInterval(load, 10000); // real-time
    return () => clearInterval(i);
  }, [load]);

  const filtered = tickets.filter((t) => {
    const s = search.toLowerCase();
    return (
      (filter === "All" || t.status === filter) &&
      (t.subject.toLowerCase().includes(s) || t.customerName.toLowerCase().includes(s) || t.id.toLowerCase().includes(s))
    );
  });

  const setStatus = async (status: string) => {
    if (!selected) return;
    setBusy(true);
    try { const u = await ticketsApi.update(selected.id, { status }); setSelected(u); await load(); }
    finally { setBusy(false); }
  };
  const assignToMe = async () => {
    if (!selected) return;
    let me = "Support";
    try { me = JSON.parse(sessionStorage.getItem("poltica_support_session") || "{}").name || "Support"; } catch {}
    setBusy(true);
    try { const u = await ticketsApi.update(selected.id, { assignedTo: me }); setSelected(u); await load(); }
    finally { setBusy(false); }
  };
  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try { const u = await ticketsApi.addNote(selected.id, reply.trim()); setSelected(u); setReply(""); await load(); }
    finally { setBusy(false); }
  };
  const createComplaint = async () => {
    if (!ncCustomer || !ncSubject || !ncDesc) return;
    setBusy(true);
    try {
      await ticketsApi.createForCustomer({ customerId: ncCustomer, subject: ncSubject, description: ncDesc, priority: ncPriority });
      setNewOpen(false); setNcCustomer(""); setNcSubject(""); setNcDesc(""); setNcPriority("Medium");
      await load();
    } catch (e: any) { alert(e?.message || "Could not create complaint."); }
    finally { setBusy(false); }
  };

  const openCount = tickets.filter((t) => t.status !== "Resolved").length;

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-[1100px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MessageSquareWarning className="h-6 w-6 text-primary" /> Complaints
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {openCount} open · {tickets.length} total. Raise and resolve customer complaints.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Complaint</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by subject, customer or ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {["All", "Open", "In-Progress", "Resolved"].map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="text-xs">
              {f}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground">
          <MessageSquareWarning className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">No complaints found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{t.subject}</span>
                    <Badge variant="outline" className={`text-[10px] ${statusStyles[t.status]}`}>{t.status}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${priorityStyles[t.priority]}`}>{t.priority}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {t.customerName}</span>
                    <span>{t.id}</span>
                    {t.assignedTo && <span className="text-primary">→ {t.assignedTo}</span>}
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(t.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
                {t.notes.length > 0 && <span className="text-[10px] text-muted-foreground shrink-0">{t.notes.length} repl{t.notes.length === 1 ? "y" : "ies"}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base">{selected.subject}</DialogTitle>
                  <Badge variant="outline" className={`text-[10px] ${statusStyles[selected.status]}`}>{selected.status}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${priorityStyles[selected.priority]}`}>{selected.priority}</Badge>
                </div>
                <DialogDescription className="text-xs">
                  {selected.id} · {selected.customerName} · opened by {selected.createdBy} ({selected.createdByRole})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-muted/40 border border-border rounded-lg p-3 text-sm">{selected.description}</div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {["Open", "In-Progress", "Resolved"].map((s) => (
                    <Button key={s} size="sm" variant={selected.status === s ? "default" : "outline"} disabled={busy} onClick={() => setStatus(s)} className="text-xs">
                      {s}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" disabled={busy} onClick={assignToMe} className="text-xs ml-auto">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Assign to me
                  </Button>
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversation</div>
                  {selected.notes.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No replies yet.</p>
                  ) : (
                    selected.notes.map((n, i) => (
                      <div key={i} className={`rounded-lg p-2.5 text-sm border ${n.role === "customer" ? "bg-background border-border" : "bg-primary/5 border-primary/20"}`}>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                          <span className="font-semibold">{n.author} · {n.role}</span>
                          <span>{new Date(n.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        {n.text}
                      </div>
                    ))
                  )}
                </div>

                {/* Reply */}
                <div className="flex gap-2 items-end">
                  <Textarea placeholder="Write a reply to the customer…" value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-[60px] resize-none text-sm" />
                  <Button disabled={busy || !reply.trim()} onClick={sendReply} className="h-10 shrink-0">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New complaint dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>New Complaint</DialogTitle>
            <DialogDescription>Log a complaint on behalf of a customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Customer</label>
              <select value={ncCustomer} onChange={(e) => setNcCustomer(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Subject</label>
              <Input value={ncSubject} onChange={(e) => setNcSubject(e.target.value)} placeholder="e.g. SMS not delivering" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea value={ncDesc} onChange={(e) => setNcDesc(e.target.value)} placeholder="Describe the issue…" className="mt-1 min-h-[90px] resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Priority</label>
              <select value={ncPriority} onChange={(e) => setNcPriority(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button disabled={busy || !ncCustomer || !ncSubject || !ncDesc} onClick={createComplaint}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
