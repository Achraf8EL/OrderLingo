"use client";

import Link from "next/link";
import { Package, ClipboardList, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const shortcuts = [
  { href: "/dashboard/restaurants", label: "Restaurants", icon: UtensilsCrossed, desc: "Gérer les établissements" },
  { href: "/dashboard/restaurants", label: "Menu & commandes", icon: ClipboardList, desc: "Via un restaurant" },
  { href: "/dashboard/restaurants", label: "Stock & disponibilité", icon: Package, desc: "Via un restaurant" },
];

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-muted">Bienvenue sur OrderLingo.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{label}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Démarrage</CardTitle>
            <CardDescription>
              Choisis un restaurant pour gérer le menu, le stock et les commandes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/restaurants">Voir les restaurants</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
