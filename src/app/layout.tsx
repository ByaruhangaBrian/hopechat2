import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HopeChat",
    template: "%s — HopeChat",
  },
  description: "Modern self-hosted SaaS messaging CRM for WhatsApp.",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [{ url: "/icon" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  applicationName: "HopeChat",
  // Declares the PWA to iOS, which otherwise ignores manifest.webmanifest
  // entirely and falls back to guessing from the title tag.
  appleWebApp: {
    capable: true,
    title: "HopeChat",
    statusBarStyle: "default",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f9f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ServiceWorkerRegistration />
          <Toaster
            position="top-right"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
