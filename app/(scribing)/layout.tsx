"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Mic, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/recording", label: "Recording", icon: Mic },
  { href: "/transcript", label: "Transcript", icon: ScrollText },
  { href: "/notes", label: "Notes", icon: FileText },
];

export default function ScribingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-lg font-bold text-blue-700">
            Scribing AI
          </Link>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-700",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
