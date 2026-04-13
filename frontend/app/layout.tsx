import "./globals.css";
import "../bones/registry";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { DataProvider } from "@/lib/data-context";
import { RouteSkeleton } from "@/components/boneyard/route-skeleton";
import { ThemeProvider } from "@/components/theme-provider";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tickzen - Project & Task Management",
  description: "A powerful project and task management application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <DataProvider>
              <RouteSkeleton>{children}</RouteSkeleton>
              <Toaster position="top-right" richColors />
            </DataProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
