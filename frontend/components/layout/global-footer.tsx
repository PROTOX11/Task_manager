import Link from "next/link";

const footerLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Refund & Cancellation Policy", href: "/refund-policy" },
  { label: "Contact Us", href: "/contact-us" },
];

export function GlobalFooter() {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center gap-5">
          {/* Brand */}
          <p className="text-sm font-semibold text-foreground tracking-wide">Tickzen</p>

          {/* Policy Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} Tickzen. All rights reserved.{" "}
            <span className="text-muted-foreground/70">
              Phi 2, Greater Noida, Uttar Pradesh, 201310, India
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
