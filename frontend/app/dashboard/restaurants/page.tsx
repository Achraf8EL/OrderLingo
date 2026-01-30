"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, UtensilsCrossed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { restos, type Restaurant } from "@/lib/api";
import { CreateRestaurantDialog } from "./create-restaurant-dialog";

export default function RestaurantsPage() {
  const [list, setList] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function fetchList() {
    setLoading(true);
    setError(null);
    const res = await restos.list();
    setLoading(false);
    if (res.error) {
      setError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    if (res.data) setList(res.data);
  }

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Restaurants</h1>
          <p className="text-muted">Gérer les établissements (tenants).</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-5 w-5" />
          Nouveau restaurant
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UtensilsCrossed className="mb-4 h-12 w-12 text-muted" />
            <p className="mb-4 text-muted">Aucun restaurant.</p>
            <Button onClick={() => setCreateOpen(true)}>Créer un restaurant</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <Link key={r.id} href={`/dashboard/restaurants/${r.id}`}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{r.name}</CardTitle>
                    {!r.is_active && (
                      <Badge variant="secondary">Inactif</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted">{r.slug}</p>
                </CardHeader>
                {r.description && (
                  <CardContent className="pt-0">
                    <p className="line-clamp-2 text-sm text-muted">
                      {r.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateRestaurantDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchList}
      />
    </div>
  );
}
