"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, FileText, FileUp, Keyboard, LayoutDashboard, Menu, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const savedRows = window.sessionStorage.getItem("cedur-payroll-rows");
    if (savedRows && JSON.parse(savedRows).length > 0) {
      setHasData(true);
    }
  }, [pathname]);

  const handleUploadNew = (e: React.MouseEvent) => {
    e.preventDefault();
    window.sessionStorage.removeItem("cedur-payroll-rows");
    window.sessionStorage.removeItem("cedur-company-info");
    window.sessionStorage.removeItem("cedur-report-contact");
    window.location.href = "/upload";
  };

  interface NavItem {
    href: string;
    label: string;
    icon: any;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  }

  const beforeUploadItems: NavItem[] = [
    { href: "/upload", label: "Upload Payroll", icon: FileUp },
    { href: "/manual", label: "Manual Entry", icon: Keyboard }
  ];

  const afterUploadItems: NavItem[] = [
    { href: "/upload", label: "Upload New File", icon: RotateCcw, onClick: handleUploadNew },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/findings", label: "Detailed Findings", icon: FileText },
    { href: "/report", label: "Download Report", icon: Download }
  ];

  const visibleNavItems = hasData ? afterUploadItems : beforeUploadItems;

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
          {visibleNavItems.map((item) => {
            if (item.onClick) {
              return (
                <button
                  key={item.href}
                  onClick={item.onClick}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full px-2 text-base font-semibold text-slate-800 transition hover:text-[#835ef5]"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            }
            return (
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
            );
          })}
        </nav>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button variant="ghost" size="icon" className="rounded-full text-slate-800" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
