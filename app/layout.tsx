import type { ReactNode } from "react";
import Header from "@/components/Header";
import "./globals.css";

export const metadata = {
  title: "Find your Fit",
  description: "Mentors for careers, MBAs, and startups",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
