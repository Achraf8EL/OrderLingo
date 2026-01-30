"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inventory, type InventoryItem } from "@/lib/api";

export function InventoryTab({ restaurantId }: { restaurantId: string }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUnit, setFormUnit] = useState("unit");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchList() {
    setLoading(true);
    setError(null);
    const res = await inventory.list(restaurantId);
    setLoading(false);
    if (res.error) {
      setError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    if (res.data) setItems(res.data);
  }

  useEffect(() => {
    fetchList();
  }, [restaurantId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitLoading(true);
    const res = await inventory.createItem(restaurantId, {
      name: formName,
      unit: formUnit || "unit",
    });
    setSubmitLoading(false);
    if (res.error) {
      setSubmitError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    setFormName("");
    setFormUnit("unit");
    setDialogOpen(false);
    fetchList();
  }

  async function handleUpdateLevel(
    itemId: string,
    quantity: number,
    inStock: boolean
  ) {
    setUpdatingId(itemId);
    const res = await inventory.updateLevel(restaurantId, itemId, {
      quantity,
      in_stock: inStock,
    });
    setUpdatingId(null);
    if (res.error) {
      setError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    fetchList();
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock</CardTitle>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un ingrédient
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-red-800">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-muted">Aucun ingrédient.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const level = item.levels?.[0];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border-2 border-sand bg-white px-4 py-3"
                  >
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-2 text-sm text-muted">
                        ({item.unit})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {level ? (
                        <>
                          <Badge
                            variant={level.in_stock ? "success" : "destructive"}
                          >
                            {level.in_stock ? "En stock" : "Rupture"}
                          </Badge>
                          <span className="text-sm text-muted">
                            Qté: {level.quantity}
                          </span>
                          {updatingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LevelEditor
                              currentQty={level.quantity}
                              currentInStock={level.in_stock}
                              onSave={(qty, inStock) =>
                                handleUpdateLevel(item.id, qty, inStock)
                              }
                            />
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel ingrédient</DialogTitle>
            <DialogDescription>
              Ex. tomate, mozzarella, basilic.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {submitError && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {submitError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="inv-name">Nom *</Label>
              <Input
                id="inv-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="tomate"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-unit">Unité</Label>
              <Input
                id="inv-unit"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder="kg"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? "Création…" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LevelEditor({
  currentQty,
  currentInStock,
  onSave,
}: {
  currentQty: number;
  currentInStock: boolean;
  onSave: (qty: number, inStock: boolean) => void;
}) {
  const [qty, setQty] = useState(String(currentQty));
  const [inStock, setInStock] = useState(currentInStock);

  function submit() {
    const v = parseFloat(qty);
    if (!isNaN(v) && v >= 0) onSave(v, inStock);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.1"
        min="0"
        className="w-24"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        onBlur={submit}
      />
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => {
            setInStock(e.target.checked);
            onSave(parseFloat(qty) || 0, e.target.checked);
          }}
          className="h-4 w-4 rounded border-sand text-terracotta"
        />
        En stock
      </label>
    </div>
  );
}
