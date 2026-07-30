import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Split Tally — finance without forms",
    template: "%s · Split Tally",
  },
  description:
    "Tell it what you spent. Split Tally splits, tallies and settles with your friends — and lets you sell what you are owed when you need the cash today.",
  applicationName: "Split Tally",
  openGraph: {
    type: "website",
    siteName: "Split Tally",
    title: "Split Tally — finance without forms",
    description:
      "Speak an expense, snap a statement, trade a tally. The rewrite of splitting costs with friends.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Split Tally — finance without forms",
    description:
      "Speak an expense, snap a statement, trade a tally. The rewrite of splitting costs with friends.",
  },
};

export const viewport: Viewport = {
  themeColor: "#F4F0E5",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-cream text-navy">{children}</body>
    </html>
  );
}
