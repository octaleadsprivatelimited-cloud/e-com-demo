"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Menu, ShieldAlert, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SessionTimeout } from "@/components/SessionTimeout";
import { 
  Activity, 
  Users, 
  Megaphone, 
  MessageSquare, 
  Settings, 
  UserCheck,
  BookTemplate
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/admin", icon: Activity },
  { name: "Candidates", href: "/admin/candidates", icon: UserCheck },
  { name: "Voter Database", href: "/admin/voters", icon: Users },
  { name: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
  { name: "DLT Approvals", href: "/admin/templates", icon: BookTemplate },
  { name: "SMS/IVR Blasts", href: "/admin/blasts", icon: MessageSquare },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

// Admin authentication is verified SERVER-SIDE (see /api/admin/verify-pin).
// The PIN is never shipped to the browser. This remains a shared-PIN gate;
// replace with proper JWT/session + role auth once admin data is server-side.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Admin authentication gate
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check if admin session exists
    const adminSession = sessionStorage.getItem("poltica_admin_session");
    if (adminSession === "authenticated") {
      setIsAdminAuthed(true);
    }
    setIsCheckingAuth(false);
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    setIsVerifying(true);
    try {
      // Verify the PIN server-side and receive an admin JWT so the admin panel
      // can call the same protected backend API.
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) sessionStorage.setItem("poltica_session_token", data.token);
        sessionStorage.setItem("poltica_admin_session", "authenticated");
        setIsAdminAuthed(true);
      } else if (res.status === 429) {
        setPinError("Too many attempts. Please wait a minute and try again.");
      } else {
        setPinError("Invalid admin PIN. Access denied.");
      }
    } catch {
      setPinError("Unable to reach the authentication server. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin gate — require PIN before rendering admin panel
  if (!isAdminAuthed) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-center items-center p-6 bg-background/50">
        <div className="w-full max-w-[400px] bg-card border border-border/50 shadow-lg rounded-lg overflow-hidden">
          <div className="h-[3px] bg-primary w-full" />
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Admin Access Required</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the administrator PIN to access the Poltica control panel.
                </p>
              </div>
            </div>

            {pinError && (
              <div className="bg-destructive/10 border-l-4 border-destructive p-3 rounded-r text-xs text-destructive flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-3">
              <Input
                type="password"
                placeholder="Enter 6-digit admin PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={6}
                required
                autoFocus
                className="text-center tracking-[6px] font-semibold text-lg h-11"
              />
              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" /> Authenticate</>
                )}
              </Button>
            </form>

            <p className="text-[10px] text-muted-foreground text-center">
              This area is restricted to authorized platform administrators only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background/50">
      {/* Auto-logout: admin sessions expire faster (10 min idle) */}
      <SessionTimeout
        idleMinutes={10}
        absoluteHours={4}
        storageKey="poltica_admin_session_start"
        onTimeout={() => {
          sessionStorage.removeItem("poltica_admin_session");
          sessionStorage.removeItem("poltica_admin_session_start");
          setIsAdminAuthed(false);
        }}
      />
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar />

      {/* Mobile Drawer Backdrop overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer (slides in from left) */}
      <div className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border/50 bg-card p-4 transition-transform duration-300 sm:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-2">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              P
            </div>
            Poltica Admin
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-auto py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
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
      </div>

      {/* Main content wrapper */}
      <div className="flex w-full flex-col sm:pl-[252px]">
        {/* Pass toggle function to Header */}
        <Header onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
