
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const API_URL = "http://127.0.0.1:8000";

type Doctor = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export default function DoctorManagementPage() {
  const { user, loading, logout } = useAuth();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user) return;

    if (user.role !== "admin") {
      window.location.replace("/");
      return;
    }

    async function loadDoctors() {
      try {
        const response = await fetch(
          `${API_URL}/api/admin/doctors`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load doctors (HTTP ${response.status}).`
          );
        }

        const data: Doctor[] = await response.json();
        setDoctors(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load doctor accounts."
        );
      } finally {
        setLoadingDoctors(false);
      }
    }

    loadDoctors();
  }, [user]);

  async function handleCreateDoctor(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/admin/doctors`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(
            "An account with this email already exists."
          );
        }

        if (response.status === 422) {
          throw new Error(
            "Check the name, email and password. " +
              "Passwords must contain at least 12 characters."
          );
        }

        throw new Error(
          `Unable to create doctor (HTTP ${response.status}).`
        );
      }

      const createdDoctor: Doctor = await response.json();

      setDoctors((previous) => [...previous, createdDoctor]);
      setFullName("");
      setEmail("");
      setPassword("");

      setSuccess(
        `Doctor account for ${createdDoctor.full_name} created successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create doctor."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f7fd]">
        <p className="text-sm text-slate-500">
          Verifying administrator access...
        </p>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f3f7fd] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">

        {/* SIDEBAR */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-blue-100 bg-white px-5 py-7 lg:flex">
          <Link href="/" className="mb-12 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white">
              ♥
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                HeartCare
              </h1>
              <p className="text-xs text-slate-500">
                Clinical Decision Support
              </p>
            </div>
          </Link>

          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main Menu
          </p>

          <nav className="space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-blue-50"
            >
              <span className="w-6 text-center text-xl">▦</span>
              Dashboard
            </Link>

            <Link
              href="/admin/doctors"
              className="flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm"
            >
              <span className="w-6 text-center text-xl">♙</span>
              Doctor Management
            </Link>

            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-blue-50"
            >
              <span className="w-6 text-center text-xl">⚙</span>
              System Administration
            </Link>
          </nav>

          <div className="mt-auto border-t border-slate-100 pt-6">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                {user.full_name}
              </p>
              <p className="mt-1 text-xs font-medium text-blue-600">
                Administrator
              </p>
              <p className="mt-1 break-all text-xs text-slate-500">
                {user.email}
              </p>

              <button
                type="button"
                onClick={logout}
                className="mt-4 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 px-5 py-7 md:px-9">
          <header className="mb-8">
            <p className="text-sm font-medium text-blue-600">
              Heart Disease CDSS / Administration
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Doctor Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Register and view authorized doctor accounts.
            </p>

            <Link
              href="/"
              className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800 lg:hidden"
            >
              Back to Dashboard
            </Link>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          {/* CREATE DOCTOR FORM */}
          <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Register New Doctor
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a doctor account with clinical access permissions.
            </p>

            <form
              onSubmit={handleCreateDoctor}
              className="mt-6 grid gap-5 md:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="doctor-name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Full Name
                </label>

                <input
                  id="doctor-name"
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  required
                  minLength={2}
                  maxLength={150}
                  autoComplete="off"
                  placeholder="Dr. Test Clinician"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="doctor-email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email Address
                </label>

                <input
                  id="doctor-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                  autoComplete="off"
                  placeholder="clinician2@example.test"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="doctor-password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Initial Password
                </label>

                <input
                  id="doctor-password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Use a unique temporary test password. Do not reuse
                  your administrator password.
                </p>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Creating Account..."
                    : "+ Create Doctor Account"}
                </button>
              </div>
            </form>
          </section>

          {/* DOCTOR LIST */}
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                Registered Doctors
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Doctor accounts stored in PostgreSQL.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">
                      Doctor ID
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Full Name
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Email
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loadingDoctors ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        Loading doctor accounts...
                      </td>
                    </tr>
                  ) : doctors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        No doctor accounts registered yet.
                      </td>
                    </tr>
                  ) : (
                    doctors.map((doctor) => (
                      <tr
                        key={doctor.id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-6 py-4">
                          {doctor.id}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-900">
                          {doctor.full_name}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          {doctor.email}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              doctor.is_active
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {doctor.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="mt-10 border-t border-slate-200 py-5 text-xs text-slate-400">
            Heart Disease CDSS · Administrator account management
          </footer>
        </main>
      </div>
    </div>
  );
}
