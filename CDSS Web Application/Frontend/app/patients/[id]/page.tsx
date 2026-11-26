
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

function displayText(value: string | null) {
  return value?.trim() || "Not recorded";
}

function PatientProfileContent() {
  const params = useParams();
  const patientId = String(params.id ?? "");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setError("");
      setHistoryError("");
      setPatient(null);
      setAssessments([]);

      try {
        const response = await fetch(
          `${API_URL}/api/patients/${patientId}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Patient not found."
              : response.status === 401
                ? "Please log in again."
                : `Unable to load patient (HTTP ${response.status}).`
          );
        }

        const data: Patient = await response.json();

        if (controller.signal.aborted) return;
        setPatient(data);

        try {
          const historyResponse = await fetch(
            `${API_URL}/api/assessments/patient/${patientId}`,
            {
              credentials: "include",
              cache: "no-store",
              signal: controller.signal,
            }
          );

          if (!historyResponse.ok) {
            throw new Error(
              `Unable to load assessment history (HTTP ${historyResponse.status}).`
            );
          }

          const history: Assessment[] =
            await historyResponse.json();

          if (!controller.signal.aborted) {
            setAssessments(history);
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            setHistoryError(
              err instanceof Error
                ? err.message
                : "Unable to load assessment history."
            );
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load patient."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (patientId) {
      void loadProfile();
    } else {
      setError("Invalid patient ID.");
      setLoading(false);
    }

    return () => controller.abort();
  }, [patientId]);

  async function deleteAssessment(item: Assessment) {
    if (
      !window.confirm(
        `Permanently delete assessment #${item.id}?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(item.id);
    setHistoryError("");

    try {
      const response = await fetch(
        `${API_URL}/api/assessments/${item.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to delete assessment (HTTP ${response.status}).`
        );
      }

      setAssessments((previous) =>
        previous.filter(
          (assessment) => assessment.id !== item.id
        )
      );
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "Unable to delete assessment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const cardClass = "rounded-2xl bg-white p-6 shadow-sm";
  const titleClass = "text-xl font-bold text-slate-900";

  return (
    <main className="min-h-screen bg-[#f3f7fd] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Patient Profile
            </h1>
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
                href={`/patients/${patientId}/edit`}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
                Edit Patient
            </Link>
            <Link
              href="/assessments"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              All Assessments
            </Link>
          </div>
        </div>

        {loading && (
          <p className="text-slate-500">
            Loading patient profile...
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </p>
        )}

        {!loading && patient && (
          <div className="space-y-6">
            <section className={cardClass}>
              <h2 className={titleClass}>
                {patient.full_name}
              </h2>
              <p className="mt-2 font-semibold text-blue-600">
                {patient.patient_reference}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-500">
                    Patient ID
                  </p>
                  <p className="mt-1 font-semibold">
                    {patient.id}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Sex
                  </p>
                  <p className="mt-1 font-semibold">
                    {patient.sex === "M"
                      ? "Male"
                      : patient.sex === "F"
                        ? "Female"
                        : "Not recorded"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Date of Birth
                  </p>
                  <p className="mt-1 font-semibold">
                    {patient.date_of_birth
                      ? patient.date_of_birth.slice(0, 10)
                      : "Not recorded"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Registered
                  </p>
                  <p className="mt-1 font-semibold">
                    {new Date(
                      patient.created_at
                    ).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Linked Assessments
                  </p>
                  <p className="mt-1 font-semibold">
                    {historyError
                      ? "Unavailable"
                      : assessments.length}
                  </p>
                </div>
              </div>
            </section>

            <section className={cardClass}>
              <h2 className={titleClass}>
                Medical Background
              </h2>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {[
                  ["Medical History", patient.medical_history],
                  ["Family History", patient.family_history],
                  ["Current Medications", patient.medications],
                  ["Allergies", patient.allergies],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-100 p-5"
                  >
                    <h3 className="font-semibold text-slate-800">
                      {label}
                    </h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                      {displayText(value)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className={titleClass}>
                    Patient Assessment History
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Assessments linked to this patient.
                  </p>
                </div>

                <Link
                  href="/prediction"
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                >
                  New Assessment
                </Link>
              </div>

              {historyError && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl bg-red-50 p-4 text-red-700"
                >
                  {historyError}
                </p>
              )}

              {!historyError && assessments.length === 0 && (
                <p className="mt-6 text-slate-500">
                  No linked assessments have been saved
                  for this patient.
                </p>
              )}

              {assessments.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-slate-500">
                        <th className="px-4 py-4">
                          Assessment
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
                      {assessments.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100"
                        >
                          <td className="px-4 py-4 font-semibold">
                            #{item.id}
                          </td>
                          <td className="px-4 py-4">
                            {new Date(
                              item.created_at
                            ).toLocaleString()}
                          </td>
                          <td className="px-4 py-4">
                            {item.predicted_class === 1
                              ? "Heart Disease"
                              : "No Heart Disease"}
                          </td>
                          <td className="px-4 py-4">
                            {(
                              item.probability_class_1 * 100
                            ).toFixed(1)}
                            %
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-4">
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
        )}
      </div>
    </main>
  );
}

export default function PatientProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f3f7fd] p-10 text-slate-600">
          Loading patient profile...
        </main>
      }
    >
      <PatientProfileContent />
    </Suspense>
  );
}
