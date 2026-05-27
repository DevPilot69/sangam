import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/providers";

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Vetan — Payroll Management",
  description: "Multi-tenant payroll management for growing teams in India and beyond.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jetbrains.variable} h-full antialiased`}
      data-theme="light"
    >
      <body className="min-h-full font-sans">
        <div className="vetan-blob-center" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
