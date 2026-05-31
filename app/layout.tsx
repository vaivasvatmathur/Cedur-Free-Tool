import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cedur Payroll Intelligence Suite",
  description: "Free payroll compliance checker for Indian businesses."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
