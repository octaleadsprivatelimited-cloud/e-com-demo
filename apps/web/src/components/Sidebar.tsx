"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  Users, 
  Megaphone, 
  MessageSquare, 
  Settings, 
  UserCheck,
  BookTemplate,
  CreditCard
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: Activity },
  { name: "Candidates", href: "/admin/candidates", icon: UserCheck },
  { name: "Payments Received", href: "/admin/payments", icon: CreditCard },
  { name: "Voter Database", href: "/admin/voters", icon: Users },
  { name: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
  { name: "DLT Approvals", href: "/admin/templates", icon: BookTemplate },
  { name: "SMS/IVR Blasts", href: "/admin/blasts", icon: MessageSquare },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-[#18365d] bg-[#06254b] text-white sm:flex">
      <div className="flex h-[72px] items-center border-b border-white/10 px-6">
        <Link href="/admin" className="flex items-center gap-3 text-xl font-bold tracking-tight text-white">
          <Activity className="h-7 w-7 text-[#4f8cff]" />
          <span>Poltica</span>
        </Link>
      </div>
      <div className="px-6 pt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-blue-200/70">Platform admin</div>
      <nav className="flex-1 overflow-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
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
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://github.com/shadcn.png" alt="@admin" />
            <AvatarFallback>SA</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Super Admin</span>
            <span className="text-xs text-blue-200/65">admin@poltica.in</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
