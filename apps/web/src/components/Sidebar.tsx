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
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl sm:flex">
      <div className="flex h-16 items-center border-b border-border/50 px-6">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            P
          </div>
          Poltica Admin
        </Link>
      </div>
      <nav className="flex-1 overflow-auto py-4 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-2 border-t border-border/50">
        <Link 
          href="/customer" 
          className="flex items-center justify-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors w-full select-none"
        >
          View Candidate Portal
        </Link>
      </div>
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://github.com/shadcn.png" alt="@admin" />
            <AvatarFallback>SA</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Super Admin</span>
            <span className="text-xs text-muted-foreground">admin@poltica.in</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
