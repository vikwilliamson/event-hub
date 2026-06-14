import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SkipLink } from "@/components/layout/skip-link";
import { ToastProvider } from "@/hooks/use-toast";
import { ToastRegion } from "@/components/ui/toast-region";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "EventHub",
  description: "Event discovery and RSVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-neutral-50 font-sans antialiased">
        <ToastProvider>
          <SkipLink />
          {children}
          <ToastRegion />
        </ToastProvider>
      </body>
    </html>
  );
}
