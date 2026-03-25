import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bank Settlement — SWIFT + Tempo",
  description: "Cross-border bank settlement demo using SWIFT messaging and stablecoins on Tempo Moderato",
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
