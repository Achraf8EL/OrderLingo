"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { orders, menu, type Order } from "@/lib/api";
import { CreateOrderDialog } from "./create-order-dialog";
import { OrderStatusDialog } from "./order-status-dialog";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  confirmed: "default",
  preparing: "default",
  ready: "success",
  delivered: "success",
  cancelled: "destructive",
};

export function OrdersTab({ restaurantId }: { restaurantId: string }) {
  const [list, setList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusOrder, setStatusOrder] = useState<Order | null>(null);

  async function fetchList() {
    setLoading(true);
    setError(null);
    const res = await orders.list(restaurantId);
    setLoading(false);
    if (res.error) {
      setError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    if (res.data) setList(res.data);
  }

  useEffect(() => {
    fetchList();
  }, [restaurantId]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Commandes</CardTitle>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-5 w-5" />
            Nouvelle commande
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-red-800">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-16 text-center text-muted">Aucune commande.</p>
          ) : (
            <div className="space-y-2">
              {list.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-xl border-2 border-sand bg-white px-4 py-3"
                >
                  <div>
                    <span className="font-medium">
                      Commande #{o.id.slice(0, 8)}
                    </span>
                    <span className="ml-2 text-sm text-muted">
                      {o.items.length} article(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[o.status] ?? "secondary"}>
                      {o.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStatusOrder(o)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOrderDialog
        restaurantId={restaurantId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchList}
      />
      {statusOrder && (
        <OrderStatusDialog
          restaurantId={restaurantId}
          order={statusOrder}
          open={!!statusOrder}
          onOpenChange={(open) => !open && setStatusOrder(null)}
          onSuccess={fetchList}
        />
      )}
    </>
  );
}
