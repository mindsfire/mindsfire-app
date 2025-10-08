import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Mindsfire",
  title: {
    default: "Mindsfire",
    template: "%s | Mindsfire",
  },
  description: "Mindsfire App",
  icons: {
    icon: [
      { url: "/mindsfire-black-logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", rel: "icon" },
    ],
    apple: [{ url: "/mindsfire-black-logo.svg" }],
  },
  manifest: "/site.webmanifest",
  themeColor: "#0a0c10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-a">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
