import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UK Broadband Price Tracker",
  description: "A simple foundation for comparing UK residential broadband prices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
