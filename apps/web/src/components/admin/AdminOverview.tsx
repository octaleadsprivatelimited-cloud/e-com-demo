"use client";

import Link from "next/link";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileCheck,
  MoreHorizontal,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Candidate = {
  id: string;
  name: string;
  district: string;
  area?: string;
  status: string;
  balances: { sms: number; ivr: number; wa: number };
  contacts: number;
  mobile: string;
};

type Gateway = { status: string; latency: string; testing: boolean };

type Props = {
  candidates: Candidate[];
  activeCount: number;
  totalReach: number;
  pendingDlt: number;
  pendingApprovals: Candidate[];
  gatewayStatus: Record<"sms" | "whatsapp" | "ivr" | "payment", Gateway>;
  selectedCandId: string;
  creditType: string;
  creditAmount: string;
  creditAction: string;
  isDisbursing: boolean;
  onSelectedCandidate: (value: string) => void;
  onCreditType: (value: string) => void;
  onCreditAmount: (value: string) => void;
  onCreditAction: (value: string) => void;
  onCreditSubmit: (event: React.FormEvent) => void;
  onCandidateStatus: (id: string, status: string) => void;
  onGatewayTest: (key: "sms" | "whatsapp" | "ivr" | "payment") => void;
};

const performanceData = [
  { day: "Aug 7", reach: 101000 },
  { day: "Aug 9", reach: 108000 },
  { day: "Aug 11", reach: 112000 },
  { day: "Aug 13", reach: 118000 },
  { day: "Aug 15", reach: 124000 },
  { day: "Aug 17", reach: 129000 },
  { day: "Aug 19", reach: 134000 },
  { day: "Aug 20", reach: 137000 },
];

