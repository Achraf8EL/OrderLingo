"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "orderlingo_token";
const USER_KEY = "orderlingo_user";

type UserInfo = {
  sub: string;
  username: string | null;
  email: string | null;
  roles: string[];
};

type AuthContextValue = {
  token: string | null;
  user: UserInfo | null;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  isReady: boolean;
  isPlatformAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    setToken(t);
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        setUser(null);
      }
    }
    setIsReady(true);
  }, []);

  // Fetch user info when token changes
  useEffect(() => {
    async function fetchUserInfo() {
      if (!token) {
        setUser(null);
        localStorage.removeItem(USER_KEY);
        return;
      }
      try {
        const r = await fetch("http://localhost:8000/debug/token", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const data = await r.json();
          const userInfo: UserInfo = {
            sub: data.sub,
            username: data.username,
            email: data.email,
            roles: data.roles || [],
          };
          setUser(userInfo);
          localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
        }
      } catch {
        // Ignore errors
      }
    }
    fetchUserInfo();
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { error: data.error || "Login failed" };
    }
    const access = data.access_token;
    if (access) {
      localStorage.setItem(TOKEN_KEY, access);
      setToken(access);
    }
    return {};
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const isPlatformAdmin = user?.roles.includes("platform_admin") ?? false;

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isReady, isPlatformAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
