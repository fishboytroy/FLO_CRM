import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lafayette Real Estate CRM",
  description: "Phase 1 CRM dashboard for Lafayette Louisiana Real Estate"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
