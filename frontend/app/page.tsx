"use client";

import Link from "next/link";
import Image from "next/image";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { CSSProperties, FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Loader2, Sparkles, Star, Layout, Search } from "lucide-react";
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
  const { user, isLoading, authenticateWithGoogle, requestSignupOtp, verifySignupEmailOtp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [introStage, setIntroStage] = useState<"loading" | "strike" | "ready">("loading");
  const [signupStep, setSignupStep] = useState<"email" | "otp" | "verified">("email");
  const [verifiedSignupToken, setVerifiedSignupToken] = useState("");
  const roleSelectionOpen = signupStep === "verified" && Boolean(verifiedSignupToken);

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

  useEffect(() => {
    if (signupStep !== "email" && !email.trim()) {
      setSignupStep("email");
      setSignupOtp("");
      setVerifiedSignupToken("");
    }
  }, [email, signupStep]);

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (signupStep === "email") {
        await requestSignupOtp(email.trim());
        setSignupStep("otp");
        setSignupOtp("");
        toast.success("OTP sent to your email.");
        return;
      }
      if (signupStep === "otp") {
        if (signupOtp.trim().length !== 6) {
          toast.error("Enter the 6-digit OTP sent to your email.");
          return;
        }
        const verificationToken = await verifySignupEmailOtp(email.trim(), signupOtp.trim());
        setVerifiedSignupToken(verificationToken);
        setSignupStep("verified");
        toast.success("Email verified. Continue to complete your signup.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to continue signup";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = useCallback(
    async (credential: string) => {
      try {
        await authenticateWithGoogle(credential);
        toast.success("Signed in with Google.");
        router.push("/dashboard");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Google sign-in failed";
        toast.error(message);
      }
    },
    [authenticateWithGoogle, router]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf8f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) return null;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#f4efed_0%,#fbfaf9_46%,#ffffff_100%)] px-4 py-4 text-[#2f2f30] sm:px-6 lg:px-8">
      <div className="landing-stage mx-auto max-w-[1400px]">
        {introStage !== "ready" && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div className={`absolute inset-0 bg-[radial-gradient(circle_at_top,#f0e9e4_0%,rgba(250,248,247,0.92)_48%,rgba(255,255,255,0.76)_100%)] transition-opacity duration-500 ${introStage === "loading" ? "opacity-100" : "opacity-0"}`} />
            {introStage === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-[#7d706b]">
                <div className="landing-loader-ring flex h-20 w-20 items-center justify-center rounded-full border border-[#dfd3cb] bg-white/70">
                  <Loader2 className="h-8 w-8 animate-spin text-[#b59f92]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#a69388]">Loading Tickzen</p>
                  <p className="mt-2 text-base text-[#7b716b]">Preparing your AI workspace experience</p>
                </div>
              </div>
            )}
            {introStage === "strike" && (
              <>
                <div className="landing-strike absolute right-[8%] top-[10.5rem] hidden h-[10px] w-[260px] rounded-full bg-[linear-gradient(90deg,rgba(189,155,132,0),rgba(194,160,140,0.92),rgba(233,214,201,0.98),rgba(189,155,132,0))] shadow-[0_0_32px_rgba(198,166,145,0.9)] lg:block" />
                <div className="landing-flash absolute right-[12%] top-[11.2rem] hidden h-24 w-24 rounded-full bg-[#ead8c9]/80 blur-2xl lg:block" />
                {introParticles.map((particle, index) => (
                  <span
                    key={index}
                    className="landing-particle absolute rounded-full bg-[#ccb0a1] opacity-0 shadow-[0_0_18px_rgba(204,176,161,0.9)]"
                    style={{ left: particle.left, top: particle.top, width: `${particle.size}px`, height: `${particle.size}px`, "--dx": `${particle.dx}px`, "--dy": `${particle.dy}px`, animationDelay: particle.delay } as CSSProperties}
                  />
                ))}
              </>
            )}
          </div>
        )}

        <div className={`mx-auto flex w-full flex-col gap-4 transition-all duration-700 xl:gap-5 ${introStage === "ready" ? "opacity-100 blur-0" : "opacity-20 blur-[2px] saturate-75"} ${roleSelectionOpen ? "pointer-events-none blur-sm" : ""}`}>
          <header className="landing-card landing-card-1 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <nav className="mx-auto w-full max-w-[920px] rounded-full bg-[#d9d7d5] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] lg:mx-0">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {["Dashboards", "Features", "Solutions", "Guide"].map((item) => (
                  <a key={item} href={item === "Features" ? "#features" : item === "Solutions" ? "#premium" : "#"} className="rounded-full bg-[#bebcba] px-6 py-2 text-sm font-medium text-[#303030] transition hover:bg-[#b3b1af] sm:px-8 sm:text-base">{item}</a>
                ))}
              </div>
            </nav>
          </header>

          <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr_0.7fr] xl:items-start">
            <div className="landing-card landing-card-2 xl:col-span-2">
              <section className="max-w-[920px] rounded-[2rem] bg-[#e8e0e0]/95 px-8 py-5 shadow-[0_16px_45px_rgba(90,84,84,0.08)] sm:px-10">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#8a8383]">
                  <Sparkles className="h-4 w-4" /> AI Project Workspace
                </div>
                <h1 className="text-[clamp(2rem,3.35vw,3.3rem)] font-black leading-[0.95] tracking-[-0.05em] text-[#6c6868]">Tickzen<span className="ml-3 font-bold text-[#a29b9d]">- AI Project Management</span></h1>
                <p className="mt-2 text-[clamp(1rem,1.35vw,1.4rem)] text-[#383536]">Build Faster. Manage Smarter. Deliver Better</p>
              </section>
            </div>

            <div className="landing-card landing-card-5 mx-auto w-full max-w-[340px] self-start xl:mx-0 xl:pt-4">
              <div className="relative mb-4 flex justify-center">
                <p className="rounded-full bg-[#ece7e7] px-6 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#5f5a5a]">Continue here</p>
              </div>
              <form onSubmit={handleSignupSubmit} className="space-y-5">
                {signupStep === "email" && (
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="h-14 rounded-full border-0 bg-[#ebe7e7] px-8 text-center text-lg shadow-none placeholder:text-black/70 focus-visible:ring-[#3a7ce7]/30" required />
                )}
                {signupStep === "otp" && (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-[#555]">Enter the OTP sent to <span className="font-medium text-[#222]">{email}</span></p>
                    <Input type="text" inputMode="numeric" value={signupOtp} onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter OTP" className="h-14 rounded-full border-0 bg-[#ebe7e7] px-8 text-center text-lg shadow-none placeholder:text-black/70 focus-visible:ring-[#3a7ce7]/30" required />
                  </div>
                )}
                {signupStep === "verified" && (
                  <div className="rounded-[1.75rem] bg-[#ebe7e7] px-6 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                    <div className="mb-2 flex items-center justify-center gap-2 text-[#2c7a4b]"><CheckCircle2 className="h-5 w-5" /><span className="font-semibold">Email verified</span></div>
                    <p className="text-sm text-[#555]">{email} is ready. Choose Developer or Admin.</p>
                  </div>
                )}
                {signupStep !== "verified" ? (
                  <div className="flex justify-center">
                    <Button type="submit" disabled={isSubmitting} className="h-auto rounded-full bg-[#1b7fe8] px-9 py-2.5 text-base font-medium text-white shadow-none hover:bg-[#166fd0]">
                      {isSubmitting ? (signupStep === "email" ? "Sending..." : "Verifying...") : (signupStep === "email" ? "Continue" : "Verify OTP")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3"><button type="button" className="text-sm text-[#666] underline-offset-4 hover:underline" onClick={() => { setSignupStep("email"); setSignupOtp(""); setVerifiedSignupToken(""); }}>Use a different email</button></div>
                )}
                <div className="flex items-center gap-3 text-sm text-[#2f2f2f]"><div className="h-px flex-1 bg-black" /><span>or continue with</span><div className="h-px flex-1 bg-black" /></div>
                <GoogleAuthButton onCredential={handleGoogleAuth} text="signup_with" />
              </form>
            </div>

            <div id="features" className="landing-card landing-card-3 rounded-[3rem] bg-[#c9c4c4] px-7 py-7 shadow-[0_16px_40px_rgba(100,95,95,0.1)] xl:mt-4">
              <p className="mb-6 max-w-md text-[clamp(1.1rem,1.45vw,1.6rem)] leading-tight text-[#353233]">A powerful AI tool to manage your project.</p>
              <div className="rounded-[2.5rem] bg-[#e4e3e3] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <ul className="space-y-2.5 text-[clamp(0.95rem,1.08vw,1.2rem)] leading-tight text-[#373637]">
                  {heroFeatures.map((f) => (<li key={f} className="flex items-start gap-2.5"><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#333]" /><span>{f}</span></li>))}
                </ul>
              </div>
            </div>

            <div id="premium" className="landing-card landing-card-4 rounded-[3.25rem] bg-[#afaaaa] px-6 py-6 shadow-[0_16px_40px_rgba(92,87,87,0.12)] xl:-mt-10 xl:-ml-10 xl:translate-y-[-0.25rem]">
              <div className="mb-6 inline-flex rounded-full bg-[#e2e2e2] px-7 py-3 text-[clamp(1.05rem,1.45vw,1.55rem)] font-bold text-[#4b4b4b] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">Tickzen Premium Access</div>
              <div className="rounded-[2.75rem] bg-[#e1e1e1] px-7 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <ul className="space-y-3 text-[clamp(0.95rem,1.08vw,1.2rem)] leading-tight text-[#353536]">
                  {premiumFeatures.map((f) => (<li key={f} className="flex items-start gap-3"><Star className="mt-1 h-4 w-4 shrink-0 text-[#7a7a7a]" /><span>{f}</span></li>))}
                </ul>
              </div>
              <div className="mt-6 flex justify-end">
                <Button asChild className="h-auto rounded-full bg-[#e5e5e5] px-8 py-3 text-lg font-medium text-[#333] shadow-none hover:bg-[#dadada]">
                  <Link href="/signup/admin-payment">Continue<ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </section>

          {/* EXTENDED PART: Redesigned Structurally per Request */}
          <section className="landing-card mt-8 rounded-[3.5rem] bg-[#f2edea]/80 p-6 md:p-10 shadow-[0_4px_40px_rgba(0,0,0,0.03)] backdrop-blur-md">
            
            {/* Section Header */}
            <div className="mb-10 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end px-2">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#8a8383]">
                  <Layout className="h-4 w-4" /> Interface Showcase
                </div>
                <h2 className="text-[clamp(1.8rem,2.5vw,2.5rem)] leading-[1.1] font-black tracking-[-0.02em] text-[#4a4545] uppercase">
                  Explore Tickzen<br />Workspace
                </h2>
              </div>
            </div>
            
            {/* The Restructured Cards Grid */}
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { 
                  src: "/11.png", 
                  titleLine1: "Global", titleLine2: "Tracking", 
                  tag: "Innovation", 
                  desc1: "Track every step of your code lifecycle from backlog to deployment with real-time updates.",
                  desc2: "Efficiently manage feature development, priority bug fixes, and current sprint priorities in one view."
                },
                { 
                  src: "/22.png", 
                  titleLine1: "Project", titleLine2: "View", 
                  tag: "Fluidity", 
                  desc1: "Visualize your entire team's workflow seamlessly with an intuitive, drag-and-drop kanban structure.",
                  desc2: "Identify roadblocks instantly, assign tasks automatically, and keep the momentum pushing forward."
                },
                { 
                  src: "/33.png", 
                  titleLine1: "Admin", titleLine2: "Portal", 
                  tag: "Governance", 
                  desc1: "Govern your workspace with enterprise-grade controls, role permissions, and advanced security.",
                  desc2: "Monitor team productivity, manage billing modules, and secure your project data from a single place."
                }
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="group relative flex h-full flex-col rounded-[2.5rem] bg-[#ffffff] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)]"
                >
                  {/* Search/Input Bar Style element */}
                  <div className="mb-8 flex h-10 w-full items-center justify-between rounded-full bg-[#f4efed] px-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a8383]">{item.tag}</span>
                    <Search className="h-4 w-4 text-[#8a8383]/60" />
                  </div>
                  
                  {/* Multi-line Title */}
                  <h3 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-[#4a4545] uppercase">
                    {item.titleLine1}<br />{item.titleLine2}
                  </h3>
                  
                  {/* Description Paragraphs */}
                  <p className="mb-4 text-sm font-medium leading-relaxed text-[#7b716b]">
                    {item.desc1}
                  </p>
                  
                  <p className="mb-8 text-sm font-medium leading-relaxed text-[#7b716b]">
                    {item.desc2}
                  </p>
                  
                  {/* Embedded Image at the bottom */}
                  <div className="relative mt-auto aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#e8e0e0] shadow-md">
                    <Image 
                      src={item.src} 
                      alt={`${item.titleLine1} ${item.titleLine2}`} 
                      fill 
                      className="object-cover transition-transform duration-700 group-hover:scale-105" 
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                </div>
              ))}
            </div>
            
          </section>
        </div>

        {roleSelectionOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(38,34,33,0.22)] px-4 backdrop-blur-md">
            <div className="w-full max-w-5xl rounded-[2.75rem] border border-white/50 bg-[#f5f0ed]/95 p-6 shadow-[0_30px_90px_rgba(63,54,50,0.2)] sm:p-8">
              <div className="mb-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9b8f88]">Email verified</p>
                <h2 className="mt-2 text-[clamp(1.8rem,2.8vw,2.8rem)] font-bold text-[#4a4545]">Choose your access</h2>
                <p className="mt-2 text-base text-[#6a6464]">Continue as a developer workspace or unlock the admin plan.</p>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[2.25rem] bg-[#d8d3d3] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <div className="mb-4 inline-flex rounded-full bg-[#ece8e8] px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#5d5858]">Developer</div>
                  <h3 className="text-3xl font-bold text-[#3f3b3b]">Build with your team</h3>
                  <ul className="mt-5 space-y-2 text-sm text-[#494444]">
                    <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2c7a4b]" /><span>Verified email is carried into signup</span></li>
                  </ul>
                  <Button type="button" onClick={() => router.push(`/signup?email=${encodeURIComponent(email.trim())}&verificationToken=${encodeURIComponent(verifiedSignupToken)}`)} className="mt-6 h-auto rounded-full bg-[#1b7fe8] px-8 py-3 text-base font-medium text-white shadow-none hover:bg-[#166fd0]">Continue as Developer</Button>
                </div>
                <div className="rounded-[2.25rem] bg-[#b9b2b2] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
                  <div className="mb-4 inline-flex rounded-full bg-white/20 px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white">Admin plan</div>
                  <h3 className="text-3xl font-bold">Admin access with payment</h3>
                  <div className="mt-5 rounded-[1.75rem] bg-white/18 p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/75">Plan amount</p>
                    <p className="mt-2 text-4xl font-black">₹499</p>
                  </div>
                  <Button type="button" onClick={() => router.push(`/signup/admin-payment?email=${encodeURIComponent(email.trim())}`)} className="mt-6 h-auto rounded-full bg-white px-8 py-3 text-base font-medium text-[#4d4747] shadow-none hover:bg-[#f1eded]">Continue as Admin</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}