"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { inventory, type AvailabilityResponse } from "@/lib/api";

export function AvailabilityTab({ restaurantId }: { restaurantId: string }) {
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAvailability() {
    setLoading(true);
    setError(null);
    const res = await inventory.availability(restaurantId);
    setLoading(false);
    if (res.error) {
      setError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    if (res.data) setData(res.data);
  }

  useEffect(() => {
    fetchAvailability();
  }, [restaurantId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted">
          Aucun item au menu.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilité par item</CardTitle>
        <p className="text-sm text-muted">
          Déduite du menu et du stock (MVP : tous les items actifs sont
          disponibles).
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.items.map((item) => (
            <div
              key={item.menu_item_id}
              className="flex items-center justify-between rounded-xl border-2 border-sand bg-white px-4 py-3"
            >
              <span className="font-medium">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.reason && (
                  <span className="text-sm text-muted">{item.reason}</span>
                )}
                {item.available ? (
                  <Badge variant="success" className="gap-1">
                    <Check className="h-3 w-3" />
                    Disponible
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <X className="h-3 w-3" />
                    Indisponible
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
