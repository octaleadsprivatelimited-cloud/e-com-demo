"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LifeBuoy, Plus, Loader2, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ticketsApi, type Ticket } from "@/lib/api";

const statusStyles: Record<string, string> = {
  Open: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "In-Progress": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export default function CustomerSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Medium");

  const load = useCallback(async () => {
    try {
      const list = await ticketsApi.mine();
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
    const i = setInterval(load, 10000); // real-time support replies
    return () => clearInterval(i);
  }, [load]);

  const create = async () => {
    if (!subject || !desc) return;
    setBusy(true);
    try {
      await ticketsApi.raise({ subject, description: desc, priority });
      setNewOpen(false); setSubject(""); setDesc(""); setPriority("Medium");
      await load();
    } catch (e: any) { alert(e?.message || "Could not submit. Please sign in and try again."); }
    finally { setBusy(false); }
  };
  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try { const u = await ticketsApi.reply(selected.id, reply.trim()); setSelected(u); setReply(""); await load(); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2 text-[#1e293b] dark:text-white">
            <LifeBuoy className="h-6 w-6 text-primary" /> Help & Support
          </h1>
          <p className="text-sm text-[#64748b] mt-1">Raise a complaint and track responses from our support team.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Raise a Complaint</Button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground">
          <LifeBuoy className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm font-medium">No complaints yet</p>
          <p className="text-xs mt-1">Raise a complaint and our team will get back to you.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setSelected(t)} className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{t.subject}</span>
                <Badge variant="outline" className={`text-[10px] ${statusStyles[t.status]}`}>{t.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                <span>{t.id}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(t.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {t.notes.length > 0 && <span className="text-primary">{t.notes.length} response{t.notes.length === 1 ? "" : "s"}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base">{selected.subject}</DialogTitle>
                  <Badge variant="outline" className={`text-[10px] ${statusStyles[selected.status]}`}>{selected.status}</Badge>
                </div>
                <DialogDescription className="text-xs">{selected.id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="bg-muted/40 border border-border rounded-lg p-3 text-sm">{selected.description}</div>
                {selected.notes.map((n, i) => (
                  <div key={i} className={`rounded-lg p-2.5 text-sm border ${n.role === "customer" ? "bg-background border-border ml-6" : "bg-primary/5 border-primary/20 mr-6"}`}>
                    <div className="text-[10px] text-muted-foreground mb-0.5 font-semibold">{n.role === "customer" ? "You" : `${n.author} · Support`}</div>
                    {n.text}
                  </div>
                ))}
                {selected.status !== "Resolved" && (
                  <div className="flex gap-2 items-end pt-1">
                    <Textarea placeholder="Add more details…" value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-[56px] resize-none text-sm" />
                    <Button disabled={busy || !reply.trim()} onClick={sendReply} className="h-10 shrink-0">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Raise a Complaint</DialogTitle>
            <DialogDescription>Tell us what went wrong and we&apos;ll look into it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="Describe the issue…" value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[100px] resize-none" />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button disabled={busy || !subject || !desc} onClick={create}>{busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
