"use client";

import Link from "next/link";
import { Mail, MapPin, Phone, MessageSquare, Clock, Send } from "lucide-react";
import { GlobalFooter } from "@/components/layout/global-footer";
import { useState } from "react";

export default function ContactUsPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "6c3ab8d0-4df4-4c58-9a74-768e1037bd99", // Replace with your Web3Forms access key
          ...form,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        alert("Something went wrong! Please try again.");
      }
    } catch (error) {
      alert("Failed to send message.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg hover:opacity-80 transition-opacity">
            ← Tickzen
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-4">Contact Us</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Have questions or need help? We're here for you. Reach out via any of the channels below.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-2 items-start">

          {/* Contact Details */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Get in Touch</h2>
            <p className="text-muted-foreground leading-relaxed">
              Whether you have a billing question, need technical support, or want to know more about our plans —
              our team is happy to help.
            </p>

            {/* Contact Cards */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Email</p>
                  <a
                    href="mailto:tickzen.verify@gmail.com"
                    className="text-primary hover:underline text-sm mt-0.5 block"
                    id="contact-email"
                  >
                    tickzen.verify@gmail.com
                  </a>
                  <p className="text-muted-foreground text-xs mt-1">For all support &amp; billing queries</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Phone</p>
                  <a
                    href="tel:+919876543210"
                    className="text-primary hover:underline text-sm mt-0.5 block"
                    id="contact-phone"
                  >
                    +91 9934202241
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Address</p>
                  <p className="text-foreground/80 text-sm mt-0.5" id="contact-address">
                    Phi 2, Greater Noida,<br />
                    Uttar Pradesh, 201310,<br />
                    India
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Support Hours</p>
                  <p className="text-foreground/80 text-sm mt-0.5">24/7 Support Available Anytime</p>
                  <p className="text-muted-foreground text-xs mt-1">Email responses within a few hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Send className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Message Received!</h3>
                <p className="text-muted-foreground max-w-xs">
                  Thank you for reaching out. We'll get back to you at <strong>{form.email}</strong> within 24–48 hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-foreground mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-form-email" className="block text-sm font-medium text-foreground mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="contact-form-email"
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="block text-sm font-medium text-foreground mb-1.5">
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      required
                      placeholder="e.g., Billing query, Technical issue"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="block text-sm font-medium text-foreground mb-1.5">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      placeholder="Describe your issue or question in detail..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    id="contact-submit"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
