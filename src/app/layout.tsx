import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "JULYOwner — Your home, working for you", template: "%s · JULYOwner" },
  description:
    "JULYOwner is your private home hub: a monthly home value and equity estimate, a maintenance plan built from what you actually own, renovation cost-vs-value, mortgage tools, and secure document storage — free from your JULY Realty advisor.",
  openGraph: {
    title: "JULYOwner — Your home, working for you",
    // No absolute promises: whether maintenance gets missed depends on the owner.
    description:
      "Track your home's value, plan maintenance before it surprises you, and keep every document in one place. Free from your JULY Realty advisor.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e7c7b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
