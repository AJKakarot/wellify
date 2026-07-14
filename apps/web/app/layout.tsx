import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css" ;


const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Wellify | Welcome",
  description: "AI-powered wellness tracking by Wellify.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={manrope.variable} suppressHydrationWarning>{children}</body>
    </html>
  );
}
