import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { GlobalFooter } from "@/components/layout/global-footer";

export const metadata = {
  title: "Refund & Cancellation Policy — Tickzen",
  description: "Understand Tickzen's refund and cancellation terms for the Paid Admin Plan.",
};

export default function RefundPolicyPage() {
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
            <RefreshCcw className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Refund &amp; Cancellation Policy</h1>
            <p className="text-muted-foreground mt-1 text-sm">Last updated: April 21, 2026</p>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Overview</h2>
            <p>
              Tickzen offers a single paid plan — the <strong>Paid Admin Plan at ₹99 for 3 Months (One-time payment,
              non-recurring)</strong>. Since this is a digital service with immediate access upon payment, please read
              this policy carefully before making a purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Eligibility for Refund</h2>
            <p>
              <strong>Refund requests are accepted within 48 hours of purchase if the service has not been substantively
              accessed.</strong> Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your refund request must be made within <strong>48 hours</strong> of the transaction timestamp.</li>
              <li>
                If you have logged in and actively used the admin dashboard features (created projects, managed users,
                etc.) after payment, your transaction is ineligible for a refund.
              </li>
              <li>
                If access was granted but you have not used any admin features, you may still be eligible. We review
                each case individually.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Non-Refundable Situations</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Refund requests made after 48 hours from the date of purchase.</li>
              <li>Cases where the admin features have been actively used after payment.</li>
              <li>Requests citing reasons such as "changed my mind" after the 48-hour window.</li>
              <li>Issues caused by user error or incompatible third-party systems.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. How to Request a Refund</h2>
            <p>To initiate a refund request, please follow these steps:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Email us at{" "}
                <a href="mailto:tickzen.verify@gmail.com" className="text-primary hover:underline">
                  tickzen.verify@gmail.com
                </a>{" "}
                within 48 hours of your purchase.
              </li>
              <li>Use the subject line: <strong>"Refund Request — [Your Registered Email]"</strong>.</li>
              <li>
                Include in the body: your registered email address, the Razorpay Payment ID (available in your
                confirmation email), and the reason for requesting a refund.
              </li>
            </ol>
            <p className="mt-3">
              We will review your request and respond within <strong>3–5 business days</strong>. Approved refunds
              will be processed through the original payment method via Razorpay and may take 5–10 business days
              to reflect in your account, depending on your bank.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Cancellation Policy</h2>
            <p>
              The Paid Admin Plan is a <strong>one-time, non-recurring payment</strong>. There is no automatic
              subscription to cancel. Your 90-day admin access period simply expires at the end of the term.
            </p>
            <p className="mt-3">
              To cancel (close) your account entirely or remove your data, email us at{" "}
              <a href="mailto:tickzen.verify@gmail.com" className="text-primary hover:underline">
                tickzen.verify@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Free Trial</h2>
            <p>
              The 30-minute Trial Admin access is completely free and requires no payment. No refund is applicable
              to free trial usage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Contact for Refunds &amp; Cancellations</h2>
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
