import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Google Drive Upload Web Tool",
  description: "Upload images and videos to mapped Google Drive folders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
