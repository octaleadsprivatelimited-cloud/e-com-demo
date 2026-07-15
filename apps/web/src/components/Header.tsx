"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Bell, Menu } from "lucide-react";

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/60 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative hidden sm:flex items-center w-96">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search candidates, districts... (Press ⌘K)"
            className="w-full rounded-lg bg-card/50 pl-9 border-border/50 focus-visible:ring-1 focus-visible:ring-primary h-9"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" className="hidden sm:flex h-9">
          <Plus className="mr-2 h-4 w-4" />
          Quick Action
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>
      </div>
    </header>
  );
}
