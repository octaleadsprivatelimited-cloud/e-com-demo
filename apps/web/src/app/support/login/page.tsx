"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy, Lock, Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supportApi } from "@/lib/api";
import { setSessionToken } from "@/lib/auth-api";

export default function SupportLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await supportApi.login(email.trim(), password);
      if (res.token) {
        setSessionToken(res.token);
        sessionStorage.setItem("poltica_support_session", JSON.stringify(res.agent));
        sessionStorage.setItem("poltica_support_start", String(Date.now()));
        router.replace("/support");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err: any) {
      setError(err?.status === 429 ? "Too many attempts. Wait a minute." : "Invalid email or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-[380px] bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="h-1 bg-primary w-full" />
        <div className="p-7 space-y-5">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <LifeBuoy className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Support Desk</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to assist customers and manage complaints.</p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border-l-4 border-destructive p-3 rounded-r text-xs text-destructive flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="agent@poltica.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="pl-9 h-11"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-9 h-11"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-11">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground text-center">
            Support agents have read-only, PII-masked access. Data export is disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
