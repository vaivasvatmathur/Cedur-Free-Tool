"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileUp, LayoutDashboard, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/upload", label: "Upload", icon: FileUp, active: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Insights", icon: BarChart3 }
];

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const visibleNavItems = isHome ? navItems.filter((item) => item.href !== "/upload") : navItems;

  return (
    <header className={`sticky top-0 z-40 bg-transparent px-4 sm:px-6 ${isHome ? "pb-2 pt-3 lg:pb-3 lg:pt-4" : "py-4 lg:py-6"}`}>
      <div className="mx-auto flex h-[74px] w-full max-w-[1320px] items-center justify-between rounded-full bg-white px-5 shadow-[0_22px_55px_rgba(41,86,128,0.16)] sm:h-[86px] sm:px-8">
        <Link href="/" className="flex min-w-0 items-center">
          <Image
            src="/cedur-logo.png"
            alt="Cedur"
            width={164}
            height={56}
            className="h-11 w-auto object-contain sm:h-14"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-4 lg:flex xl:gap-8">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href
                  ? "inline-flex h-14 items-center justify-center rounded-full bg-[#f0eeff] px-8 text-base font-semibold text-[#2f26ff] transition hover:bg-[#e9e6ff]"
                  : "inline-flex h-14 items-center justify-center gap-2 rounded-full px-2 text-base font-semibold text-slate-800 transition hover:text-[#835ef5]"
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {!isHome && (
          <div className="hidden items-center gap-7 lg:flex">
            <Button className="h-14 rounded-full bg-[#243044] px-8 text-base shadow-[0_16px_32px_rgba(36,48,68,0.24)] hover:bg-[#1b2638]" asChild>
              <Link href="/upload">Upload Payroll</Link>
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 lg:hidden">
          {!isHome && (
            <Button className="h-11 rounded-full bg-[#243044] px-5 hover:bg-[#1b2638]" asChild>
              <Link href="/upload">Upload</Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="rounded-full text-slate-800" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
