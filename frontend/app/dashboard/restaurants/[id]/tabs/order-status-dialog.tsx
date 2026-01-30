"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orders, type Order } from "@/lib/api";

const NEXT: Record<string, string[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function OrderStatusDialog({
  restaurantId,
  order,
  open,
  onOpenChange,
  onSuccess,
}: {
  restaurantId: string;
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const opts = NEXT[order.status] ?? [];

  async function handleUpdate() {
    if (!next) return;
    setError("");
    setLoading(true);
    const res = await orders.updateStatus(restaurantId, order.id, {
      status: next,
    });
    setLoading(false);
    if (res.error) {
      setError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    setNext("");
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commande #{order.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>Détail et changement de statut.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-muted">Statut actuel</span>
            <div className="mt-1">
              <Badge variant="secondary">{order.status}</Badge>
            </div>
          </div>
          <ul className="space-y-1 text-sm">
            {order.items.map((i) => (
              <li key={i.id}>
                {i.quantity}× article {i.menu_item_id.slice(0, 8)} —{" "}
                {parseFloat(i.unit_price).toFixed(2)} €
              </li>
            ))}
          </ul>
          {error && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {opts.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Passer à</label>
              <Select value={next} onValueChange={setNext}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {opts.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {opts.length > 0 && (
            <Button
              onClick={handleUpdate}
              disabled={!next || loading}
            >
              {loading ? "Mise à jour…" : "Mettre à jour"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
