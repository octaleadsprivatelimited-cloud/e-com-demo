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
  LifeBuoy,
  Activity
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
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] select-none flex-col border-r border-[#18365d] bg-[#06254b] text-white sm:flex">
      {/* Brand header */}
      <div className="flex h-[72px] items-center border-b border-white/10 px-6">
        <Link href="/customer" className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-[#4f8cff]" />
          <span className="text-xl font-bold tracking-tight text-white">Poltica</span>
        </Link>
      </div>

      <div className="px-6 pt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-blue-200/70">Campaign workspace</div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/customer" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-[#174b86] text-white'
                  : 'text-blue-100/80 hover:bg-white/8 hover:text-white'
              }`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-200/70'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#174b86] text-[11px] font-bold text-white">
            {getInitials(user.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm font-semibold text-white">{user.name}</span>
            <span className="truncate text-xs text-blue-200/65">{user.district} District</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
