"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, Settings2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  menu,
  categories,
  optionGroups,
  type MenuItem,
  type MenuItemCreate,
  type MenuCategory,
  type MenuCategoryCreate,
  type OptionGroupWithItems,
  type OptionGroupCreate,
  type OptionItemCreate,
} from "@/lib/api";

export function MenuTab({ restaurantId }: { restaurantId: string }) {
  // Data states
  const [categoryList, setCategoryList] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [optionGroupList, setOptionGroupList] = useState<OptionGroupWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI states
  const [activeTab, setActiveTab] = useState<"items" | "categories" | "options">("items");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | "all" | "uncategorized">("all");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"item" | "category" | "optionGroup" | "optionItem">("item");
  const [editing, setEditing] = useState<MenuItem | MenuCategory | OptionGroupWithItems | null>(null);
  const [parentGroupId, setParentGroupId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formPriceExtra, setFormPriceExtra] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formOptionGroupIds, setFormOptionGroupIds] = useState<string[]>([]);
  const [formMinSelect, setFormMinSelect] = useState("0");
  const [formMaxSelect, setFormMaxSelect] = useState("1");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch all data
  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [catRes, itemRes, optRes] = await Promise.all([
        categories.list(restaurantId),
        menu.list(restaurantId),
        optionGroups.list(restaurantId),
      ]);
      if (catRes.data) setCategoryList(catRes.data);
      if (itemRes.data) setItems(itemRes.data);
      if (optRes.data) setOptionGroupList(optRes.data);
    } catch (e) {
      setError("Erreur de chargement");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, [restaurantId]);

  // Toggle category expand
  function toggleCategory(catId: string) {
    const newSet = new Set(expandedCategories);
    if (newSet.has(catId)) {
      newSet.delete(catId);
    } else {
      newSet.add(catId);
    }
    setExpandedCategories(newSet);
  }

  // Filter items by category
  function getFilteredItems() {
    if (selectedCategory === "all") return items;
    if (selectedCategory === "uncategorized") return items.filter((i) => !i.category_id);
    return items.filter((i) => i.category_id === selectedCategory);
  }

  // Get category name
  function getCategoryName(catId: string | null | undefined) {
    if (!catId) return "Sans catégorie";
    const cat = categoryList.find((c) => c.id === catId);
    return cat?.name || "Inconnue";
  }

  // ============ Dialog openers ============

  function openCreateItem() {
    setDialogType("item");
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormPrice("");
    setFormActive(true);
    setFormCategoryId("");
    setFormOptionGroupIds([]);
    setSubmitError("");
    setDialogOpen(true);
  }

  function openEditItem(item: MenuItem) {
    setDialogType("item");
    setEditing(item);
    setFormName(item.label);
    setFormDescription(item.description || "");
    setFormPrice(item.price);
    setFormActive(item.is_active);
    setFormCategoryId(item.category_id || "");
    setFormOptionGroupIds(item.option_group_ids || []);
    setSubmitError("");
    setDialogOpen(true);
  }

  function openCreateCategory() {
    setDialogType("category");
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormActive(true);
    setSubmitError("");
    setDialogOpen(true);
  }

  function openEditCategory(cat: MenuCategory) {
    setDialogType("category");
    setEditing(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormActive(cat.is_active);
    setSubmitError("");
    setDialogOpen(true);
  }

  function openCreateOptionGroup() {
    setDialogType("optionGroup");
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormMinSelect("0");
    setFormMaxSelect("1");
    setFormActive(true);
    setSubmitError("");
    setDialogOpen(true);
  }

  function openEditOptionGroup(group: OptionGroupWithItems) {
    setDialogType("optionGroup");
    setEditing(group);
    setFormName(group.name);
    setFormDescription(group.description || "");
    setFormMinSelect(String(group.min_select));
    setFormMaxSelect(String(group.max_select));
    setFormActive(group.is_active);
    setSubmitError("");
    setDialogOpen(true);
  }

  function openCreateOptionItem(groupId: string) {
    setDialogType("optionItem");
    setEditing(null);
    setParentGroupId(groupId);
    setFormName("");
    setFormPriceExtra("0");
    setFormActive(true);
    setSubmitError("");
    setDialogOpen(true);
  }

  // ============ Form submit ============

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitLoading(true);

    try {
      if (dialogType === "item") {
        const price = parseFloat(formPrice);
        if (isNaN(price) || price < 0) {
          setSubmitError("Prix invalide");
          setSubmitLoading(false);
          return;
        }
        const body: MenuItemCreate = {
          label: formName,
          description: formDescription || undefined,
          price,
          is_active: formActive,
          category_id: formCategoryId || undefined,
          option_group_ids: formOptionGroupIds.length > 0 ? formOptionGroupIds : undefined,
        };
        if (editing) {
          await menu.update(restaurantId, (editing as MenuItem).id, body);
        } else {
          await menu.create(restaurantId, body);
        }
      } else if (dialogType === "category") {
        const body: MenuCategoryCreate = {
          name: formName,
          description: formDescription || undefined,
          is_active: formActive,
        };
        if (editing) {
          await categories.update(restaurantId, (editing as MenuCategory).id, body);
        } else {
          await categories.create(restaurantId, body);
        }
      } else if (dialogType === "optionGroup") {
        const body: OptionGroupCreate = {
          name: formName,
          description: formDescription || undefined,
          min_select: parseInt(formMinSelect) || 0,
          max_select: parseInt(formMaxSelect) || 1,
          is_active: formActive,
        };
        if (editing) {
          await optionGroups.update(restaurantId, (editing as OptionGroupWithItems).id, body);
        } else {
          await optionGroups.create(restaurantId, body);
        }
      } else if (dialogType === "optionItem" && parentGroupId) {
        const priceExtra = parseFloat(formPriceExtra) || 0;
        const body: OptionItemCreate = {
          name: formName,
          price_extra: priceExtra,
          is_active: formActive,
        };
        await optionGroups.createOption(restaurantId, parentGroupId, body);
      }

      setDialogOpen(false);
      fetchAll();
    } catch (err) {
      setSubmitError("Erreur lors de l'enregistrement");
    }
    setSubmitLoading(false);
  }

  // ============ Delete handlers ============

  async function handleDeleteItem(item: MenuItem) {
    if (!confirm(`Supprimer « ${item.label} » ?`)) return;
    await menu.delete(restaurantId, item.id);
    fetchAll();
  }

  async function handleDeleteCategory(cat: MenuCategory) {
    if (!confirm(`Supprimer la catégorie « ${cat.name} » ? Les items seront désassociés.`)) return;
    await categories.delete(restaurantId, cat.id);
    fetchAll();
  }

  async function handleDeleteOptionGroup(group: OptionGroupWithItems) {
    if (!confirm(`Supprimer le groupe « ${group.name} » et toutes ses options ?`)) return;
    await optionGroups.delete(restaurantId, group.id);
    fetchAll();
  }

  async function handleDeleteOptionItem(groupId: string, optionId: string, optionName: string) {
    if (!confirm(`Supprimer l'option « ${optionName} » ?`)) return;
    await optionGroups.deleteOption(restaurantId, groupId, optionId);
    fetchAll();
  }

  // ============ Render ============

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <Button
          variant={activeTab === "items" ? "default" : "outline"}
          onClick={() => setActiveTab("items")}
        >
          Produits ({items.length})
        </Button>
        <Button
          variant={activeTab === "categories" ? "default" : "outline"}
          onClick={() => setActiveTab("categories")}
        >
          Catégories ({categoryList.length})
        </Button>
        <Button
          variant={activeTab === "options" ? "default" : "outline"}
          onClick={() => setActiveTab("options")}
        >
          Suppléments ({optionGroupList.length})
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}

      {/* ============ Items Tab ============ */}
      {activeTab === "items" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Produits</CardTitle>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border-2 border-sand px-3 py-1.5 text-sm"
              >
                <option value="all">Toutes catégories</option>
                <option value="uncategorized">Sans catégorie</option>
                {categoryList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={openCreateItem} className="gap-2">
              <Plus className="h-5 w-5" />
              Ajouter un produit
            </Button>
          </CardHeader>
          <CardContent>
            {getFilteredItems().length === 0 ? (
              <p className="py-8 text-center text-muted">Aucun produit.</p>
            ) : (
              <div className="space-y-2">
                {getFilteredItems().map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border-2 border-sand bg-white px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.label}</span>
                        {!item.is_active && <Badge variant="secondary">Inactif</Badge>}
                        {item.category_id && (
                          <Badge variant="outline" className="text-xs">
                            {getCategoryName(item.category_id)}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted">{item.description}</p>
                      )}
                      {item.option_group_ids && item.option_group_ids.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {item.option_group_ids.map((gid) => {
                            const grp = optionGroupList.find((g) => g.id === gid);
                            return grp ? (
                              <Badge key={gid} variant="secondary" className="text-xs">
                                {grp.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-terracotta">
                        {parseFloat(item.price).toFixed(2)} €
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteItem(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ Categories Tab ============ */}
      {activeTab === "categories" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Catégories</CardTitle>
            <Button onClick={openCreateCategory} className="gap-2">
              <Plus className="h-5 w-5" />
              Nouvelle catégorie
            </Button>
          </CardHeader>
          <CardContent>
            {categoryList.length === 0 ? (
              <p className="py-8 text-center text-muted">
                Aucune catégorie. Créez des catégories comme "Tacos", "Tenders", "Boissons"...
              </p>
            ) : (
              <div className="space-y-2">
                {categoryList.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-xl border-2 border-sand bg-white px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.name}</span>
                        {!cat.is_active && <Badge variant="secondary">Inactif</Badge>}
                        <Badge variant="outline" className="text-xs">
                          {items.filter((i) => i.category_id === cat.id).length} produits
                        </Badge>
                      </div>
                      {cat.description && (
                        <p className="text-sm text-muted">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteCategory(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ Options Tab ============ */}
      {activeTab === "options" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Groupes de suppléments</CardTitle>
            <Button onClick={openCreateOptionGroup} className="gap-2">
              <Plus className="h-5 w-5" />
              Nouveau groupe
            </Button>
          </CardHeader>
          <CardContent>
            {optionGroupList.length === 0 ? (
              <p className="py-8 text-center text-muted">
                Aucun groupe de suppléments. Créez des groupes comme "Viandes", "Sauces", "Extras"...
              </p>
            ) : (
              <div className="space-y-3">
                {optionGroupList.map((group) => (
                  <div key={group.id} className="rounded-xl border-2 border-sand bg-white">
                    <div
                      className="flex cursor-pointer items-center justify-between px-4 py-3"
                      onClick={() => toggleCategory(group.id)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedCategories.has(group.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{group.name}</span>
                        {!group.is_active && <Badge variant="secondary">Inactif</Badge>}
                        <Badge variant="outline" className="text-xs">
                          {group.options.length} options
                        </Badge>
                        <span className="text-xs text-muted">
                          (min: {group.min_select}, max: {group.max_select})
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openCreateOptionItem(group.id)}
                          title="Ajouter une option"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditOptionGroup(group)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteOptionGroup(group)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {expandedCategories.has(group.id) && (
                      <div className="border-t border-sand px-4 py-2">
                        {group.options.length === 0 ? (
                          <p className="py-2 text-sm text-muted">Aucune option dans ce groupe.</p>
                        ) : (
                          <div className="space-y-1">
                            {group.options.map((opt) => (
                              <div
                                key={opt.id}
                                className="flex items-center justify-between rounded-lg bg-cream/50 px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span>{opt.name}</span>
                                  {!opt.is_active && (
                                    <Badge variant="secondary" className="text-xs">
                                      Inactif
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-terracotta">
                                    {parseFloat(opt.price_extra) > 0
                                      ? `+${parseFloat(opt.price_extra).toFixed(2)} €`
                                      : "Gratuit"}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                    onClick={() =>
                                      handleDeleteOptionItem(group.id, opt.id, opt.name)
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============ Dialog ============ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "item" && (editing ? "Modifier le produit" : "Nouveau produit")}
              {dialogType === "category" &&
                (editing ? "Modifier la catégorie" : "Nouvelle catégorie")}
              {dialogType === "optionGroup" &&
                (editing ? "Modifier le groupe" : "Nouveau groupe de suppléments")}
              {dialogType === "optionItem" && "Nouvelle option"}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "item" && "Ex: Tacos XL, Tenders 5 pièces, Coca-Cola..."}
              {dialogType === "category" && "Ex: Tacos, Tenders, Burgers, Boissons, Desserts..."}
              {dialogType === "optionGroup" && "Ex: Choix de viande, Sauces, Suppléments..."}
              {dialogType === "optionItem" && "Ex: Poulet, Boeuf, Sauce Algérienne..."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {submitError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={
                  dialogType === "item"
                    ? "Tacos XL"
                    : dialogType === "category"
                      ? "Tacos"
                      : dialogType === "optionGroup"
                        ? "Choix de viande"
                        : "Poulet"
                }
                required
              />
            </div>

            {/* Price for items */}
            {dialogType === "item" && (
              <div className="space-y-2">
                <Label htmlFor="price">Prix (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="8.50"
                  required
                />
              </div>
            )}

            {/* Price extra for option items */}
            {dialogType === "optionItem" && (
              <div className="space-y-2">
                <Label htmlFor="priceExtra">Prix supplémentaire (€)</Label>
                <Input
                  id="priceExtra"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formPriceExtra}
                  onChange={(e) => setFormPriceExtra(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Description for items, categories, option groups */}
            {(dialogType === "item" ||
              dialogType === "category" ||
              dialogType === "optionGroup") && (
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={
                    dialogType === "item"
                      ? "Galette, viande au choix, frites, sauce..."
                      : "Description optionnelle"
                  }
                  rows={2}
                />
              </div>
            )}

            {/* Category selector for items */}
            {dialogType === "item" && categoryList.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <select
                  id="category"
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full rounded-lg border-2 border-sand px-3 py-2"
                >
                  <option value="">Sans catégorie</option>
                  {categoryList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Option groups multi-select for items */}
            {dialogType === "item" && optionGroupList.length > 0 && (
              <div className="space-y-2">
                <Label>Groupes de suppléments</Label>
                <div className="max-h-40 space-y-1 overflow-auto rounded-lg border-2 border-sand p-2">
                  {optionGroupList.map((grp) => (
                    <label key={grp.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formOptionGroupIds.includes(grp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormOptionGroupIds([...formOptionGroupIds, grp.id]);
                          } else {
                            setFormOptionGroupIds(formOptionGroupIds.filter((id) => id !== grp.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-sand text-terracotta"
                      />
                      <span className="text-sm">{grp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Min/Max select for option groups */}
            {dialogType === "optionGroup" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minSelect">Min. sélection</Label>
                  <Input
                    id="minSelect"
                    type="number"
                    min="0"
                    value={formMinSelect}
                    onChange={(e) => setFormMinSelect(e.target.value)}
                  />
                  <p className="text-xs text-muted">0 = optionnel</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxSelect">Max. sélection</Label>
                  <Input
                    id="maxSelect"
                    type="number"
                    min="1"
                    value={formMaxSelect}
                    onChange={(e) => setFormMaxSelect(e.target.value)}
                  />
                  <p className="text-xs text-muted">1 = choix unique</p>
                </div>
              </div>
            )}

            {/* Active checkbox */}
            {dialogType !== "optionItem" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-sand text-terracotta focus:ring-terracotta"
                />
                <Label htmlFor="active">Actif</Label>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
