"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * This page is no longer used — admin payment now happens inline on the signup page.
 * Redirect any direct visits back to /signup.
 */
export default function AdminPaymentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signup");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <p className="text-sm text-muted-foreground">Redirecting to signup…</p>
    </div>
  );
}
