import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAGIP | Emergency Response System",
  description:
    "A GPS-based multi-agency emergency response and dispatch management system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}