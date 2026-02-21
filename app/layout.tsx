import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  title: "deed — Real estate contracts, simplified",
  description:
    "Draft, sign, and send a professional residential purchase agreement in minutes. Free for real estate agents.",
  keywords: ["real estate", "purchase agreement", "contract", "e-signature"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: "10px",
              border: "1px solid #e5e5e5",
              boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)",
            },
          }}
        />
      </body>
    </html>
  );
}
