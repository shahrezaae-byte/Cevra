import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Shopping Buddy — Don't overpay. Ask first.",
  description:
    "Tell us what you're looking for. We'll research the market, compare prices, check compatibility, and tell you whether it's actually a good deal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        <Nav />
        {children}
      </body>
    </html>
  );
}
