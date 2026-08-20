"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Bell, Menu, ChevronDown } from "lucide-react";

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#e2e7ef] bg-white px-4 sm:px-7">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative hidden sm:flex items-center w-96">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search candidates, districts... (Press ⌘K)"
            className="h-10 w-full rounded-md border-[#d9e0ea] bg-white pl-9 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <div className="hidden items-center gap-3 border-l border-[#e2e7ef] pl-4 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#082b56] text-xs font-semibold text-white">SA</div>
          <div className="leading-tight"><div className="text-sm font-semibold text-[#0a1933]">Admin User</div><div className="text-xs text-[#68758b]">Platform Administrator</div></div>
          <ChevronDown className="h-4 w-4 text-[#68758b]" />
        </div>
      </div>
    </header>
  );
}
