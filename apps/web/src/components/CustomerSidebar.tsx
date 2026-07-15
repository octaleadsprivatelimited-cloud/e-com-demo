"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  MessageSquare, 
  MessageCircle,
  PhoneCall, 
  CreditCard, 
  Settings,
  Globe,
  Receipt,
  FileText,
  LifeBuoy
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
  { name: "Help & Support", href: "/customer/support", icon: LifeBuoy },
  { name: "Settings", href: "/customer/settings", icon: Settings },
];

export function CustomerSidebar() {
  const pathname = usePathname();
  const [user, setUser] = React.useState({ name: "Rahul Sharma", district: "Pune" });

  const loadUserFromStorage = React.useCallback(() => {
    const sessionUser = localStorage.getItem("currentCustomerUser");
    if (sessionUser) {
      try {
        const parsed = JSON.parse(sessionUser);
        if (parsed.name) {
          setUser({ name: parsed.name, district: parsed.district || "Candidate" });
        }
      } catch (e) {}
    }
  }, []);

  React.useEffect(() => {
    loadUserFromStorage();

    window.addEventListener("storage", loadUserFromStorage);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadUserFromStorage();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const pollInterval = setInterval(loadUserFromStorage, 2000);

    return () => {
      window.removeEventListener("storage", loadUserFromStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(pollInterval);
    };
  }, [loadUserFromStorage]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[225px] flex-col bg-white dark:bg-black text-[#515154] dark:text-[#64748b] border-r border-[#e2e8f0] dark:border-[#0f172a] sm:flex select-none">
      {/* Brand header */}
      <div className="flex h-[56px] items-center px-5 border-b border-[#e2e8f0] dark:border-[#0f172a]">
        <Link href="/customer" className="flex items-center gap-3">
          <div className="h-[28px] w-[28px] rounded-md bg-black dark:bg-white flex items-center justify-center shadow-sm">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" fill="currentColor" className="text-white dark:text-black" />
              <rect x="9" y="1" width="6" height="6" fill="currentColor" className="text-white dark:text-black" opacity="0.8" />
              <rect x="1" y="9" width="6" height="6" fill="currentColor" className="text-white dark:text-black" opacity="0.8" />
              <rect x="9" y="9" width="6" height="6" fill="currentColor" className="text-white dark:text-black" opacity="0.5" />
            </svg>
          </div>
          <span className="font-bold text-sm text-black dark:text-white tracking-tight">Poltica</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/customer" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium tracking-normal transition-all relative ${
                isActive 
                  ? 'bg-[#f1f5f9] dark:bg-[#0f172a] text-black dark:text-white font-semibold' 
                  : 'hover:bg-[#f1f5f9]/50 dark:hover:bg-[#0f172a]/50 hover:text-black dark:hover:text-white'
              }`}
            >
              <item.icon className={`h-[16px] w-[16px] shrink-0 transition-colors ${isActive ? 'text-black dark:text-white' : 'text-[#64748b]'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Switch Link */}
      <div className="px-4 py-3 border-t border-[#e2e8f0] dark:border-[#0f172a] bg-white dark:bg-black">
        <Link 
          href="/admin" 
          className="flex items-center justify-center gap-2 rounded-lg border border-[#d2d2d7] dark:border-[#333] px-3 py-2 text-[10px] font-bold text-black dark:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#0f172a] transition-all w-full select-none"
        >
          Switch to Admin Portal
        </Link>
      </div>

      {/* Footer Profile */}
      <div className="border-t border-[#e2e8f0] dark:border-[#0f172a] p-4 bg-[#f1f5f9]/40 dark:bg-[#1c1c1e]/40">
        <div className="flex items-center gap-3">
          <div className="h-[32px] w-[32px] rounded-full bg-black dark:bg-white flex items-center justify-center text-[10px] font-bold text-white dark:text-black shrink-0 shadow-sm">
            {getInitials(user.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-black dark:text-white truncate">{user.name}</span>
            <span className="text-[10px] text-[#64748b] truncate">{user.district} District</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