export function AdminOverview(props: Props) {
  const recentCandidates = props.candidates.slice(0, 5);
  const paymentTotal = props.candidates.reduce((sum, candidate) => sum + (Number((candidate as Candidate & { payments?: number }).payments) || 0), 0);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f8fafc] px-4 py-6 text-[#0a1933] sm:px-7 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1380px] space-y-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-[28px] font-bold tracking-[-0.035em] sm:text-[32px]">Operational health</h1>
            <p className="mt-1 text-sm text-[#647187]">Overview of platform activity and system status · August 20, 2026</p>
          </div>
          <Link href="/admin/candidates" className="inline-flex h-10 items-center justify-center rounded-md bg-[#1264dc] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0d52bc]">
            <UserCheck className="mr-2 h-4 w-4" /> Add candidate
          </Link>
        </section>

        <section className="grid border-y border-[#dfe5ed] bg-white sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active candidates", value: props.activeCount.toLocaleString(), note: `${props.pendingApprovals.length} pending approvals`, icon: UserCheck },
            { label: "Voter reach (CRM)", value: props.totalReach.toLocaleString(), note: "Contacts across all profiles", icon: Users },
            { label: "DLT approvals", value: props.pendingDlt.toLocaleString(), note: "Templates due for review", icon: FileCheck },
            { label: "Payments processed", value: `₹${paymentTotal.toLocaleString("en-IN")}`, note: "Across candidate accounts", icon: CreditCard },
          ].map((metric) => (
            <div key={metric.label} className="flex min-h-[112px] gap-3 border-b border-[#e5eaf1] px-5 py-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
              <metric.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#1264dc]" />
              <div><p className="text-sm text-[#4f5e75]">{metric.label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{metric.value}</p><p className="mt-1 text-xs text-[#7a879a]">{metric.note}</p></div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="rounded-md border border-[#dfe5ed] bg-white">
            <div className="flex items-center justify-between border-b border-[#e5eaf1] px-5 py-4"><div><h2 className="text-base font-semibold">Platform performance</h2><p className="mt-0.5 text-xs text-[#718096]">14-day voter reach trend</p></div><span className="text-xs font-medium text-[#1264dc]">Live data</span></div>
            <div className="h-[278px] px-3 pb-3 pt-5 sm:px-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#718096", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#718096", fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}K`} />
                  <Tooltip contentStyle={{ border: "1px solid #dfe5ed", borderRadius: 6, boxShadow: "none", fontSize: 12 }} formatter={(value) => [Number(value).toLocaleString(), "Voter reach"]} />
                  <Area type="monotone" dataKey="reach" stroke="#1264dc" strokeWidth={2.5} fill="#1264dc" fillOpacity={0.06} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-[#dfe5ed] bg-white">
            <div className="flex items-center justify-between border-b border-[#e5eaf1] px-5 py-4"><h2 className="text-base font-semibold">Requires attention</h2><Link href="/admin/candidates" className="text-xs font-medium text-[#1264dc] hover:underline">View all</Link></div>
            <div className="divide-y divide-[#e8edf3]">
              {[
                { icon: FileCheck, title: `${props.pendingDlt} DLT templates due for review`, note: "Open template approval queue", href: "/admin/templates" },
                { icon: UserCheck, title: `${props.pendingApprovals.length} candidates pending approval`, note: "Review account verification", href: "/admin/candidates" },
                { icon: CreditCard, title: "Credit controls ready", note: "Adjust channel balances below", href: "#credit-control" },
              ].map((item) => <Link key={item.title} href={item.href} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-[#f8fafc]"><item.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#1264dc]" /><div className="min-w-0"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-[#718096]">{item.note}</p></div></Link>)}
              <div className="flex items-start gap-3 px-5 py-4"><CheckCircle2 className="mt-0.5 h-5 w-5 text-[#159957]" /><div><p className="text-sm font-medium">System health</p><p className="mt-1 text-xs text-[#718096]">All gateways operational</p></div><span className="ml-auto mt-1 h-2 w-2 rounded-full bg-[#22a766]" /></div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-[#dfe5ed] bg-white">
          <div className="flex items-center justify-between border-b border-[#e5eaf1] px-5 py-4"><div><h2 className="text-base font-semibold">Recent candidates</h2><p className="mt-0.5 text-xs text-[#718096]">Live candidate records and approval state</p></div><Link href="/admin/candidates" className="text-xs font-medium text-[#1264dc] hover:underline">View all candidates</Link></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#fbfcfe] text-[11px] uppercase tracking-[0.08em] text-[#718096]"><tr><th className="px-5 py-3 font-medium">Candidate</th><th className="px-4 py-3 font-medium">District</th><th className="px-4 py-3 font-medium">Reach</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Action</th></tr></thead>
              <tbody className="divide-y divide-[#e8edf3]">{recentCandidates.map((candidate) => <tr key={candidate.id} className="hover:bg-[#fbfcfe]"><td className="px-5 py-3.5"><div className="font-medium">{candidate.name}</div><div className="mt-0.5 text-xs text-[#7a879a]">{candidate.id} · {candidate.mobile}</div></td><td className="px-4 py-3.5"><div>{candidate.district}</div><div className="text-xs text-[#7a879a]">{candidate.area || "—"}</div></td><td className="px-4 py-3.5">{candidate.contacts.toLocaleString()}</td><td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${candidate.status === "Active" ? "bg-[#e7f6ee] text-[#137a43]" : "bg-[#fff4df] text-[#996000]"}`}>{candidate.status}</span></td><td className="px-4 py-3.5 text-right">{candidate.status !== "Active" ? <Button size="sm" onClick={() => props.onCandidateStatus(candidate.id, "Active")} className="h-8 bg-[#1264dc] text-xs hover:bg-[#0d52bc]">Approve</Button> : <Link href={`/admin/candidates/${candidate.id}`} aria-label={`Open ${candidate.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-[#eef3f8]"><MoreHorizontal className="h-4 w-4" /></Link>}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div id="credit-control" className="rounded-md border border-[#dfe5ed] bg-white p-5"><h2 className="text-base font-semibold">Credit control</h2><p className="mt-1 text-xs text-[#718096]">Add or deduct communication credits from an active candidate.</p><form onSubmit={props.onCreditSubmit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><select className="h-10 rounded-md border border-[#d9e0ea] bg-white px-3 text-sm lg:col-span-2" value={props.selectedCandId} onChange={(event) => props.onSelectedCandidate(event.target.value)} required><option value="">Select candidate</option>{props.candidates.filter((candidate) => candidate.status === "Active").map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select><select className="h-10 rounded-md border border-[#d9e0ea] bg-white px-3 text-sm" value={props.creditType} onChange={(event) => props.onCreditType(event.target.value)}><option value="sms">SMS</option><option value="wa">WhatsApp</option><option value="ivr">IVR</option></select><select className="h-10 rounded-md border border-[#d9e0ea] bg-white px-3 text-sm" value={props.creditAction} onChange={(event) => props.onCreditAction(event.target.value)}><option value="add">Add</option><option value="deduct">Deduct</option></select><Input type="number" min="1" placeholder="Amount" value={props.creditAmount} onChange={(event) => props.onCreditAmount(event.target.value)} required className="h-10"/><Button type="submit" disabled={props.isDisbursing} className="h-10 bg-[#1264dc] sm:col-span-2 lg:col-span-5 lg:justify-self-end lg:px-6">{props.isDisbursing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Apply credit change</Button></form></div>

          <div className="rounded-md border border-[#dfe5ed] bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">System gateways</h2><p className="mt-1 text-xs text-[#718096]">Live integration diagnostics</p></div><Activity className="h-5 w-5 text-[#1264dc]" /></div><div className="mt-4 divide-y divide-[#e8edf3]">{([['sms','SMS gateway'],['whatsapp','WhatsApp API'],['ivr','IVR trunk'],['payment','Payment webhooks']] as const).map(([key,label]) => <div key={key} className="flex items-center gap-3 py-3"><span className="h-2 w-2 rounded-full bg-[#22a766]"/><div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="text-xs text-[#718096]">{props.gatewayStatus[key].status} · {props.gatewayStatus[key].latency}</p></div><Button size="sm" variant="outline" disabled={props.gatewayStatus[key].testing} onClick={() => props.onGatewayTest(key)} className="h-8 text-xs">{props.gatewayStatus[key].testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : "Test"}</Button></div>)}</div></div>
        </section>
      </div>
    </div>
  );
}
