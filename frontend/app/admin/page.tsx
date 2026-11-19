
"use client";

import { useEffect, useState } from "react";

type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

const API_URL = "http://127.0.0.1:8000";

export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        if (currentUser.role !== "admin") {
          window.location.replace("/");
          return;
        }

        setUser(currentUser);
      } catch {
        window.location.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.replace("/login");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Checking administrator session...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Heart Disease CDSS
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Administration Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Welcome, {user.full_name}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Sign out
          </button>
        </header>

        <section className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Account role</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              Administrator
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Account status</p>
            <p className="mt-2 text-xl font-semibold text-emerald-700">
              Active
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">System</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              CDSS Administration
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Administrator account
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <p>
              <span className="font-medium text-slate-600">Name:</span>{" "}
              {user.full_name}
            </p>
            <p>
              <span className="font-medium text-slate-600">Email:</span>{" "}
              {user.email}
            </p>
            <p>
              <span className="font-medium text-slate-600">Role:</span>{" "}
              {user.role}
            </p>
          </div>
        </section>

        <p className="mt-6 text-sm text-slate-500">
          Doctor account management and system monitoring will be added next.
        </p>
      </div>
    </main>
  );
}
