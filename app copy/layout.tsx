import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GridWise — Smarter Energy Habits",
  description: "See how small changes in when you run appliances can cut your bill and carbon footprint.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
