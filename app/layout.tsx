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
    title: "RentalGuru — Singapore rentals, simplified",
    description: "Snap, list and complete a Singapore rental with every next step handled in one place.",
    openGraph: {
      title: "RentalGuru — Snap. List. Done.",
      description: "The fastest way to list and complete a Singapore rental.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1732, height: 908, alt: "RentalGuru — Snap. List. Done." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "RentalGuru — Snap. List. Done.",
      description: "The fastest way to list and complete a Singapore rental.",
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
