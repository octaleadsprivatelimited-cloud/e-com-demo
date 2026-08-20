"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CreditCard, MessageCircle, MessageSquare, PhoneCall, Upload, Users } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Quota = { name: string; used: number; total: number };

type Props = { quotas: Quota[]; loading: boolean };

const usage = [
  { day: "Mon", messages: 7600 }, { day: "Tue", messages: 8200 },
  { day: "Wed", messages: 12100 }, { day: "Thu", messages: 10500 },
  { day: "Fri", messages: 13200 }, { day: "Sat", messages: 11800 },
  { day: "Sun", messages: 14600 },
];

const actions = [
  { label: "Send SMS", note: "Create a bulk text campaign", href: "/customer/sms", icon: MessageSquare },
  { label: "WhatsApp", note: "Start a verified broadcast", href: "/customer/whatsapp", icon: MessageCircle },
  { label: "Start IVR", note: "Launch a voice campaign", href: "/customer/ivr", icon: PhoneCall },
  { label: "Upload contacts", note: "Add voters to your CRM", href: "/customer/contacts", icon: Upload },
];

export function CustomerOverview({ quotas, loading }: Props) {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f8fafc] px-4 py-6 text-[#0a1933] sm:px-7 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1380px] space-y-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div><h1 className="text-[28px] font-bold tracking-[-0.035em] sm:text-[32px]">Campaign overview</h1><p className="mt-1 text-sm text-[#647187]">Your outreach, credits and voter engagement in one clear workspace.</p></div>
          <Link href="/customer/campaigns" className="inline-flex h-10 items-center justify-center rounded-md bg-[#1264dc] px-4 text-sm font-semibold text-white hover:bg-[#0d52bc]">Create campaign <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </section>

        <section className="grid overflow-hidden rounded-md border border-[#dfe5ed] bg-white sm:grid-cols-3">
          {loading ? [0,1,2].map((item) => <div key={item} className="h-[122px] animate-pulse border-b border-[#e5eaf1] bg-[#fbfcfe] p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0" />) : quotas.map((quota) => {
            const remaining = Math.max(quota.total - quota.used, 0);
            const percentage = quota.total ? Math.min((quota.used / quota.total) * 100, 100) : 0;
            return <div key={quota.name} className="border-b border-[#e5eaf1] p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><div className="flex items-center justify-between"><p className="text-sm font-medium text-[#4f5e75]">{quota.name}</p><span className="text-xs text-[#718096]">{percentage.toFixed(0)}% used</span></div><p className="mt-2 text-2xl font-bold tracking-tight">{remaining.toLocaleString()}</p><p className="mt-0.5 text-xs text-[#7a879a]">credits available</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full bg-[#1264dc]" style={{width:`${percentage}%`}} /></div></div>;
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-4">
          {actions.map((action) => <Link key={action.label} href={action.href} className="group flex items-start gap-3 rounded-md border border-[#dfe5ed] bg-white p-4 transition-colors hover:border-[#a9c6ed] hover:bg-[#fbfdff]"><action.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#1264dc]" /><div><p className="text-sm font-semibold group-hover:text-[#1264dc]">{action.label}</p><p className="mt-1 text-xs leading-relaxed text-[#718096]">{action.note}</p></div></Link>)}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="rounded-md border border-[#dfe5ed] bg-white"><div className="flex items-center justify-between border-b border-[#e5eaf1] px-5 py-4"><div><h2 className="text-base font-semibold">Outreach performance</h2><p className="mt-0.5 text-xs text-[#718096]">Messages and calls delivered this week</p></div><Link href="/customer/campaigns" className="text-xs font-medium text-[#1264dc] hover:underline">View campaigns</Link></div><div className="h-[284px] px-3 pb-3 pt-5 sm:px-5"><ResponsiveContainer width="100%" height="100%"><AreaChart data={usage} margin={{top:5,right:10,left:-10,bottom:0}}><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#718096',fontSize:11}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#718096',fontSize:11}} tickFormatter={(value)=>`${Math.round(value/1000)}K`}/><Tooltip contentStyle={{border:'1px solid #dfe5ed',borderRadius:6,boxShadow:'none',fontSize:12}}/><Area type="monotone" dataKey="messages" stroke="#1264dc" strokeWidth={2.5} fill="#1264dc" fillOpacity={0.06}/></AreaChart></ResponsiveContainer></div></div>

          <div className="rounded-md border border-[#dfe5ed] bg-white"><div className="flex items-center justify-between border-b border-[#e5eaf1] px-5 py-4"><h2 className="text-base font-semibold">Next best actions</h2><span className="h-2 w-2 rounded-full bg-[#22a766]" /></div><div className="divide-y divide-[#e8edf3]">
            <Link href="/customer/contacts" className="flex gap-3 px-5 py-4 hover:bg-[#f8fafc]"><Users className="mt-0.5 h-5 w-5 text-[#1264dc]"/><div><p className="text-sm font-medium">Grow your voter list</p><p className="mt-1 text-xs text-[#718096]">Upload or organize campaign contacts</p></div></Link>
            <Link href="/customer/billing" className="flex gap-3 px-5 py-4 hover:bg-[#f8fafc]"><CreditCard className="mt-0.5 h-5 w-5 text-[#1264dc]"/><div><p className="text-sm font-medium">Review credit balance</p><p className="mt-1 text-xs text-[#718096]">Buy credits before your next outreach</p></div></Link>
            <Link href="/customer/support" className="flex gap-3 px-5 py-4 hover:bg-[#f8fafc]"><AlertCircle className="mt-0.5 h-5 w-5 text-[#1264dc]"/><div><p className="text-sm font-medium">Need campaign support?</p><p className="mt-1 text-xs text-[#718096]">Raise and track a support request</p></div></Link>
          </div></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="overflow-hidden rounded-md border border-[#dfe5ed] bg-white lg:col-span-2"><div className="border-b border-[#e5eaf1] px-5 py-4"><h2 className="text-base font-semibold">Recent activity</h2><p className="mt-0.5 text-xs text-[#718096]">Latest updates from your campaign account</p></div><div className="divide-y divide-[#e8edf3]">{[
            ["SMS campaign completed","45,000 messages delivered","2 hours ago"],
            ["Credit purchase confirmed","20,000 IVR credits added","Yesterday"],
            ["Campaign draft saved","Rally invitation campaign","2 days ago"],
          ].map(([title,note,time]) => <div key={title} className="flex items-center gap-3 px-5 py-4"><span className="h-2 w-2 rounded-full bg-[#1264dc]"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-[#718096]">{note}</p></div><span className="text-xs text-[#8792a5]">{time}</span></div>)}</div></div>
          <div className="rounded-md border border-[#dfe5ed] bg-white p-5"><h2 className="text-base font-semibold">IVR engagement</h2><p className="mt-1 text-xs text-[#718096]">Latest voice campaign performance</p><div className="mt-5 space-y-4">{[["Calls placed","18,000"],["Answered","11,700"],["Pick-up rate","65%"]].map(([label,value]) => <div key={label} className="flex items-center justify-between border-b border-[#e8edf3] pb-3 last:border-0 last:pb-0"><span className="text-sm text-[#5f6d82]">{label}</span><strong className="text-sm">{value}</strong></div>)}</div><Link href="/customer/ivr" className="mt-5 inline-flex text-xs font-semibold text-[#1264dc] hover:underline">Open IVR analytics <ArrowRight className="ml-1 h-3.5 w-3.5"/></Link></div>
        </section>
      </div>
    </div>
  );
}
