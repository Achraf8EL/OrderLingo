"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UtensilsCrossed, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/restaurants", label: "Restaurants", icon: UtensilsCrossed },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r-2 border-sand bg-white">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-sand px-4">
          <span className="text-xl font-bold text-terracotta">OrderLingo</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"))
                  ? "bg-terracotta/10 text-terracotta-dark"
                  : "text-muted hover:bg-sand hover:text-ink"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sand p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </Button>
        </div>
      </div>
    </aside>
  );
}
