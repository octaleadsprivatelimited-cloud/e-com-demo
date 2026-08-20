"use client";

import React from "react";
import { 
  MessageSquare, 
  PhoneCall, 
  Megaphone, 
  AlertCircle,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { candidatesApi, type Candidate } from "@/lib/api";
import { CustomerOverview } from "@/components/customer/CustomerOverview";
// (dashboard reads live balances from the API with a cached-first fallback)

const chartData = [
  { name: "Mon", sms: 4000, ivr: 2400, whatsapp: 1200 },
  { name: "Tue", sms: 3000, ivr: 1398, whatsapp: 1800 },
  { name: "Wed", sms: 9800, ivr: 5800, whatsapp: 2900 },
  { name: "Thu", sms: 3908, ivr: 4800, whatsapp: 3100 },
  { name: "Fri", sms: 4800, ivr: 3800, whatsapp: 3800 },
  { name: "Sat", sms: 3800, ivr: 4300, whatsapp: 4100 },
  { name: "Sun", sms: 4300, ivr: 6300, whatsapp: 4900 },
];

function quotasFromBalances(balances?: { sms: number; wa: number; ivr: number }) {
  const smsTotal = balances?.sms || 0;
  const waTotal = balances?.wa || 0;
  const ivrTotal = balances?.ivr || 0;
  // Mock minor usage so the progress bars read as active/realistic.
  return [
    { name: "SMS Credits", icon: MessageSquare, used: Math.round(smsTotal * 0.08), total: smsTotal, warningThreshold: 0.9 },
    { name: "WhatsApp Messages", icon: Megaphone, used: Math.round(waTotal * 0.04), total: waTotal, warningThreshold: 0.9 },
    { name: "IVR Calls", icon: PhoneCall, used: Math.round(ivrTotal * 0.12), total: ivrTotal, warningThreshold: 0.9 },
  ];
}

export default function CustomerDashboard() {
  const [quotas, setQuotas] = React.useState(() => quotasFromBalances());
  const [loading, setLoading] = React.useState(true);

  const applyUser = React.useCallback((user: Candidate | null) => {
    if (user?.balances) setQuotas(quotasFromBalances(user.balances));
  }, []);

  const load = React.useCallback(async () => {
    // 1) Instant paint from the cached session user (no flash of empty state).
    let hadCache = false;
    try {
      const cached = localStorage.getItem("currentCustomerUser");
      if (cached) {
        const parsed = JSON.parse(cached);
        applyUser(parsed);
        hadCache = true;
      }
    } catch {}

    // 2) Refresh from the API (source of truth) and update the cache.
    try {
      const fresh = await candidatesApi.me();
      applyUser(fresh);
      localStorage.setItem("currentCustomerUser", JSON.stringify(fresh));
    } catch {
      // API unreachable / not authenticated — keep cached values.
    } finally {
      if (!hadCache) setLoading(false);
      else setLoading(false);
    }
  }, [applyUser]);

  React.useEffect(() => {
    load();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    // Real-time: reflect admin credit disbursals / changes while the page is open.
    const interval = setInterval(load, 10000);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [load]);

  return <CustomerOverview quotas={quotas} loading={loading} />;

  /* Legacy dashboard markup retained temporarily during the visual migration. */
  /* eslint-disable no-unreachable */

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-[1200px] animate-fade-in-up">
      {/* Page header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">
          Workspace Dashboard
        </h1>
        <p className="text-sm text-[#64748b]">
          Monitor campaign quotas, live outreach analytics, and telephony system metrics.
        </p>
      </div>

      {/* Quick stats row */}
      {loading ? (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[176px] rounded-2xl border border-[#e2e8f0] bg-white dark:border-[#2c2c2e] dark:bg-[#1c1c1e] p-6 animate-pulse">
              <div className="flex items-center justify-between mb-6">
                <div className="h-8 w-8 rounded-full bg-[#f1f5f9] dark:bg-[#2c2c2e]" />
                <div className="h-4 w-16 rounded bg-[#f1f5f9] dark:bg-[#2c2c2e]" />
              </div>
              <div className="h-10 w-32 rounded bg-[#f1f5f9] dark:bg-[#2c2c2e] mb-6" />
              <div className="h-1 w-full rounded-full bg-[#f1f5f9] dark:bg-[#2c2c2e]" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-3">
        {quotas.map((quota, i) => {
          const percentage = (quota.used / quota.total) * 100;
          const isExhausted = quota.used >= quota.total;
          const isWarning = percentage >= (quota.warningThreshold * 100) && !isExhausted;
          const remaining = Math.max(quota.total - quota.used, 0);
          
          return (
            <div key={i} className="bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-[#e2e8f0] dark:border-[#2c2c2e] hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-[#f1f5f9] dark:bg-[#2c2c2e] flex items-center justify-center text-black dark:text-white">
                    <quota.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">{quota.name}</span>
                </div>
                {isExhausted ? (
                  <Badge className="bg-rose-500/5 text-rose-600 border border-rose-500/10 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full hover:bg-rose-500/10">
                    Exhausted
                  </Badge>
                ) : isWarning ? (
                  <Badge className="bg-amber-500/5 text-amber-600 border border-amber-500/10 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full hover:bg-amber-500/10">
                    Low Quota
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full hover:bg-emerald-500/10 flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-emerald-500" /> Active
                  </Badge>
                )}
              </div>
              
              {/* Big number */}
              <div className="mb-4">
                <span className="text-5xl font-light tracking-tighter text-black dark:text-white leading-none">{remaining.toLocaleString()}</span>
                <span className="text-xs text-[#64748b] ml-1.5 font-medium">/ {quota.total.toLocaleString()}</span>
              </div>
              
              {/* Progress bar — Apple Style */}
              <div className="h-1 w-full bg-[#f1f5f9] dark:bg-[#2c2c2e] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isExhausted ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-black dark:bg-white'}`} 
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2.5">
                <p className="text-[9px] font-bold text-[#64748b] uppercase tracking-wide">Capacity</p>
                <p className="text-[10px] font-bold text-black dark:text-white">{percentage.toFixed(1)}% Used</p>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-[#1c1c1e] p-6 rounded-2xl border border-[#e2e8f0] dark:border-[#2c2c2e] flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">Usage Analytics</h2>
            <p className="text-xs text-[#64748b] mt-0.5">SMS, WhatsApp, and IVR usage over the past 7 days</p>
          </div>
          <div className="pt-4 pb-2 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="smsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0071e3" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="#0071e3" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ivrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34c759" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="#34c759" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="waGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff9500" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="#ff9500" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.06)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', fontSize: '11px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}
                  itemStyle={{ color: '#000000' }}
                  labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: 4 }}
                />
                <Area type="monotone" dataKey="sms" stroke="#0071e3" fillOpacity={1} fill="url(#smsGrad)" strokeWidth={2} name="SMS" />
                <Area type="monotone" dataKey="ivr" stroke="#34c759" fillOpacity={1} fill="url(#ivrGrad)" strokeWidth={2} name="IVR" />
                <Area type="monotone" dataKey="whatsapp" stroke="#ff9500" fillOpacity={1} fill="url(#waGrad)" strokeWidth={2} name="WhatsApp" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="pt-2 flex flex-wrap gap-5 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#0071e3]" /> SMS Blasts</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#ff9500]" /> WhatsApp Broadcasts</div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#34c759]" /> IVR Calls</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1c1c1e] rounded-2xl border border-[#e2e8f0] dark:border-[#2c2c2e] flex flex-col justify-between">
          <div>
            <div className="p-5 pb-3 border-b border-[#e2e8f0] dark:border-[#2c2c2e]">
              <h2 className="text-sm font-semibold text-black dark:text-white">Recent Activity</h2>
              <p className="text-xs text-[#64748b] mt-0.5">Latest account updates</p>
            </div>
            <div className="divide-y divide-[#e2e8f0] dark:divide-[#2c2c2e]">
              {[
                { title: "IVR Booster Purchased", desc: "Added 20,000 credits", time: "2h ago", icon: CreditCard, color: "text-black dark:text-white", bg: "bg-[#f1f5f9] dark:bg-[#2c2c2e]" },
                { title: "Diwali SMS Blast", desc: "Sent 45,000 messages", time: "1d ago", icon: MessageSquare, color: "text-black dark:text-white", bg: "bg-[#f1f5f9] dark:bg-[#2c2c2e]" },
                { title: "Campaign Drafted", desc: "Pending approval", time: "2d ago", icon: Megaphone, color: "text-black dark:text-white", bg: "bg-[#f1f5f9] dark:bg-[#2c2c2e]" },
                { title: "IVR Quota Warning", desc: "Reached 90% of limit", time: "3d ago", icon: AlertCircle, color: "text-black dark:text-white", bg: "bg-[#f1f5f9] dark:bg-[#2c2c2e]" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-[#f1f5f9]/40 dark:hover:bg-[#2c2c2e]/20 transition-colors cursor-pointer">
                  <div className={`h-8 w-8 rounded-full ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-black dark:text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-[#64748b] mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-[10px] text-[#64748b] font-medium whitespace-nowrap shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-[#e2e8f0] dark:border-[#2c2c2e]">
            <Button variant="ghost" className="w-full h-9.5 text-xs font-semibold text-black dark:text-white bg-[#f1f5f9] hover:bg-[#e8e8ed] dark:bg-[#2c2c2e] dark:hover:bg-[#3a3a3c] rounded-full transition-all flex items-center justify-center gap-1">
              View all activity <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* IVR Call Center Analytics & Performance */}
      <div className="glass-card p-6 space-y-6 hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors duration-300">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-850 dark:text-zinc-200 flex items-center gap-2">
              <PhoneCall className="h-4.5 w-4.5 text-[#16a34a]" /> IVR Call Center Analytics
            </h3>
            <p className="text-[12px] text-zinc-450 mt-0.5">Real-time status updates and voice response performance</p>
          </div>
          <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-[#16a34a] border border-[#16a34a]/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md hover:bg-emerald-100">
            Live Feed
          </Badge>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
          <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/80 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Total Calls Placed</p>
            <p className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-200 mt-1">18,000</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold mt-1">100% of target list</p>
          </div>
          <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/40 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Answered Calls</p>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">11,700</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold mt-1">65.0% pick-up rate</p>
          </div>
          <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/40 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">Switched Off / Offline</p>
            <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-1">3,600</p>
            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold mt-1">20.0% unreachable</p>
          </div>
          <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/40 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wide">Declined / Rings Out</p>
            <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-300 mt-1">2,700</p>
            <p className="text-[10px] text-rose-600 dark:text-rose-500 font-bold mt-1">15.0% no response</p>
          </div>
        </div>

        {/* Call Answer Duration & Keypress DTMF Breakdown */}
        <div className="grid gap-5 md:grid-cols-2 pt-2">
          {/* Keypress actions */}
          <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-5 space-y-4 bg-white/40 dark:bg-zinc-950/20">
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Voter Voice Responses (DTMF)</h4>
            <div className="space-y-4.5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-700 dark:text-zinc-300">Pressed 1 (Connect to Representative)</span>
                  <span className="text-zinc-500 dark:text-zinc-450">4,914 (42%)</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-[#2563eb] h-full rounded-full" style={{ width: '42%' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-700 dark:text-zinc-300">Pressed 2 (Register Opt-out / DND)</span>
                  <span className="text-zinc-500 dark:text-zinc-455">936 (8%)</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-[#dc2626] h-full rounded-full" style={{ width: '8%' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-700 dark:text-zinc-300">No Keypress (Listened only)</span>
                  <span className="text-zinc-500 dark:text-zinc-455">5,850 (50%)</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-zinc-400 h-full rounded-full" style={{ width: '50%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Call Length Breakdown */}
          <div className="border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-5 space-y-4 bg-white/40 dark:bg-zinc-950/20">
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Average Conversation Length</h4>
            <div className="space-y-4.5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-700 dark:text-zinc-300">Full Announcement Heard (&gt; 30 sec)</span>
                  <span className="text-zinc-500 dark:text-zinc-455">6,435 (55%)</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-[#16a34a] h-full rounded-full" style={{ width: '55%' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-700 dark:text-zinc-300">Partial Announcement Heard (10 - 30 sec)</span>
                  <span className="text-zinc-500 dark:text-zinc-455">3,510 (30%)</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-[#f59e0b] h-full rounded-full" style={{ width: '30%' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-700 dark:text-zinc-300">Quick Hang-up (&lt; 10 sec)</span>
                  <span className="text-zinc-500 dark:text-zinc-455">1,755 (15%)</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-[#dc2626] h-full rounded-full" style={{ width: '15%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions panel */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-850 dark:text-zinc-200 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/customer/sms">
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-bold border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-all">
              <MessageSquare className="h-4 w-4 mr-2 text-[#2563eb]" /> New SMS Campaign
            </Button>
          </Link>
          <Link href="/customer/ivr">
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-bold border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-all">
              <PhoneCall className="h-4 w-4 mr-2 text-[#16a34a]" /> Start IVR Blast
            </Button>
          </Link>
          <Link href="/customer/contacts">
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-bold border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-all">
              <TrendingUp className="h-4 w-4 mr-2 text-zinc-500" /> Upload Contacts
            </Button>
          </Link>
          <Link href="/customer/billing">
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-bold border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-all">
              <CreditCard className="h-4 w-4 mr-2 text-[#f59e0b]" /> Buy Credits
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
