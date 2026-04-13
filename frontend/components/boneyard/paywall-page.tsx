"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PaywallPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border bg-card p-6 shadow-lg sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <Badge variant="secondary" className="mb-2 rounded-full px-2 py-0.5">
              Protected access
            </Badge>
            <h1 className="text-2xl font-semibold">This page is locked</h1>
          </div>
        </div>

        <p className="max-w-prose text-sm text-muted-foreground sm:text-base">
          Your payment or access level does not unlock this area yet. Finish verification to continue, or
          return to the public app.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="gap-2">
            <Link href="/signup/admin-payment">
              <Sparkles className="h-4 w-4" />
              Unlock access
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
