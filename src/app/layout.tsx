import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Cooking Planner",
  description: "Generate a personalized cooking to-do list, grocery list, substitutions, and budget check for your day.",
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
