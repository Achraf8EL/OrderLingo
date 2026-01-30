"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { restos, type Restaurant } from "@/lib/api";
import { RestaurantInfoTab } from "./tabs/info-tab";
import { MenuTab } from "./tabs/menu-tab";
import { InventoryTab } from "./tabs/inventory-tab";
import { AvailabilityTab } from "./tabs/availability-tab";
import { OrdersTab } from "./tabs/orders-tab";
import { useAuth } from "@/contexts/auth-context";

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Determine user role
  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const isManager = user?.roles.includes("restaurant_manager") ?? false;
  const isStaff = user?.roles.includes("staff") ?? false;

  async function fetchRestaurant() {
    setLoading(true);
    setError(null);
    const res = await restos.get(id);
    setLoading(false);
    if (res.error) {
      setError(res.error.detail || res.error.error || "Erreur");
      return;
    }
    if (res.data) setRestaurant(res.data);
  }

  useEffect(() => {
    fetchRestaurant();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-8">
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error || "Restaurant introuvable"}
        </div>
        <Button variant="ghost" className="mt-4" asChild>
          <Link href="/dashboard/restaurants">← Restaurants</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/restaurants">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-ink">{restaurant.name}</h1>
          <p className="text-muted">{restaurant.slug}</p>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className="bg-sand">
          <TabsTrigger value="info">Infos</TabsTrigger>
          {/* Menu, Stock, and Availability tabs: only for admin and manager */}
          {(isAdmin || isManager) && (
            <>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              <TabsTrigger value="inventory">Stock</TabsTrigger>
              <TabsTrigger value="availability">Disponibilité</TabsTrigger>
            </>
          )}
          <TabsTrigger value="orders">Commandes</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <RestaurantInfoTab restaurant={restaurant} onUpdated={fetchRestaurant} />
        </TabsContent>
        {/* Menu, Stock, and Availability content: only for admin and manager */}
        {(isAdmin || isManager) && (
          <>
            <TabsContent value="menu">
              <MenuTab restaurantId={id} />
            </TabsContent>
            <TabsContent value="inventory">
              <InventoryTab restaurantId={id} />
            </TabsContent>
            <TabsContent value="availability">
              <AvailabilityTab restaurantId={id} />
            </TabsContent>
          </>
        )}
        <TabsContent value="orders">
          <OrdersTab restaurantId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
