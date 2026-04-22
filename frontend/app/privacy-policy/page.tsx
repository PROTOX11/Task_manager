import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { GlobalFooter } from "@/components/layout/global-footer";

export const metadata = {
  title: "Privacy Policy — Tickzen",
  description: "Learn how Tickzen collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg hover:opacity-80 transition-opacity">
            ← Tickzen
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="mb-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Privacy Policy</h1>
            <p className="text-muted-foreground mt-1 text-sm">Last updated: April 21, 2026</p>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Introduction</h2>
            <p>
              Welcome to <strong>Tickzen</strong> ("we", "us", or "our"). Tickzen is an AI-powered project management platform
              operated by Prakash kumar. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our website and services.
            </p>
            <p>
              By using Tickzen, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personal Information:</strong> Name, email address, and profile information provided during registration.</li>
              <li><strong>Payment Information:</strong> Payment is processed by Razorpay. We do not store your card or banking details.</li>
              <li><strong>Usage Data:</strong> Log data, pages visited, features used, and device/browser information.</li>
              <li><strong>Cookies:</strong> We use cookies to maintain session state and improve user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our services.</li>
              <li>To process transactions and send related information (receipts, confirmations).</li>
              <li>To send administrative communications (security updates, policy changes).</li>
              <li>To improve our platform through analytics and feedback.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Sharing of Information</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Razorpay:</strong> Our payment gateway partner, for processing payments.</li>
              <li><strong>Service Providers:</strong> Trusted vendors who assist in operating our service (e.g., email delivery- brevo, hosting- interserver, forms- web3forms, ).</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including HTTPS encryption,
              secure token-based authentication, and restricted database access. However, no method of transmission over
              the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide services.
              You may request deletion of your account and associated data by contacting us at{" "}
              <a href="mailto:tickzen.verify@gmail.com" className="text-primary hover:underline">tickzen.verify@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data we hold.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Withdraw consent at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Cookies Policy</h2>
            <p>
              We use session cookies to keep you logged in and enhance user experience. You can disable cookies in
              your browser settings, though some features may not function properly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an
              updated "Last updated" date. Continued use of our service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <ul className="list-none pl-0 space-y-1">
              <li>📧 <a href="mailto:tickzen.verify@gmail.com" className="text-primary hover:underline">tickzen.verify@gmail.com</a></li>
              <li>📍 Phi 2, Greater Noida, Uttar Pradesh, 201310, India</li>
            </ul>
          </section>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
