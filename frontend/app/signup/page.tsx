"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useAuth } from "@/lib/auth-context";
import { decodeGoogleSignupProfile, type GoogleSignupProfile } from "@/lib/google-signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, CheckSquare, Loader2, ShieldCheck } from "lucide-react";

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
  const [pendingGoogleSignup, setPendingGoogleSignup] = useState<GoogleSignupProfile | null>(null);
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

  const handleGoogleAuth = useCallback(async (credential: string) => {
    const profile = decodeGoogleSignupProfile(credential);

    if (!profile) {
      toast.error("Google did not return a valid account profile.");
      return;
    }

    setPendingGoogleSignup(profile);
  }, []);

  const completeGoogleDeveloperSignup = useCallback(async () => {
    if (!pendingGoogleSignup) {
      toast.error("Google signup details are missing.");
      return;
    }

    try {
      await authenticateWithGoogle(pendingGoogleSignup.credential);
      toast.success("Signed in with Google.");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      toast.error(message);
    }
  }, [authenticateWithGoogle, pendingGoogleSignup, router]);

  const continueGoogleAdminSignup = useCallback(() => {
    if (!pendingGoogleSignup) {
      toast.error("Google signup details are missing.");
      return;
    }

    sessionStorage.setItem(
      ADMIN_SIGNUP_STORAGE_KEY,
      JSON.stringify({
        email: pendingGoogleSignup.email,
        password: "",
        firstName: pendingGoogleSignup.firstName,
        lastName: pendingGoogleSignup.lastName,
        googleCredential: pendingGoogleSignup.credential,
      })
    );

    toast.success("Continue to payment to unlock admin access.");
    router.push(`/signup/admin-payment?email=${encodeURIComponent(pendingGoogleSignup.email)}`);
  }, [pendingGoogleSignup, router]);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <CheckSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>Join Tickzen to start managing your projects</CardDescription>
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
      {pendingGoogleSignup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(38,34,33,0.22)] px-4 backdrop-blur-md">
          <div className="w-full max-w-5xl rounded-[2.75rem] border border-white/50 bg-[#f5f0ed]/95 p-6 shadow-[0_30px_90px_rgba(63,54,50,0.2)] sm:p-8">
            <div className="mb-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b8f88]">Google account ready</p>
              <h2 className="mt-2 text-[clamp(1.8rem,2.8vw,2.8rem)] font-bold text-[#4a4545]">Choose your access</h2>
              <p className="mt-2 text-base text-[#6a6464]">
                Continue with {pendingGoogleSignup.email} as a developer workspace or unlock the admin plan.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[2.25rem] bg-[#d8d3d3] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="mb-4 inline-flex rounded-full bg-[#ece8e8] px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#5d5858]">Developer</div>
                <h3 className="text-3xl font-bold text-[#3f3b3b]">Build with your team</h3>
                <ul className="mt-5 space-y-2 text-sm text-[#494444]">
                  <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2c7a4b]" /><span>Google email is carried into signup</span></li>
                </ul>
                <Button type="button" onClick={completeGoogleDeveloperSignup} className="mt-6 h-auto rounded-full bg-[#1b7fe8] px-8 py-3 text-base font-medium text-white shadow-none hover:bg-[#166fd0]">Continue as Developer</Button>
              </div>
              <div className="rounded-[2.25rem] bg-[#b9b2b2] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                <div className="mb-4 inline-flex rounded-full bg-white/20 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white">Admin plan</div>
                <h3 className="text-3xl font-bold">Admin access with payment</h3>
                <div className="mt-5 rounded-[1.75rem] bg-white/18 p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-white/75">Plan amount</p>
                  <p className="mt-2 text-4xl font-black">₹499</p>
                </div>
                <Button type="button" onClick={continueGoogleAdminSignup} className="mt-6 h-auto rounded-full bg-white px-8 py-3 text-base font-medium text-[#4d4747] shadow-none hover:bg-[#f1eded]">Continue as Admin</Button>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <button type="button" className="text-sm text-[#666] underline-offset-4 hover:underline" onClick={() => setPendingGoogleSignup(null)}>
                Use a different Google account
              </button>
            </div>
          </div>
        </div>
      )}
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
