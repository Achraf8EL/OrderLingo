"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserSelect } from "@/components/user-select-simple";
import { useAuth } from "@/contexts/auth-context";
import { restos, users as usersApi, type Restaurant, type RestaurantUpdate, type KeycloakUser } from "@/lib/api";
import { X } from "lucide-react";

export function RestaurantInfoTab({
  restaurant,
  onUpdated,
}: {
  restaurant: Restaurant;
  onUpdated: () => void;
}) {
  const { isPlatformAdmin, user } = useAuth();
  const isManager = user?.roles.includes("restaurant_manager") ?? false;
  const isStaff = user?.roles.includes("staff") ?? false;
  
  // Staff has read-only access
  const isReadOnly = isStaff;
  const [name, setName] = useState(restaurant.name);
  const [slug, setSlug] = useState(restaurant.slug);
  const [description, setDescription] = useState(restaurant.description ?? "");
  const [isActive, setIsActive] = useState(restaurant.is_active);
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [keycloakUsers, setKeycloakUsers] = useState<KeycloakUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      // Fetch users if platform admin or manager
      if (!isPlatformAdmin && !isManager) return;
      const res = await usersApi.list();
      if (res.data) {
        setKeycloakUsers(res.data.filter((u) => u.enabled));
      }
    }
    fetchUsers();
  }, [isPlatformAdmin, isManager]);

  // Load existing managers and staff when restaurant changes
  useEffect(() => {
    async function fetchAssignments() {
      if (!isPlatformAdmin && !isManager) return;
      
      // Admin can fetch both managers and staff
      if (isPlatformAdmin) {
        const [managersRes, staffRes] = await Promise.all([
          restos.getManagers(restaurant.id),
          restos.getStaff(restaurant.id),
        ]);
        if (managersRes.data) {
          setManagerIds(managersRes.data);
        }
        if (staffRes.data) {
          setStaffIds(staffRes.data);
        }
      } 
      // Manager can only fetch staff
      else if (isManager) {
        const staffRes = await restos.getStaff(restaurant.id);
        if (staffRes.data) {
          setStaffIds(staffRes.data);
        }
      }
    }
    fetchAssignments();
  }, [restaurant.id, isPlatformAdmin, isManager]);

  useEffect(() => {
    setName(restaurant.name);
    setSlug(restaurant.slug);
    setDescription(restaurant.description ?? "");
    setIsActive(restaurant.is_active);
  }, [restaurant]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const body: RestaurantUpdate = {
      name,
      slug: slug || undefined,
      description: description || null,
      is_active: isActive,
      manager_user_ids: managerIds.length > 0 ? managerIds : undefined,
      staff_user_ids: staffIds.length > 0 ? staffIds : undefined,
    };
    const res = await restos.update(restaurant.id, body);
    setLoading(false);
    if (res.error) {
      setError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    onUpdated();
  }

  function toggleManagerId(id: string) {
    if (managerIds.includes(id)) {
      setManagerIds(managerIds.filter((m) => m !== id));
    } else {
      setManagerIds([...managerIds, id]);
    }
  }

  function removeManagerId(id: string) {
    setManagerIds(managerIds.filter((m) => m !== id));
  }

  function toggleStaffId(id: string) {
    if (staffIds.includes(id)) {
      setStaffIds(staffIds.filter((s) => s !== id));
    } else {
      setStaffIds([...staffIds, id]);
    }
  }

  function removeStaffId(id: string) {
    setStaffIds(staffIds.filter((s) => s !== id));
  }

  function getUserDisplay(userId: string): string {
    const user = keycloakUsers.find((u) => u.id === userId);
    if (!user) return userId.slice(0, 8) + "...";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Informations
          {isReadOnly && (
            <span className="ml-2 text-sm font-normal text-muted">
              (Lecture seule)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
          {error && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isReadOnly}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-sand text-terracotta focus:ring-terracotta"
              disabled={isReadOnly}
            />
            <Label htmlFor="is_active">Actif</Label>
          </div>

          {/* Only platform_admin can manage managers */}
          {isPlatformAdmin && (
            <div className="space-y-2">
              <Label>Managers assignés</Label>
              <p className="text-xs text-muted">
                Managers peuvent gérer le menu, le stock, et les commandes
              </p>
              {managerIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {managerIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-full bg-sage/20 px-3 py-1.5 text-sm"
                    >
                      <span>{getUserDisplay(id)}</span>
                      <button
                        type="button"
                        onClick={() => removeManagerId(id)}
                        className="text-terracotta hover:text-terracotta/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <UserSelect
                selectedUserIds={managerIds}
                onUserToggle={toggleManagerId}
                placeholder="+ Ajouter un manager"
                role="restaurant_manager"
              />
            </div>
          )}

          {/* platform_admin OR restaurant_manager can manage staff */}
          {(isPlatformAdmin || isManager) && (
            <div className="space-y-2">
              <Label>Staff assigné</Label>
              <p className="text-xs text-muted">
                Staff peuvent uniquement gérer les commandes
              </p>
              {staffIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {staffIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-sm"
                    >
                      <span>{getUserDisplay(id)}</span>
                      <button
                        type="button"
                        onClick={() => removeStaffId(id)}
                        className="text-terracotta hover:text-terracotta/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <UserSelect
                selectedUserIds={staffIds}
                onUserToggle={toggleStaffId}
                placeholder="+ Ajouter un staff"
                role="staff"
              />
            </div>
          )}

          {/* Hide save button for staff (read-only) */}
          {!isReadOnly && (
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
