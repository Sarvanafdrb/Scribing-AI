import type { Metadata } from "next";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/app/providers/Providers";

export const metadata: Metadata = {
  title: "Scribing AI - AI Powered Medical Scribing",
  description: "Transform medical consultations with AI-powered scribing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="relative flex min-h-full flex-col font-sans">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
