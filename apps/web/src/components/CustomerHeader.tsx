"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Search, Bell, Menu, CreditCard, Settings, HelpCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { clearSession } from "@/lib/auth-api";

export function CustomerHeader({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const [initials, setInitials] = React.useState("RS");
  const [candidateName, setCandidateName] = React.useState("Rahul Sharma");
  const [candidateMobile, setCandidateMobile] = React.useState("9876543210");
  const [helpOpen, setHelpOpen] = React.useState(false);

  const [notifications, setNotifications] = React.useState([
    { id: 1, text: "Payment for 50,000 IVR credits verified.", time: "10 mins ago", read: false },
    { id: 2, text: "SMS Blast 'Rally Invite' completed successfully.", time: "2 hours ago", read: false },
    { id: 3, text: "Welcome to Poltica Systems platform!", time: "1 day ago", read: true }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  React.useEffect(() => {
    const sessionUser = localStorage.getItem("currentCustomerUser");
    if (sessionUser) {
      try {
        const parsed = JSON.parse(sessionUser);
        if (parsed.name) {
          setCandidateName(parsed.name);
          const init = parsed.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
          setInitials(init);
        }
        if (parsed.mobile) {
          setCandidateMobile(parsed.mobile);
        }
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    clearSession();
    window.location.href = "/";
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[56px] items-center justify-between border-b border-[#e2e8f0] dark:border-[#0f172a] bg-white/80 dark:bg-black/85 backdrop-blur-md px-5 select-none">
        {/* Left section */}
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8 text-zinc-800 dark:text-zinc-200 hover:bg-[#f1f5f9] dark:hover:bg-[#0f172a]" onClick={onMenuToggle}>
            <Menu className="h-4.5 w-4.5" />
          </Button>
          
          {/* Mobile title */}
          <span className="text-base font-bold tracking-tight text-black dark:text-white sm:hidden select-none">
            Poltica
          </span>
          
          {/* Breadcrumb-style title */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium tracking-normal text-zinc-550 dark:text-zinc-400">
            <span className="text-black dark:text-white font-semibold">Poltica</span>
            <span className="text-zinc-300 dark:text-zinc-850">/</span>
            <span className="text-zinc-500 dark:text-zinc-450">Candidate Workspace</span>
          </div>
        </div>
        
        {/* Center search */}
        <div className="relative hidden md:flex items-center w-full max-w-[360px] mx-6">
          <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="search"
            placeholder="Search campaign features..."
            className="w-full rounded-lg bg-[#f1f5f9] dark:bg-[#0f172a] pl-9 pr-4 py-1.5 text-xs text-black dark:text-white placeholder-zinc-400 border border-transparent outline-none focus:bg-white dark:focus:bg-[#0f172a] focus:border-zinc-300 dark:focus:border-zinc-850 h-[34px] transition-all"
          />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1.5">
          <Link href="/customer/billing">
            <Button variant="ghost" size="sm" className="hidden sm:flex h-8.5 text-xs font-medium text-black dark:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#0f172a] gap-1.5 rounded-lg border border-[#d2d2d7] dark:border-[#333]">
              <CreditCard className="h-3.5 w-3.5 text-black dark:text-white" />
              Credits Balance
            </Button>
          </Link>
          
          {/* Help Support Action */}
          <Button onClick={() => setHelpOpen(true)} variant="ghost" size="icon" className="hidden sm:inline-flex h-8 w-8 text-[#64748b] dark:text-[#999] hover:bg-[#f1f5f9] dark:hover:bg-[#2b2b2b]">
            <HelpCircle className="h-4 w-4" />
          </Button>
          
          {/* Settings Config Action */}
          <Link href="/customer/settings" className="hidden sm:block">
            <Button variant="ghost" size="icon" className="relative h-8 w-8 text-[#64748b] dark:text-[#999] hover:bg-[#f1f5f9] dark:hover:bg-[#2b2b2b]">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          
          {/* Notifications Action Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="relative h-8 w-8 text-[#64748b] dark:text-[#999] hover:bg-[#f1f5f9] dark:hover:bg-[#2b2b2b] flex items-center justify-center rounded-sm outline-none cursor-pointer">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#D13438] ring-1 ring-white" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px] p-2 bg-white dark:bg-[#1b1b1b] border border-[#e2e8f0] dark:border-[#333] shadow-lg rounded-md">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#e2e8f0] dark:border-[#333] mb-1">
                <span className="text-[12px] font-semibold text-[#1e293b] dark:text-white uppercase tracking-wider">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-[#1877f2] hover:underline font-medium">Mark all read</button>
                )}
              </div>
              <div className="space-y-1 max-h-[250px] overflow-y-auto">
                {notifications.map(n => (
                  <DropdownMenuItem key={n.id} className={`flex flex-col items-start gap-1 p-2 rounded-sm text-[11px] leading-snug cursor-pointer transition-colors ${n.read ? 'opacity-70' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}>
                    <div className="text-[#1e293b] dark:text-zinc-200">{n.text}</div>
                    <div className="text-[9px] text-[#94a3b8]">{n.time}</div>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-2 pl-2 border-l border-[#e2e8f0] dark:border-[#333] cursor-pointer flex items-center justify-center outline-none">
              <Avatar className="h-7 w-7">
                <AvatarImage src="https://github.com/shadcn.png" alt="@candidate" />
                <AvatarFallback className="bg-[#1877f2] text-white text-[10px]">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px] p-1 bg-white dark:bg-[#1b1b1b] border border-[#e2e8f0] dark:border-[#333] shadow-lg rounded-md">
              <div className="px-2 py-1.5">
                <p className="text-[12px] font-semibold text-[#1e293b] dark:text-white truncate">{candidateName}</p>
                <p className="text-[10px] text-[#94a3b8] truncate">{candidateMobile}</p>
              </div>
              <DropdownMenuSeparator className="bg-[#e2e8f0] dark:bg-[#333]" />
              <Link href="/customer/settings" className="block w-full">
                <DropdownMenuItem className="focus:bg-[#f1f5f9] dark:focus:bg-[#2b2b2b] flex w-full items-center gap-2 px-2 py-1 text-[11px] text-[#1e293b] dark:text-zinc-200 cursor-pointer">
                  <Settings className="h-3.5 w-3.5 text-[#64748b] shrink-0" />
                  Settings Configuration
                </DropdownMenuItem>
              </Link>
              <Link href="/customer/billing" className="block w-full">
                <DropdownMenuItem className="focus:bg-[#f1f5f9] dark:focus:bg-[#2b2b2b] flex w-full items-center gap-2 px-2 py-1 text-[11px] text-[#1e293b] dark:text-zinc-200 cursor-pointer">
                  <CreditCard className="h-3.5 w-3.5 text-[#64748b] shrink-0" />
                  Credits & Transactions
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-[#e2e8f0] dark:bg-[#333]" />
              <DropdownMenuItem onClick={handleLogout} className="focus:bg-[#fef2f2] dark:focus:bg-[#801b20]/20 text-[#dc2626] dark:text-[#fef2f2] cursor-pointer flex w-full items-center gap-2 px-2 py-1 text-[11px]">
                <span className="font-semibold">Sign Out Account</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Help Support Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-[400px] bg-white dark:bg-[#1b1b1b] border border-[#e2e8f0] dark:border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-[#1e293b] dark:text-white">Customer Support Helpline</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Get assistance with SMS quota, WhatsApp templates, and IVR campaigns.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 font-sans text-xs text-[#1e293b] dark:text-zinc-200">
            <div className="flex justify-between items-center p-2.5 rounded bg-muted/40">
              <span className="font-semibold text-muted-foreground">Support Brand:</span>
              <span className="text-[#1877f2] font-semibold">Poltica Systems</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded bg-muted/40">
              <span className="font-semibold text-muted-foreground">Registered Entity:</span>
              <span className="text-[#1e293b] dark:text-white font-medium">octaleads Private Limited</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded bg-muted/40">
              <span className="font-semibold text-muted-foreground">Direct Email Support:</span>
              <span className="text-[#1877f2] hover:underline cursor-pointer font-medium">support@octaleads.in</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded bg-muted/40">
              <span className="font-semibold text-muted-foreground">Direct Call Helpline:</span>
              <span className="font-medium">+91 98765 43210</span>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="w-full bg-[#1877f2] text-white hover:bg-[#1565c0] text-xs h-8" onClick={() => setHelpOpen(false)}>
              Got it, thank you
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
