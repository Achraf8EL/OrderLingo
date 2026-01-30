"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppNav } from "@/components/layout/app-nav";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      router.replace("/login");
      return;
    }
  }, [isReady, token, router]);

  if (!isReady || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-muted">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppNav />
      <main className="pl-56 min-h-screen">{children}</main>
    </div>
  );
}
