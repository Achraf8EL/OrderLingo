"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { users, type KeycloakUser } from "@/lib/api";

interface UserSelectProps {
  selectedUserIds: string[];
  onUserToggle: (userId: string) => void;
  placeholder?: string;
  role?: string; // Filter by role: "restaurant_manager" or "staff"
}

export function UserSelect({
  selectedUserIds,
  onUserToggle,
  placeholder = "Sélectionner un utilisateur...",
  role,
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const [keycloakUsers, setKeycloakUsers] = useState<KeycloakUser[]>([]);
  const [allUsers, setAllUsers] = useState<KeycloakUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const res = await users.list(role);
      setLoading(false);
      if (res.data) {
        const enabledUsers = res.data.filter((u) => u.enabled);
        setAllUsers(enabledUsers);
        setKeycloakUsers(enabledUsers);
      }
    }
    if (open && allUsers.length === 0) {
      fetchUsers();
    }
  }, [open, role]);

  useEffect(() => {
    if (!searchTerm) {
      setKeycloakUsers(allUsers);
      return;
    }
    const search = searchTerm.toLowerCase();
    setKeycloakUsers(
      allUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search) ||
          u.firstName?.toLowerCase().includes(search) ||
          u.lastName?.toLowerCase().includes(search)
      )
    );
  }, [searchTerm, allUsers]);

  const handleUserClick = (userId: string) => {
    onUserToggle(userId);
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-between"
      >
        {placeholder}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <div className="relative w-full">
      <div className="absolute z-50 w-full mt-1 rounded-xl border-2 border-sand bg-white shadow-lg">
        {/* Header with search and close */}
        <div className="flex items-center gap-2 border-b border-sand p-3">
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-sm"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setSearchTerm("");
            }}
            className="text-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User list */}
        <div className="max-h-[300px] overflow-auto p-2">
          {loading && (
            <div className="text-center py-6 text-muted text-sm">
              Chargement...
            </div>
          )}
          {!loading && keycloakUsers.length === 0 && (
            <div className="text-center py-6 text-muted text-sm">
              Aucun utilisateur trouvé
            </div>
          )}
          {!loading &&
            keycloakUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              const displayName =
                user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.username;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleUserClick(user.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-sage/20 transition-colors text-left"
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 flex-shrink-0 ${
                      isSelected
                        ? "border-terracotta bg-terracotta text-white"
                        : "border-sand"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <User className="h-4 w-4 text-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">
                      {displayName}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {user.email || user.username}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
