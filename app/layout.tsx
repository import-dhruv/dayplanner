import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/providers";

export const metadata: Metadata = {
  title: "Dayplanner — Your personal command center",
  description: "Plan your day, manage tasks, and understand where your time goes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;550;600;650;700;800&display=swap" rel="stylesheet" />
      </head>
      <body><AppProvider>{children}</AppProvider></body>
    </html>
  );
}
