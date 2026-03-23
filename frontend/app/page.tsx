"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { CSSProperties, FormEvent, useEffect, useState } from "react";
import { ArrowRight, ChevronRight, Loader2, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const heroFeatures = [
  "Create & manage unlimited projects",
  "Full control over team roles & permissions",
  "AI-powered task creation",
  "Real-time tracking & dashboards",
  "Custom workflows for every project",
  "Secure storage with backups",
  "Boost team productivity & delivery",
];

const premiumFeatures = [
  "Unlock all Tickzen features",
  "Create & host projects",
  "Advanced AI & analytics tools",
  "Boost team productivity",
];

const introParticles = [
  { left: "74%", top: "16%", size: 14, dx: -160, dy: -70, delay: "0.05s" },
  { left: "78%", top: "20%", size: 10, dx: -120, dy: 42, delay: "0.12s" },
  { left: "82%", top: "17%", size: 18, dx: -42, dy: -110, delay: "0.18s" },
  { left: "84%", top: "21%", size: 12, dx: 76, dy: -28, delay: "0.1s" },
  { left: "80%", top: "24%", size: 16, dx: 58, dy: 88, delay: "0.16s" },
  { left: "76%", top: "24%", size: 8, dx: -90, dy: 96, delay: "0.22s" },
  { left: "79%", top: "19%", size: 22, dx: -16, dy: 130, delay: "0.08s" },
];

export default function HomePage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [introStage, setIntroStage] = useState<"loading" | "strike" | "ready">("loading");

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (isLoading || user) return;

    const loadingTimer = window.setTimeout(() => setIntroStage("strike"), 950);
    const revealTimer = window.setTimeout(() => setIntroStage("ready"), 2050);

    return () => {
      window.clearTimeout(loadingTimer);
      window.clearTimeout(revealTimer);
    };
  }, [isLoading, user]);

  const handleSignupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
    router.push(`/signup${query}`);
  };

  const handleSigninSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid email or password";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#f4efed_0%,#fbfaf9_46%,#ffffff_100%)] px-4 py-4 text-[#2f2f30] sm:px-6 lg:px-8">
      <div className="landing-stage mx-auto max-w-[1400px]">
        {introStage !== "ready" && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div
              className={`absolute inset-0 bg-[radial-gradient(circle_at_top,#f0e9e4_0%,rgba(250,248,247,0.92)_48%,rgba(255,255,255,0.76)_100%)] transition-opacity duration-500 ${
                introStage === "loading" ? "opacity-100" : "opacity-0"
              }`}
            />

            {introStage === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-[#7d706b]">
                <div className="landing-loader-ring flex h-20 w-20 items-center justify-center rounded-full border border-[#dfd3cb] bg-white/70">
                  <Loader2 className="h-8 w-8 animate-spin text-[#b59f92]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#a69388]">
                    Loading Tickzen
                  </p>
                  <p className="mt-2 text-base text-[#7b716b]">
                    Preparing your AI workspace experience
                  </p>
                </div>
              </div>
            )}

            {introStage === "strike" && (
              <>
                <div className="landing-strike absolute right-[8%] top-[10.5rem] hidden h-[10px] w-[260px] rounded-full bg-[linear-gradient(90deg,rgba(189,155,132,0),rgba(194,160,140,0.92),rgba(233,214,201,0.98),rgba(189,155,132,0))] shadow-[0_0_32px_rgba(198,166,145,0.9)] lg:block" />
                <div className="landing-flash absolute right-[12%] top-[11.2rem] hidden h-24 w-24 rounded-full bg-[#ead8c9]/80 blur-2xl lg:block" />
                {introParticles.map((particle, index) => (
                  <span
                    key={`${particle.left}-${particle.top}-${index}`}
                    className="landing-particle absolute rounded-full bg-[#ccb0a1] opacity-0 shadow-[0_0_18px_rgba(204,176,161,0.9)]"
                    style={
                      {
                        left: particle.left,
                        top: particle.top,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        "--dx": `${particle.dx}px`,
                        "--dy": `${particle.dy}px`,
                        animationDelay: particle.delay,
                      } as CSSProperties
                    }
                  />
                ))}
              </>
            )}
          </div>
        )}

        <div
          className={`mx-auto flex w-full flex-col gap-4 transition-all duration-700 xl:gap-5 ${
            introStage === "ready"
              ? "opacity-100 blur-0"
              : "opacity-20 blur-[2px] saturate-75"
          }`}
        >
        <header className="landing-card landing-card-1 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav className="mx-auto w-full max-w-[920px] rounded-full bg-[#d9d7d5] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] lg:mx-0">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["Dashboards", "Features", "Solutions", "Guide"].map((item) => (
                <a
                  key={item}
                  href={item === "Features" ? "#features" : item === "Solutions" ? "#premium" : "#"}
                  className="rounded-full bg-[#bebcba] px-6 py-2 text-sm font-medium text-[#303030] transition hover:bg-[#b3b1af] sm:px-8 sm:text-base"
                >
                  {item}
                </a>
              ))}
            </div>
          </nav>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr_0.7fr] xl:items-start">
          <div className="landing-card landing-card-2 xl:col-span-2">
            <section className="max-w-[920px] rounded-[2rem] bg-[#e8e0e0]/95 px-8 py-5 shadow-[0_16px_45px_rgba(90,84,84,0.08)] sm:px-10">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#8a8383]">
                <Sparkles className="h-4 w-4" />
                AI Project Workspace
              </div>
              <h1 className="text-[clamp(2rem,3.35vw,3.3rem)] font-black leading-[0.95] tracking-[-0.05em] text-[#6c6868]">
                Tickzen
                <span className="ml-3 font-bold text-[#a29b9d]">- AI Project Management</span>
              </h1>
              <p className="mt-2 text-[clamp(1rem,1.35vw,1.4rem)] text-[#383536]">
                Build Faster. Manage Smarter. Deliver Better
              </p>
            </section>
          </div>

          <div className="landing-card landing-card-5 mx-auto w-full max-w-[340px] self-start xl:mx-0 xl:pt-4">
            <div className="relative mb-4 flex justify-center">
              <div className="inline-flex rounded-full bg-[#ece7e7] p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    authMode === "signup" ? "bg-[#d7d2d2] text-black" : "text-[#666]"
                  }`}
                >
                  Signup
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    authMode === "signin" ? "bg-[#d7d2d2] text-black" : "text-[#666]"
                  }`}
                >
                  Sign in
                </button>
              </div>
            </div>

            {authMode === "signup" ? (
              <form onSubmit={handleSignupSubmit} className="space-y-5">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="h-14 rounded-full border-0 bg-[#ebe7e7] px-8 text-center text-lg shadow-none placeholder:text-black/70 focus-visible:ring-[#3a7ce7]/30"
                  required
                />
                <div className="flex justify-center">
                  <Button
                    type="submit"
                    className="h-auto rounded-full bg-[#1b7fe8] px-9 py-2.5 text-base font-medium text-white shadow-none hover:bg-[#166fd0]"
                  >
                    Signup
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#2f2f2f]">
                  <div className="h-px flex-1 bg-black" />
                  <span>or continue with</span>
                  <div className="h-px flex-1 bg-black" />
                </div>
                <div className="flex justify-center">
                  <Button
                    asChild
                    variant="ghost"
                    className="h-auto rounded-full border border-[#e4dfdf] bg-[#eceaea] px-12 py-2.5 text-base font-medium text-[#3b3b3b] shadow-none hover:bg-[#e2dfdf]"
                  >
                    <Link href="/signup">Google</Link>
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSigninSubmit} className="space-y-4">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="h-14 rounded-full border-0 bg-[#ebe7e7] px-8 text-center text-lg shadow-none placeholder:text-black/70 focus-visible:ring-[#3a7ce7]/30"
                  required
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="h-14 rounded-full border-0 bg-[#ebe7e7] px-8 text-center text-lg shadow-none placeholder:text-black/70 focus-visible:ring-[#3a7ce7]/30"
                  required
                />
                <div className="flex justify-center">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-auto rounded-full bg-[#1f1f1f] px-10 py-2.5 text-base font-medium text-white shadow-none hover:bg-black"
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div
            id="features"
            className="landing-card landing-card-3 rounded-[3rem] bg-[#c9c4c4] px-7 py-7 shadow-[0_16px_40px_rgba(100,95,95,0.1)] xl:mt-4"
          >
            <p className="mb-6 max-w-md text-[clamp(1.1rem,1.45vw,1.6rem)] leading-tight text-[#353233]">
              A powerful AI tool to manage your project.
            </p>
            <div className="rounded-[2.5rem] bg-[#e4e3e3] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <ul className="space-y-2.5 text-[clamp(0.95rem,1.08vw,1.2rem)] leading-tight text-[#373637]">
                {heroFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#333]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            id="premium"
            className="landing-card landing-card-4 rounded-[3.25rem] bg-[#afaaaa] px-6 py-6 shadow-[0_16px_40px_rgba(92,87,87,0.12)] xl:-mt-10 xl:-ml-10 xl:translate-y-[-0.25rem]"
          >
            <div className="mb-6 inline-flex rounded-full bg-[#e2e2e2] px-7 py-3 text-[clamp(1.05rem,1.45vw,1.55rem)] font-bold text-[#4b4b4b] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              Tickzen Premium Access
            </div>
            <div className="rounded-[2.75rem] bg-[#e1e1e1] px-7 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              <ul className="space-y-3 text-[clamp(0.95rem,1.08vw,1.2rem)] leading-tight text-[#353536]">
                {premiumFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Star className="mt-1 h-4 w-4 shrink-0 text-[#7a7a7a]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                asChild
                className="h-auto rounded-full bg-[#e5e5e5] px-8 py-3 text-lg font-medium text-[#333] shadow-none hover:bg-[#dadada]"
              >
                <Link href="/signup/admin-payment">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}
