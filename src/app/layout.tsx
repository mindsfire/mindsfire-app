import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

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
      // Use existing ICO in public/
      { url: "/mindsifire-favicon1.ico", rel: "icon" },
      // Optional: also expose PNG for some contexts
      { url: "/mindsfire-favicon.png", type: "image/png" },
    ],
    // Prefer PNG for Apple touch icon; ensure the PNG is square
    apple: [{ url: "/mindsfire-favicon.png" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport = {
  themeColor: "#0a0c10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return (
    <html lang="en" className="theme-a">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {pk ? (
          <ClerkProvider publishableKey={pk}>
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
