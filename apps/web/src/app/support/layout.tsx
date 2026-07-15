"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LifeBuoy, Users, MessageSquareWarning, LogOut, Loader2 } from "lucide-react";
import { clearSession } from "@/lib/auth-api";
import { SessionTimeout } from "@/components/SessionTimeout";

const nav = [
  { name: "Complaints", href: "/support", icon: MessageSquareWarning },
  { name: "Customers", href: "/support/customers", icon: Users },
];

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [agent, setAgent] = useState<{ name: string; email: string } | null>(null);

  const isLogin = pathname === "/support/login";

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem("poltica_support_session");
      if (raw) {
        setAgent(JSON.parse(raw));
        setReady(true);
        return;
      }
    } catch {}
    router.replace("/support/login");
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const logout = () => {
    clearSession();
    sessionStorage.removeItem("poltica_support_session");
    sessionStorage.removeItem("poltica_support_start");
    router.replace("/support/login");
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <SessionTimeout
        idleMinutes={15}
        storageKey="poltica_support_start"
        onTimeout={logout}
      />
      {/* Sidebar */}
      <aside className="hidden sm:flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <LifeBuoy className="h-4.5 w-4.5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">Poltica Support</div>
            <div className="text-[10px] text-muted-foreground">Help Desk</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 px-1 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
              {(agent?.name || "S").slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{agent?.name || "Support Agent"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{agent?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
