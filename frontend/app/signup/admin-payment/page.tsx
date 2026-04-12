"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";

import { apiRequest, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const ADMIN_SIGNUP_STORAGE_KEY = "pending-admin-signup";
const ADMIN_PLAN_AMOUNT = 499;

interface PendingSignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  googleCredential?: string;
}

interface AdminOrderResponse {
  keyId: string;
  amount: number;
  currency: string;
  order: {
    id: string;
  };
}

interface VerifyAdminPaymentResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin";
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => void;
      modal?: {
        ondismiss?: () => void;
      };
      prefill?: {
        name?: string;
        email?: string;
      };
      theme?: {
        color?: string;
      };
    }) => {
      open: () => void;
    };
  }
}

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

function AdminPaymentPageContent() {
  const [pendingSignup, setPendingSignup] = useState<PendingSignupData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawValue = sessionStorage.getItem(ADMIN_SIGNUP_STORAGE_KEY);
    const prefetchedEmail = searchParams.get("email")?.trim() || "";

    if (!rawValue && prefetchedEmail) {
      const bootstrapData = {
        email: prefetchedEmail,
        firstName: "",
        lastName: "",
        password: "",
        googleCredential: "",
      };
      sessionStorage.setItem(ADMIN_SIGNUP_STORAGE_KEY, JSON.stringify(bootstrapData));
      setPendingSignup(bootstrapData);
      return;
    }

    if (!rawValue) {
      toast.error("Start from the signup flow before completing admin payment.");
      router.replace("/signup");
      return;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as PendingSignupData;
      setPendingSignup(parsedValue);
    } catch {
      sessionStorage.removeItem(ADMIN_SIGNUP_STORAGE_KEY);
      toast.error("Your admin signup session expired. Please fill the form again.");
      router.replace("/signup");
    }
  }, [router, searchParams]);

  const handlePayment = async () => {
    if (!pendingSignup) {
      toast.error("Admin signup details are missing.");
      return;
    }

    if (!pendingSignup.firstName.trim() || !pendingSignup.lastName.trim()) {
      toast.error("Enter your first and last name before continuing.");
      return;
    }

    if (!pendingSignup.googleCredential && pendingSignup.password.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout failed to load.");
      }

      const orderResponse = await apiRequest<AdminOrderResponse>("/auth/signup/admin/order", {
        method: "POST",
        body: JSON.stringify({
          name: `${pendingSignup.firstName} ${pendingSignup.lastName}`.trim(),
          email: pendingSignup.email,
        }),
        auth: false,
      });

      const razorpay = new window.Razorpay({
        key: orderResponse.keyId,
        amount: orderResponse.order ? orderResponse.amount * 100 : ADMIN_PLAN_AMOUNT * 100,
        currency: orderResponse.currency,
        name: "Tickzen Admin",
        description: "Admin access activation",
        order_id: orderResponse.order.id,
        prefill: {
          name: `${pendingSignup.firstName} ${pendingSignup.lastName}`.trim(),
          email: pendingSignup.email,
        },
        theme: {
          color: "#8b5e3c",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
        handler: async (response) => {
          try {
            const verifiedSignup = await apiRequest<VerifyAdminPaymentResponse>("/auth/signup/admin/verify-payment", {
              method: "POST",
              body: JSON.stringify({
                name: `${pendingSignup.firstName} ${pendingSignup.lastName}`.trim(),
                email: pendingSignup.email,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                password: pendingSignup.googleCredential ? undefined : pendingSignup.password,
                googleCredential: pendingSignup.googleCredential || undefined,
              }),
              auth: false,
            });

            setToken(verifiedSignup.token);
            localStorage.setItem(
              "auth-session",
              JSON.stringify({
                token: verifiedSignup.token,
                user: {
                  id: verifiedSignup.user.id,
                  email: verifiedSignup.user.email,
                  firstName: verifiedSignup.user.name.split(" ")[0] || "User",
                  lastName: verifiedSignup.user.name.split(" ").slice(1).join(" "),
                  role: verifiedSignup.user.role,
                },
              })
            );
            localStorage.setItem(
              "user",
              JSON.stringify({
                id: verifiedSignup.user.id,
                email: verifiedSignup.user.email,
                firstName: verifiedSignup.user.name.split(" ")[0] || "User",
                lastName: verifiedSignup.user.name.split(" ").slice(1).join(" "),
                role: verifiedSignup.user.role,
              })
            );
            sessionStorage.removeItem(ADMIN_SIGNUP_STORAGE_KEY);
            toast.success("Payment complete. Your admin account is ready.");
            router.push("/dashboard");
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Payment verified, but admin creation failed.";
            toast.error(message);
          } finally {
            setIsLoading(false);
          }
        },
      });

      razorpay.open();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start Razorpay checkout";
      toast.error(message);
      setIsLoading(false);
    }
  };

  if (!pendingSignup) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle showLabel />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Complete Admin Payment</CardTitle>
          <CardDescription>
            Finish the payment below to activate admin access for {pendingSignup.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="adminFirstName">First Name</FieldLabel>
                <Input
                  id="adminFirstName"
                  value={pendingSignup.firstName}
                  onChange={(event) => {
                    const nextValue = { ...pendingSignup, firstName: event.target.value };
                    setPendingSignup(nextValue);
                    sessionStorage.setItem(ADMIN_SIGNUP_STORAGE_KEY, JSON.stringify(nextValue));
                  }}
                  placeholder="John"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="adminLastName">Last Name</FieldLabel>
                <Input
                  id="adminLastName"
                  value={pendingSignup.lastName}
                  onChange={(event) => {
                    const nextValue = { ...pendingSignup, lastName: event.target.value };
                    setPendingSignup(nextValue);
                    sessionStorage.setItem(ADMIN_SIGNUP_STORAGE_KEY, JSON.stringify(nextValue));
                  }}
                  placeholder="Doe"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="adminEmail">Email</FieldLabel>
              <Input
                id="adminEmail"
                type="email"
                value={pendingSignup.email}
                onChange={(event) => {
                  const nextValue = { ...pendingSignup, email: event.target.value };
                  setPendingSignup(nextValue);
                  sessionStorage.setItem(ADMIN_SIGNUP_STORAGE_KEY, JSON.stringify(nextValue));
                }}
                placeholder="you@example.com"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="adminPassword">Password</FieldLabel>
              <Input
                id="adminPassword"
                type="password"
                value={pendingSignup.password}
                disabled={Boolean(pendingSignup.googleCredential)}
                onChange={(event) => {
                  const nextValue = { ...pendingSignup, password: event.target.value };
                  setPendingSignup(nextValue);
                  sessionStorage.setItem(ADMIN_SIGNUP_STORAGE_KEY, JSON.stringify(nextValue));
                }}
                placeholder={pendingSignup.googleCredential ? "Generated from Google signup" : "Create a password"}
              />
            </Field>
            {pendingSignup.googleCredential && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-900">
                Google signup detected. We will create your admin account using your Google identity after payment.
              </div>
            )}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Admin plan</span>
                <span className="font-medium">Tickzen Admin</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-semibold">Rs. {ADMIN_PLAN_AMOUNT}</p>
                  <p className="text-sm text-muted-foreground">One-time activation payment</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
              Razorpay test mode will open in a secure popup. Use your test key setup and any Razorpay
              test payment method to complete admin activation for <span className="font-medium text-foreground">{pendingSignup.email}</span>.
            </div>
        </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="button" className="w-full" disabled={isLoading} onClick={handlePayment}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay Rs. {ADMIN_PLAN_AMOUNT} and Create Admin Account
            </Button>
            <p className="text-sm text-muted-foreground">
              Need to change account type?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Go back to signup
              </Link>
            </p>
          </CardFooter>
      </Card>
    </div>
  );
}

export default function AdminPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" />}>
      <AdminPaymentPageContent />
    </Suspense>
  );
}
