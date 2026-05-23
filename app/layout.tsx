import type { Metadata, Viewport } from "next";
import { Lato, Oswald } from "next/font/google";
import Script from "next/script";
import { AppToaster } from "@/components/app-toaster";
import { AppShell } from "@/components/app-shell";
import { AuthModalProvider } from "@/contexts/auth-modal-context";
import { ExchangeRateProvider } from "@/contexts/exchange-rate-context";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const lato = Lato({
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
});

const oswald = Oswald({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Club54 — Coffee & menu",
  description: "Club54 coffee shop — browse the menu and order.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f1ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${oswald.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light" />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <AuthProvider>
          <ExchangeRateProvider>
            <AuthModalProvider>
              <AppShell>{children}</AppShell>
              <AppToaster />
            </AuthModalProvider>
          </ExchangeRateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
