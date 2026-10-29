import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Apna Bazaar — Secure Local Marketplace",
  description: "Buy and sell electronics, mobiles, vehicles, furniture and more securely on Apna Bazaar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}