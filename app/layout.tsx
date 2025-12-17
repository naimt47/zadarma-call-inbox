import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import OneSignalInit from "@/components/OneSignalInit";

export const metadata: Metadata = {
  title: "Call Inbox - Zadarma",
  description: "Manage and track missed calls",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
          defer
        />
      </head>
      <body className="antialiased">
        <OneSignalInit />
        {children}
      </body>
    </html>
  );
}
