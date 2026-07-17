import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "LeaseKaki — Singapore rentals, simplified",
    description: "Snap, list and complete a Singapore lease with every next step handled in one place.",
    openGraph: {
      title: "LeaseKaki — Snap. List. Lease.",
      description: "The fastest way to list and complete a Singapore lease.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1672, height: 941, alt: "LeaseKaki — Snap. List. Lease." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "LeaseKaki — Snap. List. Lease.",
      description: "The fastest way to list and complete a Singapore lease.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
