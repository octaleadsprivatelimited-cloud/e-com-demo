"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Search, ArrowUpDown, Filter, DollarSign, Calendar, FileText, User, ChevronRight, CheckCircle2, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { billingApi, candidatesApi } from "@/lib/api";

interface Payment {
  id: string;
  paymentId: string;
  candidateId: string;
  candidateName: string;
  mobile: string;
  packageName: string;
  amount: number;
  timestamp: string;
  status: string;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPackage, setFilterPackage] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const loadPayments = React.useCallback(async () => {
    try {
      const [list, cands] = await Promise.all([
        billingApi.allPayments(),
        candidatesApi.list(),
      ]);
      const byId = new Map(
        (cands as any[]).map((c) => [c.id, { name: c.name, mobile: c.mobile }]),
      );
      setPayments(
        (list as any[]).map((p) => ({
          id: p.id,
          paymentId: p.paymentId || p.id,
          candidateId: p.ownerId,
          candidateName: byId.get(p.ownerId)?.name || p.ownerId,
          mobile: byId.get(p.ownerId)?.mobile || "",
          packageName: p.packageName,
          amount: p.amount,
          timestamp: p.createdAt,
          status: p.status,
        })),
      );
    } catch {
      try {
        const stored = localStorage.getItem("poltica_payments");
        if (stored) setPayments(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadPayments();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadPayments();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadPayments]);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalTxns = payments.length;
  const avgOrderValue = totalTxns > 0 ? Math.round(totalRevenue / totalTxns) : 0;

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mobile.includes(searchTerm);

    const matchesPackage = filterPackage === "all" || p.packageName.toLowerCase().includes(filterPackage.toLowerCase());

    return matchesSearch && matchesPackage;
  });

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1e293b] dark:text-white flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-primary" /> Payments Received
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Monitor transaction logs, campaign purchases, and credit disbursements across all candidates.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gross earnings from credit sales</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTxns} Completed</div>
            <p className="text-xs text-muted-foreground mt-1">Total success callbacks processed</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{avgOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Average candidate transaction value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Search Transactions</CardTitle>
          <CardDescription>Filter payments by candidate details or package types.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidate name, mobile, TXN ID or Razorpay ID..."
                className="pl-9 bg-background/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Badge
                variant={filterPackage === "all" ? "default" : "outline"}
                className="cursor-pointer select-none px-3 py-1 text-xs"
                onClick={() => setFilterPackage("all")}
              >
                All Packages
              </Badge>
              <Badge
                variant={filterPackage === "sms" ? "default" : "outline"}
                className="cursor-pointer select-none px-3 py-1 text-xs"
                onClick={() => setFilterPackage("sms")}
              >
                SMS
              </Badge>
              <Badge
                variant={filterPackage === "wa" ? "default" : "outline"}
                className="cursor-pointer select-none px-3 py-1 text-xs"
                onClick={() => setFilterPackage("wa")}
              >
                WhatsApp
              </Badge>
              <Badge
                variant={filterPackage === "ivr" ? "default" : "outline"}
                className="cursor-pointer select-none px-3 py-1 text-xs"
                onClick={() => setFilterPackage("ivr")}
              >
                IVR
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold">
                <th className="p-4">TXN ID</th>
                <th className="p-4">Candidate</th>
                <th className="p-4">Package</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-mono font-medium text-xs text-primary">{p.id}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#1e293b] dark:text-zinc-200">{p.candidateName}</span>
                        <span className="text-xs text-muted-foreground">{p.mobile}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className="font-medium text-xs">
                        {p.packageName}
                      </Badge>
                    </td>
                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(p.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary-hover gap-1"
                        onClick={() => setSelectedPayment(p)}
                      >
                        Receipt <ChevronRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
                    No transactions match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Transaction Receipt
            </DialogTitle>
            <DialogDescription>Verified Razorpay payment confirmation record.</DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 py-4 border-t border-b border-border/50 font-sans">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Receipt Number</span>
                <span className="font-mono font-semibold">{selectedPayment.id}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Razorpay Payment ID</span>
                <span className="font-mono font-medium text-xs bg-muted px-2 py-0.5 rounded">
                  {selectedPayment.paymentId}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Candidate Name</span>
                <span className="font-semibold">{selectedPayment.candidateName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Mobile Phone</span>
                <span>{selectedPayment.mobile}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Package Description</span>
                <span>{selectedPayment.packageName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Timestamp</span>
                <span>{new Date(selectedPayment.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-dashed">
                <span className="font-semibold text-base">Amount Paid</span>
                <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                  ₹{selectedPayment.amount.toLocaleString()}.00
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between items-center gap-2 w-full">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setSelectedPayment(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
