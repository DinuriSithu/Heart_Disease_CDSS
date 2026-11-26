
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://127.0.0.1:8000";

type Patient = {
  id: number;
  doctor_id: number;
  patient_reference: string;
  full_name: string;
  date_of_birth: string | null;
  sex: string | null;
  medical_history: string | null;
  family_history: string | null;
  medications: string | null;
  allergies: string | null;
  created_at: string;
};

async function readError(
  response: Response,
  fallback: string
): Promise<string> {
  const data: unknown = await response
    .json()
    .catch(() => null);

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
    return "Only doctors can manage patients.";
  }

  return fallback;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPatients() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/patients/`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            await readError(
              response,
              "Unable to load patients."
            )
          );
        }

        const data: Patient[] = await response.json();

        if (!controller.signal.aborted) {
          setPatients(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load patients."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPatients();

    return () => controller.abort();
  }, []);

  async function deletePatient(patient: Patient) {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      `Delete patient ${patient.full_name} (${patient.patient_reference})?\n\nPatients with saved assessments cannot be deleted.\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(patient.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/patients/${patient.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(
            response,
            `Unable to delete patient (HTTP ${response.status}).`
          )
        );
      }

      setPatients((previous) =>
        previous.filter(
          (item) => item.id !== patient.id
        )
      );

      setMessage(
        `Patient ${patient.patient_reference} was deleted successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete patient."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const filteredPatients = patients.filter((patient) => {
    const query = search.toLowerCase().trim();

    return (
      patient.full_name.toLowerCase().includes(query) ||
      patient.patient_reference.toLowerCase().includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-[#f3f7fd] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              HeartCare / Patients
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Patient Registry
            </h1>

            <p className="mt-2 text-slate-500">
              View and manage patients registered under
              your doctor account.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Dashboard
            </Link>

            <Link
              href="/assessments"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Assessment History
            </Link>

            <Link
              href="/patients/new"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Add Patient
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Registered Patients
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? "Loading patient records..."
              : `${filteredPatients.length} patient(s) found`}
          </p>

          <div className="mt-6">
            <label
              htmlFor="patient-search"
              className="text-sm font-semibold text-slate-700"
            >
              Search Patients
            </label>

            <input
              id="patient-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by patient name or reference ID"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            >
              {message}
            </div>
          )}

          {loading ? (
            <p className="mt-8 text-center text-slate-500">
              Loading patients...
            </p>
          ) : filteredPatients.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <h3 className="font-semibold text-slate-800">
                No Patients Found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {search
                  ? "Try another patient name or reference."
                  : "Register your first patient to get started."}
              </p>

              {!search && (
                <Link
                  href="/patients/new"
                  className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  Register Patient
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-4">
                      Patient Reference
                    </th>
                    <th className="px-4 py-4">
                      Full Name
                    </th>
                    <th className="px-4 py-4">
                      Sex
                    </th>
                    <th className="px-4 py-4">
                      Date of Birth
                    </th>
                    <th className="px-4 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-semibold text-blue-700">
                        {patient.patient_reference}
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-800">
                        {patient.full_name}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {patient.sex === "M"
                          ? "Male"
                          : patient.sex === "F"
                            ? "Female"
                            : "Not recorded"}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {patient.date_of_birth
                          ? patient.date_of_birth.slice(0, 10)
                          : "Not recorded"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            View Patient
                          </Link>

                          <button
                            type="button"
                            disabled={deletingId !== null}
                            onClick={() =>
                              void deletePatient(patient)
                            }
                            className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deletingId === patient.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
