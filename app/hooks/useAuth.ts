
"use client";

import { useEffect, useState } from "react";

export type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "doctor";
  is_active: boolean;
};

const API_URL = "http://127.0.0.1:8000";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          window.location.replace("/login");
          return;
        }

        const currentUser: AuthUser = await response.json();

        if (!currentUser.is_active) {
          window.location.replace("/login");
          return;
        }

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        window.location.replace("/login");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.replace("/login");
    }
  }

  return { user, loading, logout };
}