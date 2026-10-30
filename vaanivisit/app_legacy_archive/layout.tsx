import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaaniVisit — Health Language Portal",
  description: "Evidence-backed multilingual patient intake AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
