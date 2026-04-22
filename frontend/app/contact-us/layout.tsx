import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Tickzen",
  description:
    "Contact Tickzen for support, billing, or general enquiries. Email: tickzen.verify@gmail.com | Address: Phi 2, Greater Noida, UP 201310.",
};

export default function ContactUsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
