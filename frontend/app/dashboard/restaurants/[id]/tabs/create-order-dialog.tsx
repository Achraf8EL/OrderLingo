"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { menu, orders, type MenuItem } from "@/lib/api";

type Line = { menu_item_id: string; label: string; price: string; quantity: number };

export function CreateOrderDialog({
  restaurantId,
  open,
  onOpenChange,
  onSuccess,
}: {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setLines([]);
    (async () => {
      setLoading(true);
      const res = await menu.list(restaurantId);
      setLoading(false);
      if (res.data) setItems(res.data.filter((i) => i.is_active));
    })();
  }, [open, restaurantId]);

  function add(line: Line) {
    const i = lines.findIndex((l) => l.menu_item_id === line.menu_item_id);
    if (i >= 0) {
      const next = [...lines];
      next[i].quantity += 1;
      setLines(next);
    } else {
      setLines([...lines, { ...line, quantity: 1 }]);
    }
  }

  function sub(menuItemId: string) {
    const i = lines.findIndex((l) => l.menu_item_id === menuItemId);
    if (i < 0) return;
    const next = [...lines];
    if (next[i].quantity <= 1) {
      next.splice(i, 1);
    } else {
      next[i].quantity -= 1;
    }
    setLines(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      setError("Ajoute au moins un article.");
      return;
    }
    setError("");
    setSubmitLoading(true);
    const res = await orders.create(restaurantId, {
      items: lines.map((l) => ({
        menu_item_id: l.menu_item_id,
        quantity: l.quantity,
      })),
    });
    setSubmitLoading(false);
    if (res.error) {
      setError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle commande</DialogTitle>
          <DialogDescription>
            Choisis les articles et les quantités.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((m) => {
                const line = lines.find((l) => l.menu_item_id === m.id);
                const q = line?.quantity ?? 0;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border-2 border-sand bg-white px-4 py-3"
                  >
                    <div>
                      <span className="font-medium">{m.label}</span>
                      <span className="ml-2 text-sm text-terracotta">
                        {parseFloat(m.price).toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => sub(m.id)}
                        disabled={q === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[1.5rem] text-center font-medium">
                        {q}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          add({
                            menu_item_id: m.id,
                            label: m.label,
                            price: m.price,
                            quantity: 1,
                          })
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {lines.length > 0 && (
            <p className="text-sm text-muted">
              Total : {lines.length} ligne(s),{" "}
              {lines.reduce((a, l) => a + l.quantity, 0)} article(s).
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitLoading || lines.length === 0 || loading}
            >
              {submitLoading ? "Création…" : "Créer la commande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
