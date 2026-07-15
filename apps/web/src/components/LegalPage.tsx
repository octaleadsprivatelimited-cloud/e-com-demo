import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

interface LegalPageProps {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for long-form legal documents (Terms, Privacy Policy).
 * Uses the app design tokens so it stays consistent with the rest of the site.
 */
export function LegalPage({ title, subtitle, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="glass sticky top-0 z-40 h-14 flex items-center px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-6 w-6 rounded-sm bg-primary flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-primary-foreground">P</span>
            </div>
            <span className="text-sm font-bold uppercase tracking-tight text-foreground">
              Poltica <span className="text-[10px] font-normal text-muted-foreground">Systems</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
        </div>
      </header>

      {/* Document */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-12">
          <div className="mb-8 border-b border-border pb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              Last updated: {lastUpdated} &middot; Operated by octaleads Private Limited
            </p>
          </div>

          {/* Not-legal-advice notice */}
          <div className="mb-8 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
              This document is a template provided for information only and is <strong>not legal
              advice</strong>. It must be reviewed and finalised by a qualified advocate licensed in
              India before it is relied upon. Placeholder fields shown in square brackets
              (e.g. <code>[…]</code>) must be completed with your actual details.
            </p>
          </div>

          <article className="legal-doc">{children}</article>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} octaleads Private Limited. All rights reserved.</span>
          <span className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
