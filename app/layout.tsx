import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "school record management system slsu-hc",
  description: "Role-based school records, grades, enrollment, and transcripts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
