"use client";

import React, { useState } from "react";
import { CustomerSidebar } from "@/components/CustomerSidebar";
import { CustomerHeader } from "@/components/CustomerHeader";
import { Button } from "@/components/ui/button";
import { X, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { verifySession, clearSession } from "@/lib/auth-api";
import { candidatesApi } from "@/lib/api";
import { SessionTimeout } from "@/components/SessionTimeout";
import { 
  LayoutDashboard, 
  MessageSquare, 
  PhoneCall, 
  MessageCircle,
  Settings,
  CreditCard,
  Users,
  Megaphone,
  AlertCircle,
  Globe,
  Receipt,
  FileText
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/customer", icon: LayoutDashboard },
  { name: "Voter Contacts", href: "/customer/contacts", icon: Users },
  { name: "Campaign Page Builder", href: "/customer/campaign-page", icon: Globe },
  { name: "My Campaigns", href: "/customer/campaigns", icon: Megaphone },
  { name: "SMS Blasts", href: "/customer/sms", icon: MessageSquare },
  { name: "WhatsApp Broadcasts", href: "/customer/whatsapp", icon: MessageCircle },
  { name: "IVR Calls", href: "/customer/ivr", icon: PhoneCall },
  { name: "Billing & Quota", href: "/customer/billing", icon: CreditCard },
  { name: "Payment History", href: "/customer/payments", icon: Receipt },
  { name: "Manifesto PDF Editor", href: "/customer/pdf-editor", icon: FileText },
  { name: "Settings", href: "/customer/settings", icon: Settings },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [drawerUser, setDrawerUser] = useState({ name: "User", district: "District", initials: "U" });
  const pathname = usePathname();

  React.useEffect(() => {
    const checkStatus = async () => {
      const sessionUser = localStorage.getItem("currentCustomerUser");
      if (!sessionUser) {
        clearSession();
        window.location.href = "/";
        return;
      }

      // Verify JWT session with NestJS server
      const sessionCheck = await verifySession();
      if (!sessionCheck.valid) {
        clearSession();
        window.location.href = "/";
        return;
      }

      // Fetch the authoritative status from the server so an admin suspend
      // takes effect for the customer in real time. `ensure` also syncs the
      // account to the API if the server has no record yet (self-healing).
      try {
        let cached: any = null;
        try { cached = JSON.parse(sessionUser); } catch {}
        const me = await candidatesApi.ensure(cached);
        if (me) {
          // Preserve the server's balances/status (source of truth), but keep
          // any richer cached profile fields.
          localStorage.setItem("currentCustomerUser", JSON.stringify(me));
          setIsSuspended(me.status === "Suspended");
          return;
        }
      } catch {
        // API unreachable / not signed in — fall back to the cached status.
      }
      try {
        const parsed = JSON.parse(sessionUser);
        const pool = JSON.parse(localStorage.getItem("poltica_candidates") || "[]");
        const freshUser = pool.find((c: any) => c.mobile === parsed.mobile || c.id === parsed.id);
        setIsSuspended((freshUser?.status || parsed.status) === "Suspended");
      } catch (e) {}
    };
    checkStatus();

    // Load user info for mobile drawer
    try {
      const su = localStorage.getItem("currentCustomerUser");
      if (su) {
        const p = JSON.parse(su);
        const init = (p.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
        setDrawerUser({ name: p.name || "User", district: p.district || "Candidate", initials: init });
      }
    } catch (e) {}

    // Real-time: re-check on focus and on a short interval.
    window.addEventListener("focus", checkStatus);
    const interval = setInterval(checkStatus, 10000);
    return () => {
      window.removeEventListener("focus", checkStatus);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    window.location.href = "/";
  };

  if (isSuspended) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center p-6 bg-[#f1f5f9] dark:bg-[#111] font-sans">
        <div className="w-full max-w-[450px] bg-white dark:bg-[#1b1b1b] border border-[#e2e8f0] dark:border-[#333] shadow-md p-6 rounded-sm text-center space-y-4">
          <div className="h-[3px] bg-[#dc2626] -mx-6 -mt-6" />
          <div className="mx-auto h-12 w-12 rounded-full bg-[#fef2f2] flex items-center justify-center select-none">
            <AlertCircle className="h-6 w-6 text-[#dc2626]" />
          </div>
          <h2 className="text-[20px] font-semibold text-[#1e293b] dark:text-white">Account Suspended</h2>
          <p className="text-[13px] text-[#64748b] dark:text-[#999] leading-relaxed">
            Your candidate communication account has been suspended by the platform administrator. Access to campaign tools (SMS blasts, WhatsApp broadcasts, and IVR calls) is disabled.
          </p>
          <div className="bg-[#f8fafc] dark:bg-[#222] border border-[#e2e8f0] dark:border-[#333] p-3 rounded-sm text-[11px] text-[#1e293b] dark:text-zinc-300">
            Please contact support or your account administrator to request reactivation.
          </div>
          <Button onClick={handleLogout} className="w-full bg-[#dc2626] hover:bg-[#801b20] text-white h-9 rounded-sm font-semibold text-xs mt-2">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f1f5f9] dark:bg-[#121212]">
      {/* Auto-logout on inactivity / max session age */}
      <SessionTimeout
        idleMinutes={15}
        onTimeout={() => {
          clearSession();
          sessionStorage.removeItem("poltica_session_start");
          window.location.href = "/?timeout=1";
        }}
      />
      {/* Desktop Sidebar */}
      <CustomerSidebar />

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#f1f5f9] dark:bg-[#161616] border-r border-[#e2e8f0] dark:border-[#333] transition-transform duration-200 ease-out sm:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Drawer header */}
        <div className="flex h-[48px] items-center justify-between px-4 border-b border-[#e2e8f0] dark:border-[#333]">
          <Link href="/customer" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <div className="h-[28px] w-[28px] rounded-sm bg-[#2563eb] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" fill="white" /><rect x="9" y="1" width="6" height="6" fill="white" opacity="0.7" /><rect x="1" y="9" width="6" height="6" fill="white" opacity="0.7" /><rect x="9" y="9" width="6" height="6" fill="white" opacity="0.5" /></svg>
            </div>
            <span className="font-semibold text-[14px] text-[#1e293b] dark:text-white">Poltica</span>
          </Link>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#64748b] hover:bg-[#f1f5f9]" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 overflow-auto pt-2 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/customer" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-sm px-3 py-[7px] text-[13px] transition-colors relative mb-[1px] ${
                  isActive 
                    ? 'bg-[#2563eb]/8 text-[#2563eb] dark:text-[#93c5fd] font-semibold' 
                    : 'text-[#1e293b] dark:text-[#cbd5e1] hover:bg-[#f1f5f9] dark:hover:bg-[#2b2b2b]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-sm bg-[#2563eb]" />
                )}
                <item.icon className={`h-[16px] w-[16px] shrink-0 ${isActive ? 'text-[#2563eb] dark:text-[#93c5fd]' : 'text-[#64748b] dark:text-[#999]'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-[#e2e8f0] dark:border-[#333] p-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="h-[32px] w-[32px] rounded-full bg-[#2563eb] flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
              {drawerUser.initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium text-[#1e293b] dark:text-white truncate">{drawerUser.name}</span>
              <span className="text-[11px] text-[#94a3b8] truncate">{drawerUser.district} District</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex w-full flex-col sm:pl-[252px]">
        <CustomerHeader onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 pb-[68px] sm:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom Mobile Tab Bar (Facebook App style) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 h-[56px] border-t border-[#e2e8f0] dark:border-[#333] bg-white dark:bg-[#1b1b1b] flex sm:hidden justify-around items-center px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] select-none">
        <Link 
          href="/customer" 
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${pathname === '/customer' ? 'text-[#2563eb] dark:text-[#93c5fd]' : 'text-[#64748b] dark:text-[#999]'}`}
        >
          <LayoutDashboard className="h-[20px] w-[20px]" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link 
          href="/customer/contacts" 
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${pathname.startsWith('/customer/contacts') ? 'text-[#2563eb] dark:text-[#93c5fd]' : 'text-[#64748b] dark:text-[#999]'}`}
        >
          <Users className="h-[20px] w-[20px]" />
          <span className="text-[10px] font-medium">Contacts</span>
        </Link>
        <Link 
          href="/customer/campaigns" 
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${pathname.startsWith('/customer/campaigns') ? 'text-[#2563eb] dark:text-[#93c5fd]' : 'text-[#64748b] dark:text-[#999]'}`}
        >
          <Megaphone className="h-[20px] w-[20px]" />
          <span className="text-[10px] font-medium">Campaigns</span>
        </Link>
        <Link 
          href="/customer/billing" 
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 ${pathname.startsWith('/customer/billing') ? 'text-[#2563eb] dark:text-[#93c5fd]' : 'text-[#64748b] dark:text-[#999]'}`}
        >
          <CreditCard className="h-[20px] w-[20px]" />
          <span className="text-[10px] font-medium">Billing</span>
        </Link>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[#64748b] dark:text-[#999]"
        >
          <Menu className="h-[20px] w-[20px]" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </div>
  );
}
