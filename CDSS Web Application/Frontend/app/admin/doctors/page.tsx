
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";

const API_URL = "http://127.0.0.1:8000";

type Doctor = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

type EditForm = {
  full_name: string;
  email: string;
  password: string;
  is_active: boolean;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const buttonClass =
  "rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

async function getApiError(
  response: Response,
  fallback: string
): Promise<string> {
  const data: unknown = await response.json().catch(() => null);

  if (
    data &&
    typeof data === "object" &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail;
  }

  if (response.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (response.status === 403) {
    return "Administrator permission is required.";
  }

  return `${fallback} (HTTP ${response.status}).`;
}

export default function DoctorManagementPage() {
  const { user, loading, logout } = useAuth();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyDoctorId, setBusyDoctorId] = useState<number | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(
    null
  );
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: "",
    email: "",
    password: "",
    is_active: true,
  });

  const isAdmin = user?.role === "admin";

  const loadDoctors = useCallback(async (signal?: AbortSignal) => {
    setLoadingDoctors(true);

    try {
      const response = await fetch(
        `${API_URL}/api/admin/doctors`,
        {
          credentials: "include",
          cache: "no-store",
          signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          await getApiError(
            response,
            "Unable to load doctor accounts"
          )
        );
      }

      const data: Doctor[] = await response.json();

      if (!signal?.aborted) {
        setDoctors(data);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load doctor accounts."
        );
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingDoctors(false);
      }
    }
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    if (user.role !== "admin") {
      window.location.replace("/");
      return;
    }

    const controller = new AbortController();

    void loadDoctors(controller.signal);

    return () => controller.abort();
  }, [loading, user, loadDoctors]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleCreateDoctor(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    clearMessages();

    if (fullName.trim().length < 2) {
      setError("Doctor name must contain at least two characters.");
      return;
    }

    if (password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

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
        throw new Error(
          await getApiError(response, "Unable to create doctor")
        );
      }

      const created: Doctor = await response.json();

      setDoctors((previous) =>
        [...previous, created].sort((a, b) => a.id - b.id)
      );

      setFullName("");
      setEmail("");
      setPassword("");

      setSuccess(
        `Doctor account for ${created.full_name} created successfully.`
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

  function openEditor(doctor: Doctor) {
    clearMessages();

    setEditingDoctor(doctor);
    setEditForm({
      full_name: doctor.full_name,
      email: doctor.email,
      password: "",
      is_active: doctor.is_active,
    });
  }

  function closeEditor() {
    if (busyDoctorId !== null) return;

    setEditingDoctor(null);
  }

  async function handleUpdateDoctor(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingDoctor || busyDoctorId !== null) return;

    clearMessages();

    if (editForm.full_name.trim().length < 2) {
      setError("Doctor name must contain at least two characters.");
      return;
    }

    if (
      editForm.password.length > 0 &&
      editForm.password.length < 12
    ) {
      setError(
        "A new password must contain at least 12 characters."
      );
      return;
    }

    setBusyDoctorId(editingDoctor.id);

    try {
      const payload: {
        full_name: string;
        email: string;
        is_active: boolean;
        password?: string;
      } = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim().toLowerCase(),
        is_active: editForm.is_active,
      };

      if (editForm.password) {
        payload.password = editForm.password;
      }

      const response = await fetch(
        `${API_URL}/api/admin/doctors/${editingDoctor.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getApiError(response, "Unable to update doctor")
        );
      }

      const updated: Doctor = await response.json();

      setDoctors((previous) =>
        previous.map((doctor) =>
          doctor.id === updated.id ? updated : doctor
        )
      );

      setEditingDoctor(null);
      setSuccess(
        `Doctor account for ${updated.full_name} updated successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update doctor."
      );
    } finally {
      setBusyDoctorId(null);
    }
  }

  async function handleToggleStatus(doctor: Doctor) {
    if (busyDoctorId !== null) return;

    const action = doctor.is_active ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${doctor.full_name}?`
      )
    ) {
      return;
    }

    clearMessages();
    setBusyDoctorId(doctor.id);

    try {
      const response = await fetch(
        `${API_URL}/api/admin/doctors/${doctor.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: !doctor.is_active,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getApiError(
            response,
            `Unable to ${action} doctor`
          )
        );
      }

      const updated: Doctor = await response.json();

      setDoctors((previous) =>
        previous.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      setSuccess(
        `${updated.full_name} has been ${
          updated.is_active ? "activated" : "deactivated"
        }.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to ${action} doctor.`
      );
    } finally {
      setBusyDoctorId(null);
    }
  }

  async function handleDeleteDoctor(doctor: Doctor) {
    if (busyDoctorId !== null) return;

    if (
      !window.confirm(
        `Permanently delete ${doctor.full_name} (${doctor.email})?\n\n` +
          "This cannot be undone. Doctors with clinical records " +
          "cannot be permanently deleted."
      )
    ) {
      return;
    }

    clearMessages();
    setBusyDoctorId(doctor.id);

    try {
      const response = await fetch(
        `${API_URL}/api/admin/doctors/${doctor.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          await getApiError(
            response,
            "Unable to delete doctor"
          )
        );
      }

      setDoctors((previous) =>
        previous.filter((item) => item.id !== doctor.id)
      );

      setSuccess(
        `Doctor account for ${doctor.full_name} deleted successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete doctor."
      );
    } finally {
      setBusyDoctorId(null);
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

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#f3f7fd] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-blue-100 bg-white px-5 py-7 lg:flex">
          <Link
            href="/"
            className="mb-12 flex items-center gap-3"
          >
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

        <main className="min-w-0 flex-1 px-5 py-7 md:px-9">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Heart Disease CDSS / Administration
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                Doctor Management
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Register, edit, activate, deactivate, and manage doctor accounts.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                ← Back to Dashboard
              </Link>
              <Link
                href="/admin"
                className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                System Administration
              </Link>
            </div>
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

          <section className="mb-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Register New Doctor
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a doctor account with clinical access permissions.
            </p>

            <form
              onSubmit={(event) => void handleCreateDoctor(event)}
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
                  className={inputClass}
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
                  placeholder="clinician@example.test"
                  className={inputClass}
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
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-slate-400">
                  Use a unique temporary password. Do not reuse your
                  administrator password.
                </p>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting || busyDoctorId !== null}
                  className={`${buttonClass} bg-blue-600 px-6 py-3 text-white shadow-sm hover:bg-blue-700`}
                >
                  {submitting
                    ? "Creating Account..."
                    : "+ Create Doctor Account"}
                </button>
              </div>
            </form>
          </section>

          {editingDoctor && (
            <section
              id="edit-doctor"
              className="mb-8 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Edit Doctor #{editingDoctor.id}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update account information and access status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={busyDoctorId !== null}
                  className={`${buttonClass} border border-slate-200 bg-white text-slate-700`}
                >
                  Cancel Editing
                </button>
              </div>

              <form
                onSubmit={(event) => void handleUpdateDoctor(event)}
                className="mt-6 grid gap-5 md:grid-cols-2"
              >
                <div>
                  <label
                    htmlFor="edit-doctor-name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Full Name
                  </label>
                  <input
                    id="edit-doctor-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={150}
                    value={editForm.full_name}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        full_name: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-doctor-email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email Address
                  </label>
                  <input
                    id="edit-doctor-email"
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-doctor-password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    New Password (optional)
                  </label>
                  <input
                    id="edit-doctor-password"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={editForm.password}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Leave blank to keep existing password"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-doctor-status"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Account Status
                  </label>
                  <select
                    id="edit-doctor-status"
                    value={editForm.is_active ? "active" : "inactive"}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        is_active: event.target.value === "active",
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={busyDoctorId !== null}
                    className={`${buttonClass} bg-blue-600 px-6 py-3 text-white hover:bg-blue-700`}
                  >
                    {busyDoctorId === editingDoctor.id
                      ? "Saving Changes..."
                      : "Save Doctor Changes"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Registered Doctors
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {doctors.length} doctor account(s) stored in PostgreSQL.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  void loadDoctors();
                }}
                disabled={loadingDoctors}
                className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Doctor ID
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Full Name
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Email
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loadingDoctors ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        Loading doctor accounts...
                      </td>
                    </tr>
                  ) : doctors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
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
                        <td className="px-5 py-4">
                          {doctor.id}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-900">
                          {doctor.full_name}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {doctor.email}
                        </td>

                        <td className="px-5 py-4">
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

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyDoctorId !== null}
                              onClick={() => openEditor(doctor)}
                              className={`${buttonClass} bg-blue-50 text-blue-700 hover:bg-blue-100`}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={busyDoctorId !== null}
                              onClick={() =>
                                void handleToggleStatus(doctor)
                              }
                              className={`${buttonClass} bg-amber-50 text-amber-800 hover:bg-amber-100`}
                            >
                              {busyDoctorId === doctor.id
                                ? "Updating..."
                                : doctor.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>

                            <button
                              type="button"
                              disabled={busyDoctorId !== null}
                              onClick={() =>
                                void handleDeleteDoctor(doctor)
                              }
                              className={`${buttonClass} bg-red-50 text-red-700 hover:bg-red-100`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-4 text-xs text-slate-500">
            Doctors with registered patients or saved assessments
            cannot be permanently deleted. Deactivate their accounts
            instead to preserve clinical records.
          </p>

          <footer className="mt-10 border-t border-slate-200 py-5 text-xs text-slate-400">
            Heart Disease CDSS · Administrator account management
          </footer>
        </main>
      </div>
    </div>
  );
}
