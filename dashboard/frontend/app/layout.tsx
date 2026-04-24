import type { Metadata } from "next";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";

import { AppShell } from "../components/app-shell";

import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Instagram Lifestyle Analytics",
  description: "Exploratory analysis, user personas, and predictive modeling for the Instagram lifestyle project",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable} bg-canvas font-sans text-ink`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
