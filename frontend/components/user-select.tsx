"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { users, type KeycloakUser } from "@/lib/api";

interface UserSelectProps {
  selectedUserIds: string[];
  onUserToggle: (userId: string) => void;
  placeholder?: string;
}

export function UserSelect({
  selectedUserIds,
  onUserToggle,
  placeholder = "Sélectionner un utilisateur...",
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const [keycloakUsers, setKeycloakUsers] = useState<KeycloakUser[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    const res = await users.list();
    setLoading(false);
    if (res.data) {
      setKeycloakUsers(res.data.filter((u) => u.enabled));
    }
  }

  useEffect(() => {
    if (open && keycloakUsers.length === 0) {
      fetchUsers();
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <div className="flex items-center justify-between border-b border-sand p-3">
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            className="flex-1 outline-none text-sm"
            onChange={(e) => {
              const search = e.target.value.toLowerCase();
              if (search) {
                setKeycloakUsers(prev => 
                  prev.filter(u => 
                    u.username.toLowerCase().includes(search) ||
                    u.email?.toLowerCase().includes(search) ||
                    u.firstName?.toLowerCase().includes(search) ||
                    u.lastName?.toLowerCase().includes(search)
                  )
                );
              } else {
                // Reset search
                fetchUsers();
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[300px] overflow-auto p-2">
          {loading && <div className="text-center py-6 text-muted">Chargement...</div>}
          {!loading && keycloakUsers.length === 0 && (
            <div className="text-center py-6 text-muted">Aucun utilisateur trouvé</div>
          )}
          {!loading && keycloakUsers.length > 0 && (
            <div className="space-y-1">
            {keycloakUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              const displayName =
                user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.username;
              return (
                <div
                  key={user.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onUserToggle(user.id);
                  }}
                  className="flex items-center gap-2 cursor-pointer px-2 py-2 rounded-lg hover:bg-sage/20 transition-colors"
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                      isSelected
                        ? "border-terracotta bg-terracotta text-white"
                        : "border-sand"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <User className="h-4 w-4 text-muted" />
                  <div className="flex-1">
                    <div className="font-medium text-ink">{displayName}</div>
                    <div className="text-xs text-muted">
                      {user.email || user.username}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
