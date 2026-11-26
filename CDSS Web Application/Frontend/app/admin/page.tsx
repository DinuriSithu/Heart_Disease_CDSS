
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function checkSession() {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          window.location.replace("/login");
          return;
        }

        const currentUser: AuthUser = await response.json();

        if (currentUser.role !== "admin") {
          window.location.replace("/");
          return;
        }

        if (!currentUser.is_active) {
          window.location.replace("/login");
          return;
        }

        if (!controller.signal.aborted) {
          setUser(currentUser);
        }
      } catch {
        if (!controller.signal.aborted) {
          window.location.replace("/login");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void checkSession();

    return () => controller.abort();
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

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
        <p className="text-slate-600">
          Checking administrator session...
        </p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
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

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Back to Dashboard
              </Link>

              <Link
                href="/admin/doctors"
                className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Manage Doctors
              </Link>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loggingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
              Account Role
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              Administrator
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
              Account Status
            </p>
            <p
              className={`mt-2 text-xl font-semibold ${
                user.is_active
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {user.is_active ? "Active" : "Inactive"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
              System
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              CDSS Administration
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Administrator Account
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <p>
              <span className="font-medium text-slate-600">
                Name:
              </span>{" "}
              {user.full_name}
            </p>

            <p>
              <span className="font-medium text-slate-600">
                Email:
              </span>{" "}
              {user.email}
            </p>

            <p>
              <span className="font-medium text-slate-600">
                Role:
              </span>{" "}
              {user.role}
            </p>

            <p>
              <span className="font-medium text-slate-600">
                Account ID:
              </span>{" "}
              {user.id}
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Administration Tools
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Manage authorized doctor accounts and their access
            to the clinical decision support system.
          </p>

          <Link
            href="/admin/doctors"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Open Doctor Management
          </Link>
        </section>

        <footer className="mt-8 border-t border-slate-200 py-5 text-xs text-slate-400">
          Heart Disease CDSS · System Administration
        </footer>
      </div>
    </main>
  );
}
