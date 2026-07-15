"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, PhoneCall, RefreshCw, BarChart2, CheckCircle2, AlertTriangle } from "lucide-react";
import { campaignsApi, candidatesApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { time: "08:00", answered: 400, busy: 240, failed: 20 },
  { time: "10:00", answered: 300, busy: 139, failed: 10 },
  { time: "12:00", answered: 900, busy: 580, failed: 45 },
  { time: "14:00", answered: 390, busy: 480, failed: 22 },
  { time: "16:00", answered: 480, busy: 380, failed: 15 },
  { time: "18:00", answered: 880, busy: 430, failed: 35 },
  { time: "20:00", answered: 430, busy: 200, failed: 10 },
];

const demoCampaigns = [
  { id: "IVR-7782", candidate: "Rahul Sharma", district: "Pune", total: 45000, answered: 28500, status: "Running", progress: 65 },
  { id: "IVR-7783", candidate: "Priya Singh", district: "Nashik", total: 20000, answered: 18500, status: "Completed", progress: 100 },
  { id: "SMS-8890", candidate: "Amit Kumar", district: "Nagpur", total: 100000, answered: 98000, status: "Completed", progress: 100 },
  { id: "IVR-7784", candidate: "Suresh Deshmukh", district: "Satara", total: 30000, answered: 4500, status: "Running", progress: 15 },
];

export default function AdminBlastsPage() {
  const [campaigns, setCampaigns] = useState<any[]>(demoCampaigns);

  useEffect(() => {
    (async () => {
      try {
        const [all, cands] = await Promise.all([
          campaignsApi.listAll(),
          candidatesApi.list(),
        ]);
        const byId = new Map(
          (cands as any[]).map((c) => [c.id, { name: c.name, district: c.district }]),
        );
        if (Array.isArray(all) && all.length) {
          setCampaigns(
            (all as any[]).map((c) => ({
              id: `${c.channel.toUpperCase()}-${c.id.slice(-4)}`,
              candidate: byId.get(c.ownerId)?.name || c.ownerId,
              district: byId.get(c.ownerId)?.district || "—",
              total: c.recipientCount,
              answered: c.stats?.delivered ?? c.recipientCount,
              status: "Completed",
              progress: 100,
            })),
          );
        }
      } catch {
        // keep demo data
      }
    })();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform SMS & IVR Traffic</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor real-time voice and message delivery across all candidates.
          </p>
        </div>
        <Button variant="outline" className="border-border/50">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status
        </Button>
      </div>

      {/* Global Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Active Live Channels", value: "850", icon: PhoneCall, color: "text-emerald-500" },
          { title: "Avg. Answer Rate", value: "68.4%", icon: BarChart2, color: "text-primary" },
          { title: "Failed Deliveries", value: "1.2%", icon: AlertTriangle, color: "text-destructive" },
          { title: "Peak SMS / sec", value: "450/s", icon: MessageSquare, color: "text-blue-500" },
        ].map((stat, i) => (
          <Card key={i} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Live Call Traffic Chart */}
        <Card className="col-span-4 glass-card">
          <CardHeader>
            <CardTitle>Live IVR Call Dispositions</CardTitle>
            <CardDescription>
              Real-time mapping of Answered vs Busy vs Failed states today.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBusy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Area type="monotone" name="Answered" dataKey="answered" stroke="#10b981" fillOpacity={1} fill="url(#colorAns)" />
                <Area type="monotone" name="Busy/No Answer" dataKey="busy" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBusy)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Campaign Monitor Table */}
        <Card className="col-span-3 glass-card flex flex-col">
          <CardHeader>
            <CardTitle>Active Client Blasts</CardTitle>
            <CardDescription>
              Currently running campaigns across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>Campaign</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((camp) => (
                  <TableRow key={camp.id} className="border-border/50">
                    <TableCell>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {camp.id.startsWith("IVR") ? <PhoneCall className="h-3 w-3 text-emerald-500" /> : <MessageSquare className="h-3 w-3 text-blue-500" />}
                        {camp.id}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {camp.status === "Running" ? (
                          <span className="flex items-center gap-1 text-primary"><RefreshCw className="h-3 w-3 animate-spin" /> Live</span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Finished</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{camp.candidate}</div>
                      <div className="text-xs text-muted-foreground">{camp.district}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">{camp.progress}%</div>
                      <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden flex justify-end">
                        <div className={`h-full ${camp.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${camp.progress}%` }} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
