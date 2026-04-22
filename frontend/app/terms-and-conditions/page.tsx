import Link from "next/link";
import { ScrollText } from "lucide-react";
import { GlobalFooter } from "@/components/layout/global-footer";

export const metadata = {
  title: "Terms & Conditions — Tickzen",
  description: "Read the Terms and Conditions governing the use of Tickzen's AI-powered project management platform.",
};

export default function TermsAndConditionsPage() {
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
            <ScrollText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Terms &amp; Conditions</h1>
            <p className="text-muted-foreground mt-1 text-sm">Last updated: April 21, 2026</p>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Merchant Identity &amp; Platform</h2>
            <p>
              These Terms and Conditions govern your use of the <strong>Tickzen</strong> platform. <strong>Tickzen</strong> is
              the brand name under which this AI-powered project management service is provided. By accessing or using
              our services, you agree to be bound by these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Eligibility</h2>
            <p>
              You must be at least 18 years of age and capable of entering into a legally binding agreement to use Tickzen.
              By creating an account, you represent that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Account Types &amp; Pricing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Developer (Free):</strong> Free access to collaborative features, task viewing, and progress tracking.
              </li>
              <li>
                <strong>Trial Admin (Free, 30 Minutes):</strong> Full admin dashboard access for a single 30-minute trial session.
                Each user is entitled to only one trial.
              </li>
              <li>
                <strong>Paid Admin Plan: ₹99 for 3 Months (One-time payment, non-recurring).</strong> This grants full access
                to all admin dashboard features for a period of 90 days from the date of successful payment. No automatic
                renewals or subscriptions are created.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Digital Product Delivery Policy</h2>
            <p>
              Tickzen provides a <strong>digital service</strong>. Upon successful payment confirmation:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access to the Paid Admin features is granted immediately upon successful payment confirmation.</strong>{" "}
                No physical goods are shipped.
              </li>
              <li>
                Your admin access period of 90 days begins from the date and time of payment verification.
              </li>
              <li>
                You will receive a payment confirmation at your registered email address.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Payment Processing</h2>
            <p>
              All payments are processed securely through <strong>Razorpay</strong>. Tickzen does not store your payment
              card details. The transaction amount is <strong>₹99 for 3 Months</strong> of uninterrupted admin access.
              This is a one-time, non-recurring charge.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the platform for any unlawful purpose.</li>
              <li>Attempt to gain unauthorized access to other accounts or systems.</li>
              <li>Upload malicious content or attempt to disrupt the service.</li>
              <li>Resell or sublicense access to your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Intellectual Property</h2>
            <p>
              All content, features, and functionality on Tickzen — including but not limited to text, graphics, logos,
              and software — are the exclusive property of Tickzen and are protected by applicable intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Limitation of Liability</h2>
            <p>
              Tickzen shall not be liable for any indirect, incidental, or consequential damages arising from the use of
              or inability to use the service. Our total liability to you for any claims arising from these Terms shall
              not exceed the amount paid by you in the 3 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for violations of these Terms.
              You may terminate your account by contacting us at{" "}
              <a href="mailto:tickzen.verify@gmail.com" className="text-primary hover:underline">tickzen.verify@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall
              be subject to the exclusive jurisdiction of the courts in Greater Noida, Uttar Pradesh, India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Contact</h2>
            <p>For any questions regarding these Terms, contact us at:</p>
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
