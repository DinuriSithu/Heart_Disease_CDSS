
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://127.0.0.1:8000";

type Assessment = {
  id: number;
  doctor_id: number;
  patient_id: number | null;
  patient_reference: string;
  predicted_class: number;
  probability_class_0: number;
  probability_class_1: number;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function getError(status: number) {
  if (status === 401) return "Please log in again.";
  if (status === 403) return "Doctor access is required.";
  return `Request failed (HTTP ${status}).`;
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadAssessments = useCallback(async (
    signal?: AbortSignal
  ) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/assessments/`,
        {
          credentials: "include",
          cache: "no-store",
          signal,
        }
      );

      if (!response.ok) {
        throw new Error(getError(response.status));
      }

      const data: Assessment[] = await response.json();

      if (!signal?.aborted) {
        setAssessments(data);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load assessments."
        );
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAssessments(controller.signal);
    return () => controller.abort();
  }, [loadAssessments]);

  async function deleteAssessment(assessment: Assessment) {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      `Permanently delete assessment #${assessment.id} for ${assessment.patient_reference}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(assessment.id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/assessments/${assessment.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(getError(response.status));
      }

      setAssessments((previous) =>
        previous.filter(
          (item) => item.id !== assessment.id
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete assessment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = assessments.filter((item) => {
    const query = search.trim().toLowerCase();

    return (
      item.patient_reference.toLowerCase().includes(query) ||
      String(item.id).includes(query)
    );
  });

  return (
    <main className="min-h-screen bg-[#f3f7fd] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              HeartCare / Assessments
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Assessment History
            </h1>
            <p className="mt-2 text-slate-500">
              Review previously saved heart disease assessments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
                href="/"
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
                ← Back to Dashboard
            </Link>
            <Link
              href="/patients"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Patient Registry
            </Link>
            <Link
              href="/prediction"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              New Assessment
            </Link>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">
              Saved Assessments ({filtered.length})
            </h2>
            <button
              type="button"
              onClick={() => void loadAssessments()}
              disabled={loading}
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patient reference or assessment ID"
            className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
          />

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-red-50 p-4 text-red-700"
            >
              {error}
            </p>
          )}

          {loading ? (
            <p className="mt-8 text-slate-500">
              Loading assessments...
            </p>
          ) : filtered.length === 0 ? (
            <p className="mt-8 text-slate-500">
              No assessments found.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="px-4 py-4">Assessment</th>
                    <th className="px-4 py-4">
                      Patient Reference
                    </th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">
                      Prediction
                    </th>
                    <th className="px-4 py-4">
                      Heart Disease Probability
                    </th>
                    <th className="px-4 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100"
                    >
                      <td className="px-4 py-4 font-semibold">
                        #{item.id}
                      </td>

                      <td className="px-4 py-4">
                        {item.patient_id ? (
                          <Link
                            href={`/patients/${item.patient_id}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {item.patient_reference}
                          </Link>
                        ) : (
                          item.patient_reference
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {formatDate(item.created_at)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            item.predicted_class === 1
                              ? "font-semibold text-red-700"
                              : "font-semibold text-green-700"
                          }
                        >
                          {item.predicted_class === 1
                            ? "Heart Disease"
                            : item.predicted_class === 0
                                ? "No Heart Disease"
                                : "Unknown"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {(
                          item.probability_class_1 * 100
                        ).toFixed(1)}
                        %
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <Link
                            href={`/assessments/${item.id}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            View Details
                          </Link>

                          <button
                            type="button"
                            disabled={deletingId !== null}
                            onClick={() =>
                              void deleteAssessment(item)
                            }
                            className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deletingId === item.id
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
