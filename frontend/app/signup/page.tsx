"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckSquare, Loader2, ShieldCheck } from "lucide-react";

const ADMIN_FEATURES = [
  "Create and manage unlimited projects",
  "Full control over team roles & permissions",
  "AI-powered task creation and suggestions",
  "Smart deadline and priority management",
  "Real-time project tracking & dashboards",
  "Custom workflows for different projects",
  "Integration with tools (Git, Slack, etc.)",
  "Bulk task updates and management",
  "Secure data storage with backups",
  "Faster team productivity & delivery",
];

const ADMIN_SIGNUP_STORAGE_KEY = "pending-admin-signup";

function SignupPageContent() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"developer" | "admin">("developer");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [verifiedSignupToken, setVerifiedSignupToken] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const { requestSignupOtp, verifySignupOtp, completeVerifiedSignup, authenticateWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const prefetchedEmail = searchParams.get("email")?.trim() || "";
    const prefetchedVerificationToken = searchParams.get("verificationToken")?.trim() || "";
    const prefetchedRole = searchParams.get("role");

    if (prefetchedEmail && (!email || !!prefetchedVerificationToken)) {
      setEmail(prefetchedEmail);
    }

    if (
      prefetchedVerificationToken &&
      (prefetchedVerificationToken !== verifiedSignupToken || prefetchedEmail !== verifiedEmail)
    ) {
      setVerifiedSignupToken(prefetchedVerificationToken);
      setVerifiedEmail(prefetchedEmail);
      setOtpSent(false);
      setOtp("");
      setOtpEmail("");
    }

    if (prefetchedRole === "admin" || prefetchedRole === "developer") {
      setRole(prefetchedRole);
    }
  }, [searchParams, verifiedEmail, verifiedSignupToken]);

  useEffect(() => {
    if (role !== "developer") {
      setOtpSent(false);
      setOtp("");
      setOtpEmail("");
      setVerifiedSignupToken("");
      setVerifiedEmail("");
      return;
    }

    if (verifiedSignupToken && verifiedEmail && email !== verifiedEmail) {
      setVerifiedSignupToken("");
      setVerifiedEmail("");
    }

    if (otpSent && otpEmail && email !== otpEmail) {
      setOtpSent(false);
      setOtp("");
      setOtpEmail("");
    }
  }, [email, otpEmail, otpSent, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      if (role === "developer") {
        if (verifiedSignupToken) {
          await completeVerifiedSignup({
            email,
            password,
            firstName,
            lastName,
            verificationToken: verifiedSignupToken,
          });
          toast.success("Developer account created successfully!");
          router.push("/dashboard");
        } else if (!otpSent) {
          await requestSignupOtp(email);
          setOtpSent(true);
          setOtpEmail(email);
          toast.success("OTP sent to your email.");
        } else {
          if (otp.trim().length !== 6) {
            toast.error("Enter the 6-digit OTP sent to your email.");
            return;
          }

          await verifySignupOtp({ email, password, firstName, lastName, otp: otp.trim() });
          toast.success("Developer account created successfully!");
          router.push("/dashboard");
        }
      } else {
        sessionStorage.setItem(
          ADMIN_SIGNUP_STORAGE_KEY,
          JSON.stringify({ email, password, firstName, lastName })
        );
        toast.success("Continue to payment to unlock admin access.");
        router.push("/signup/admin-payment");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create account";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = useCallback(
    async (credential: string) => {
      try {
        await authenticateWithGoogle(credential);
        toast.success("Signed in with Google.");
        router.push("/dashboard");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Google sign-in failed";
        toast.error(message);
      }
    },
    [authenticateWithGoogle, router]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <CheckSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Join TaskFlow to start managing your projects</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="role">Account Type</FieldLabel>
              <Select value={role} onValueChange={(value) => setRole(value as "developer" | "admin")}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </Field>
            {role === "developer" && otpSent && (
              <Field>
                <FieldLabel htmlFor="otp">Email OTP</FieldLabel>
                <Input
                  id="otp"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </Field>
            )}
            {role === "developer" && verifiedSignupToken && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-900">
                Email <span className="font-semibold">{email}</span> is already verified. Finish your
                account details below and create your account.
              </div>
            )}
            {role === "admin" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <p className="font-semibold text-foreground">Admin Access Features</p>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {ADMIN_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {role === "admin"
                ? "Continue to Payment"
                : verifiedSignupToken
                  ? "Create Account"
                  : otpSent
                  ? "Verify OTP & Create Account"
                  : "Send OTP"}
            </Button>
            {role === "developer" && otpSent && !verifiedSignupToken && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoading}
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    await requestSignupOtp(email);
                    setOtpEmail(email);
                    toast.success("A new OTP has been sent.");
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : "Failed to resend OTP";
                    toast.error(message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Resend OTP
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
            <div className="flex w-full items-center gap-3 text-sm text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <GoogleAuthButton onCredential={handleGoogleAuth} text="continue_with" />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" />}>
      <SignupPageContent />
    </Suspense>
  );
}
