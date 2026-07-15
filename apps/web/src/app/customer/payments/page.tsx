"use client";

import React, { useState, useEffect } from "react";
import { Receipt, Search, ArrowUpDown, Filter, DollarSign, Calendar, FileText, User, ChevronRight, CheckCircle2, Download, CreditCard, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import Link from "next/link";
import { billingApi } from "@/lib/api";

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

const getReceiptItems = (packageName: string) => {
  const nameLower = packageName.toLowerCase();
  if (nameLower.includes("sms booster") || nameLower.includes("sms")) {
    return [{ desc: "SMS Campaigns Credits", qty: 50000, rate: "₹0.024", total: 1200 }];
  } else if (nameLower.includes("whatsapp booster") || nameLower.includes("whatsapp") || nameLower.includes("wa")) {
    return [{ desc: "WhatsApp Broadcast Credits", qty: 10000, rate: "₹0.08", total: 800 }];
  } else if (nameLower.includes("ivr booster") || nameLower.includes("ivr") || nameLower.includes("voice")) {
    return [{ desc: "IVR Voice Calling Credits", qty: 20000, rate: "₹0.075", total: 1500 }];
  } else if (nameLower.includes("all one") || nameLower.includes("all-in-one")) {
    return [
      { desc: "SMS Campaigns Credits", qty: 10000, rate: "₹0.024", total: 240 },
      { desc: "WhatsApp Broadcast Credits", qty: 5000, rate: "₹0.08", total: 400 },
      { desc: "IVR Voice Calling Credits", qty: 5000, rate: "₹0.075", total: 375 }
    ];
  }
  return [{ desc: "Communication Booster Pack", qty: 1, rate: "N/A", total: 0 }];
};

export default function CustomerPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [invoiceStyle, setInvoiceStyle] = useState<"typewriter" | "modern" | "classic">("typewriter");
  const [invoiceColor, setInvoiceColor] = useState<"blue" | "emerald" | "crimson" | "amber" | "slate">("blue");
  const [customSettings, setCustomSettings] = useState<any>(null);

  useEffect(() => {
    const loadSettings = () => {
      try {
        const stored = localStorage.getItem("poltica_invoice_settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          setCustomSettings(parsed);
          if (parsed.templateStyle) setInvoiceStyle(parsed.templateStyle);
          if (parsed.accentColor) setInvoiceColor(parsed.accentColor);
        }
      } catch (e) {}
    };
    loadSettings();
    window.addEventListener("storage", loadSettings);
    return () => window.removeEventListener("storage", loadSettings);
  }, []);

  const loadUserDataAndPayments = React.useCallback(async () => {
    let parsed: any = null;
    try {
      const sessionUser = localStorage.getItem("currentCustomerUser");
      if (sessionUser) {
        parsed = JSON.parse(sessionUser);
        setCurrentUser(parsed);
      }
    } catch {}

    // Load this tenant's payment history from the server.
    try {
      const list = await billingApi.payments();
      setPayments(
        list.map((p: any) => ({
          id: p.id,
          paymentId: p.paymentId || p.id,
          candidateId: parsed?.id || "",
          candidateName: parsed?.name || "Candidate",
          mobile: parsed?.mobile || "",
          packageName: p.packageName,
          amount: p.amount,
          timestamp: p.createdAt,
          status: p.status,
        })),
      );
    } catch {
      // Fallback to any locally cached payments if the API is unreachable.
      try {
        const allPayments = JSON.parse(localStorage.getItem("poltica_payments") || "[]");
        setPayments(
          allPayments.filter(
            (p: any) => p.candidateId === parsed?.id || p.mobile === parsed?.mobile,
          ),
        );
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadUserDataAndPayments();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadUserDataAndPayments();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadUserDataAndPayments]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = payments.filter((p) => {
    return (
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.packageName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1e293b] dark:text-white flex items-center gap-2">
            <Receipt className="h-8 w-8 text-primary" /> Payment History
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View invoices, credit transaction receipts, and total campaign investments.
          </p>
        </div>
        <Link href="/customer/billing">
          <Button className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white font-medium text-xs rounded-sm">
            <CreditCard className="mr-2 h-4 w-4" /> Purchase More Credits
          </Button>
        </Link>
      </div>

      {/* Summary Banner */}
      <Card className="glass-card bg-[#2563eb]/5 border-[#2563eb]/20">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">Candidate Account Total</span>
            <div className="text-3xl font-bold text-[#2563eb] dark:text-[#93c5fd]">
              ₹{totalPaid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total money paid for campaign SMS, WhatsApp, and Voice boosts.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <div className="text-center bg-background/50 p-3 rounded border border-border/40">
              <span className="block text-foreground font-bold text-sm">{payments.length}</span>
              <span>Invoices Paid</span>
            </div>
            <div className="text-center bg-background/50 p-3 rounded border border-border/40">
              <span className="block text-emerald-600 font-bold text-sm">100%</span>
              <span>Delivery Success</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Search */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Invoices & Receipts</CardTitle>
          <CardDescription>Search or display completed transactions in your current session.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by transaction ID, payment ID, or package description..."
              className="pl-9 bg-background/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold">
                <th className="p-4">Invoice ID</th>
                <th className="p-4">Package</th>
                <th className="p-4">Amount Paid</th>
                <th className="p-4">Paid On</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-mono font-medium text-xs text-primary">{p.id}</td>
                    <td className="p-4">
                      <span className="font-semibold text-[#1e293b] dark:text-zinc-200">{p.packageName}</span>
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{p.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(p.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 text-xs">
                      <span className="bg-muted px-2 py-1 rounded">Razorpay Link</span>
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
                        Details <ChevronRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
                    No payment records found. Go to "Billing & Quota" to purchase a booster pack.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-[600px] bg-[#FAF9F6] dark:bg-[#121212] border-none shadow-xl p-6">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-receipt, #printable-receipt * {
                visibility: visible !important;
              }
              #printable-receipt {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                border: none !important;
                box-shadow: none !important;
                padding: 20px !important;
              }
            }
          `}} />

          <DialogHeader className="pb-3 border-b border-dashed border-border/60">
            <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-[#1e293b] dark:text-zinc-200">
              <Receipt className="h-4 w-4 text-[#2563eb]" /> Terminal Receipt
            </DialogTitle>
          </DialogHeader>

          {/* Style & Color Selector */}
          <div className="space-y-3 pb-4 mb-2 border-b border-border/40 select-none">
            {/* Style Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Invoice Design Template</label>
              <div className="grid grid-cols-3 gap-1">
                {(["typewriter", "modern", "classic"] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setInvoiceStyle(style)}
                    className={`h-7 text-[10px] font-semibold rounded-sm capitalize border transition-all ${
                      invoiceStyle === style
                        ? "bg-[#2563eb] border-[#2563eb] text-white"
                        : "bg-background border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Accent Brand Color</label>
              <div className="grid grid-cols-5 gap-1">
                {(["blue", "emerald", "crimson", "amber", "slate"] as const).map((color) => {
                  const colorMap = {
                    blue: "bg-[#2563eb] border-[#1d4ed8]",
                    emerald: "bg-[#16a34a] border-[#0b590b]",
                    crimson: "bg-[#dc2626] border-[#7d1c21]",
                    amber: "bg-[#d29200] border-[#9c6c00]",
                    slate: "bg-[#475569] border-[#334155]",
                  };
                  return (
                    <button
                      key={color}
                      onClick={() => setInvoiceColor(color)}
                      className={`h-7 rounded-sm flex items-center justify-center border transition-all ${
                        invoiceColor === color
                          ? "ring-2 ring-[#2563eb] ring-offset-1 ring-offset-background scale-[1.03]"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${colorMap[color]}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedPayment && (() => {
            const colorHex = {
              blue: { text: "#2563eb", border: "#2563eb", bgLight: "#f0f8ff", bgSolid: "#2563eb" },
              emerald: { text: "#16a34a", border: "#16a34a", bgLight: "#f0fff0", bgSolid: "#16a34a" },
              crimson: { text: "#dc2626", border: "#dc2626", bgLight: "#fff0f0", bgSolid: "#dc2626" },
              amber: { text: "#b17f00", border: "#b17f00", bgLight: "#fffdf0", bgSolid: "#b17f00" },
              slate: { text: "#475569", border: "#475569", bgLight: "#f8fafc", bgSolid: "#475569" },
            }[invoiceColor];

            const brandName = customSettings?.brandName || "POLTICA SYSTEMS";
            const registeredName = customSettings?.registeredName || "OCTALEADS PRIVATE LIMITED";
            const subtitle = customSettings?.subtitle || "Cloud Campaign Infrastructure";
            const clientName = customSettings?.candidateName || selectedPayment.candidateName;
            const disclaimer = customSettings?.disclaimer || "This is an electronically generated valid tax statement under Section 79 of IT Act 2000.";
            const signatoryLabel = customSettings?.signatoryLabel || "Authorized Signatory";

            return (
              <div className="max-h-[360px] overflow-y-auto pr-1">
                {/* Printable container */}
                <div id="printable-receipt">
                  {invoiceStyle === "typewriter" && (
                    <div className="py-2 font-mono text-[11px] text-[#1e293b] dark:text-zinc-300 leading-relaxed space-y-3">
                      {/* Receipt Header / Logo area */}
                      <div className="text-center space-y-1">
                        <div className="text-[13px] font-bold tracking-wider flex items-center justify-center gap-1.5" style={{ color: colorHex.text }}>
                          <div className="h-4.5 w-4.5 text-white flex items-center justify-center rounded-sm font-sans font-black text-[10px]" style={{ backgroundColor: colorHex.bgSolid }}>P</div>
                          {brandName.toUpperCase()}
                        </div>
                        <div className="text-[8px] text-muted-foreground uppercase font-bold">{registeredName}</div>
                        <div className="text-[8px] text-muted-foreground/80 uppercase">{subtitle}</div>
                        <div>---------------------------------------------</div>
                      </div>

                      {/* metadata info */}
                      <div className="space-y-1 text-left">
                        <div className="font-bold" style={{ color: colorHex.text }}>SYSTEM GENERATED INVOICE</div>
                        <div>INVOICE REF : {selectedPayment.id}</div>
                        <div>RAZORPAY TXN ID : {selectedPayment.paymentId}</div>
                        <div>TIMESTAMP   : {new Date(selectedPayment.timestamp).toLocaleString()}</div>
                        <div>CLIENT NAME : {clientName.toUpperCase()}</div>
                        <div>MOBILE NO   : {selectedPayment.mobile}</div>
                        <div>STATUS      : SUCCESS // TRANSACTION PAID</div>
                        <div>---------------------------------------------</div>
                      </div>

                      {/* Items grid */}
                      <div className="space-y-1">
                        <div className="grid grid-cols-12 font-bold pb-1 border-b border-dashed border-border/50">
                          <div className="col-span-5 text-left">ITEM DESCRIPTION</div>
                          <div className="col-span-3 text-right">QTY</div>
                          <div className="col-span-2 text-right">RATE</div>
                          <div className="col-span-2 text-right">TOTAL</div>
                        </div>
                        {getReceiptItems(selectedPayment.packageName).map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 py-0.5">
                            <div className="col-span-5 text-left truncate">{item.desc}</div>
                            <div className="col-span-3 text-right">{item.qty.toLocaleString()}</div>
                            <div className="col-span-2 text-right">{item.rate}</div>
                            <div className="col-span-2 text-right">₹{item.total > 0 ? item.total.toLocaleString() : selectedPayment.amount.toLocaleString()}</div>
                          </div>
                        ))}
                        <div>---------------------------------------------</div>
                      </div>

                      {/* Totals */}
                      <div className="space-y-1 text-right">
                        <div>NET SUBTOTAL: ₹{selectedPayment.amount.toLocaleString()}.00</div>
                        <div>CGST/SGST 18%: INCLUDED</div>
                        <div className="text-[12px] font-bold" style={{ color: colorHex.text }}>TOTAL AMOUNT PAID: ₹{selectedPayment.amount.toLocaleString()}.00</div>
                        <div>---------------------------------------------</div>
                      </div>

                      {/* Thank you note */}
                      <div className="text-center text-[9px] space-y-1 pt-1">
                        <div>*** THANK YOU FOR SUPPORTING THE ELECTION CAMPAIGN ***</div>
                        <div className="text-muted-foreground">{disclaimer}</div>
                      </div>
                    </div>
                  )}

                  {invoiceStyle === "modern" && (
                    <div className="p-5 bg-white dark:bg-zinc-950 rounded-md border border-border/50 space-y-4 font-sans text-xs text-left">
                      {/* Header */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight" style={{ color: colorHex.text }}>
                            <div className="h-5 w-5 text-white flex items-center justify-center rounded font-sans font-black text-xs" style={{ backgroundColor: colorHex.bgSolid }}>P</div>
                            {brandName}
                          </div>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">{registeredName}</p>
                          <p className="text-[9px] text-muted-foreground">{subtitle}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white" style={{ backgroundColor: colorHex.bgSolid }}>
                            PAID
                          </span>
                          <p className="text-[9px] text-muted-foreground mt-1.5">Ref: {selectedPayment.id}</p>
                        </div>
                      </div>

                      {/* Info Block */}
                      <div className="grid grid-cols-2 gap-4 p-3 rounded-md border-l-[3px]" style={{ backgroundColor: colorHex.bgLight + "40", borderColor: colorHex.border }}>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Billed To</p>
                          <p className="font-semibold text-foreground mt-0.5">{clientName}</p>
                          <p className="text-muted-foreground">{selectedPayment.mobile}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Payment Details</p>
                          <p className="font-semibold text-foreground mt-0.5">Razorpay Online</p>
                          <p className="text-muted-foreground text-[10px] truncate">ID: {selectedPayment.paymentId}</p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Transaction Date: {new Date(selectedPayment.timestamp).toLocaleString()}</span>
                        <span>Tax Status: GST 18% Inclusive</span>
                      </div>

                      {/* Items Table */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 font-bold pb-1.5 border-b border-border/80 text-[10px] text-muted-foreground uppercase">
                          <div className="col-span-6 text-left">Description</div>
                          <div className="col-span-2 text-right">Qty</div>
                          <div className="col-span-2 text-right">Rate</div>
                          <div className="col-span-2 text-right">Amount</div>
                        </div>
                        {getReceiptItems(selectedPayment.packageName).map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 py-1 items-center border-b border-border/20">
                            <div className="col-span-6 text-left font-medium text-foreground">{item.desc}</div>
                            <div className="col-span-2 text-right text-muted-foreground">{item.qty.toLocaleString()}</div>
                            <div className="col-span-2 text-right text-muted-foreground">{item.rate}</div>
                            <div className="col-span-2 text-right font-semibold text-foreground">₹{item.total > 0 ? item.total.toLocaleString() : selectedPayment.amount.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="flex justify-end">
                        <div className="w-1/2 space-y-1.5 text-right text-[11px]">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal:</span>
                            <span>₹{selectedPayment.amount.toLocaleString()}.00</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>GST (18%):</span>
                            <span>Included</span>
                          </div>
                          <div className="flex justify-between font-bold text-sm border-t border-border/50 pt-1.5" style={{ color: colorHex.text }}>
                            <span>Total Paid:</span>
                            <span>₹{selectedPayment.amount.toLocaleString()}.00</span>
                          </div>
                        </div>
                      </div>

                      {/* Footnote */}
                      <div className="text-center text-[9px] text-muted-foreground border-t border-border/30 pt-3">
                        {disclaimer}
                      </div>
                    </div>
                  )}

                  {invoiceStyle === "classic" && (
                    <div className="p-6 bg-white dark:bg-zinc-900 border-2 border-double border-foreground/30 space-y-5 font-serif text-xs text-left">
                      {/* Corporate Header */}
                      <div className="text-center pb-3 border-b-2 border-foreground/60 space-y-1">
                        <h2 className="text-lg font-bold tracking-widest uppercase" style={{ color: colorHex.text }}>INVOICE / RECEIPT</h2>
                        <p className="text-[10px] font-semibold tracking-wider">{registeredName.toUpperCase()}</p>
                        <p className="text-[9px] italic text-muted-foreground">Publicly trading as {brandName} • Campaign Solutions Provider</p>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-4 text-[10px] py-1">
                        <div className="space-y-1">
                          <div><span className="font-bold">Invoice ID:</span> {selectedPayment.id}</div>
                          <div><span className="font-bold">Transaction Reference:</span> {selectedPayment.paymentId}</div>
                          <div><span className="font-bold">Issue Date:</span> {new Date(selectedPayment.timestamp).toLocaleString()}</div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div><span className="font-bold">Client:</span> {clientName}</div>
                          <div><span className="font-bold">Contact No:</span> {selectedPayment.mobile}</div>
                          <div><span className="font-bold">Payment Mode:</span> Razorpay Merchant Link</div>
                        </div>
                      </div>

                      {/* Standard Table */}
                      <table className="w-full border-collapse border border-foreground/40 text-[10px]">
                        <thead>
                          <tr className="bg-muted/40 border-b border-foreground/40 text-[9px] uppercase font-bold">
                            <th className="border border-foreground/30 p-2 text-left">Item Description</th>
                            <th className="border border-foreground/30 p-2 text-right">Quantity</th>
                            <th className="border border-foreground/30 p-2 text-right">Unit Rate</th>
                            <th className="border border-foreground/30 p-2 text-right">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getReceiptItems(selectedPayment.packageName).map((item, idx) => (
                            <tr key={idx} className="border-b border-foreground/20">
                              <td className="border border-foreground/30 p-2 font-medium">{item.desc}</td>
                              <td className="border border-foreground/30 p-2 text-right">{item.qty.toLocaleString()}</td>
                              <td className="border border-foreground/30 p-2 text-right">{item.rate}</td>
                              <td className="border border-foreground/30 p-2 text-right font-semibold">₹{item.total > 0 ? item.total.toLocaleString() : selectedPayment.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={2} className="border border-foreground/30 p-2 bg-muted/10 font-bold text-right">Total Summary</td>
                            <td className="border border-foreground/30 p-2 text-right">Subtotal</td>
                            <td className="border border-foreground/30 p-2 text-right">₹{selectedPayment.amount.toLocaleString()}.00</td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="border border-foreground/30 p-2 bg-muted/10"></td>
                            <td className="border border-foreground/30 p-2 text-right">GST (18% inclusive)</td>
                            <td className="border border-foreground/30 p-2 text-right">₹0.00</td>
                          </tr>
                          <tr className="font-bold text-sm bg-muted/30">
                            <td colSpan={2} className="border border-foreground/30 p-2 bg-muted/10"></td>
                            <td className="border border-foreground/30 p-2 text-right uppercase tracking-wider" style={{ color: colorHex.text }}>Grand Total</td>
                            <td className="border border-foreground/30 p-2 text-right" style={{ color: colorHex.text }}>₹{selectedPayment.amount.toLocaleString()}.00</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Signature & Disclaimer */}
                      <div className="pt-4 flex justify-between items-end">
                        <div className="text-[8px] text-muted-foreground max-w-xs space-y-1">
                          <p>{disclaimer}</p>
                        </div>
                        <div className="text-center space-y-4">
                          <div className="w-28 border-b border-foreground/60"></div>
                          <p className="text-[8px] uppercase tracking-wider font-semibold">{signatoryLabel}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter className="flex sm:justify-between items-center gap-2 w-full pt-4 border-t border-dashed border-border/60">
            <Button variant="outline" size="sm" className="w-full sm:w-auto font-mono text-[10px] uppercase h-8" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Receipt
            </Button>
            <Button size="sm" className="w-full sm:w-auto font-mono text-[10px] uppercase h-8 bg-primary hover:bg-primary/95 text-white" onClick={() => setSelectedPayment(null)}>
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
