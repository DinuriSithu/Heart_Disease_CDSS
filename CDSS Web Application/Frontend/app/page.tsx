
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";

const API_BASE = "http://127.0.0.1:8000";

const doctorNavigation = [
  { label: "Dashboard", href: "/", icon: "▦" },
  { label: "Patients", href: "/patients", icon: "♙" },
  { label: "Add Patient", href: "/patients/new", icon: "+" },
  { label: "Risk Assessment", href: "/prediction", icon: "♡" },
  { label: "Assessment History", href: "/assessments", icon: "▤" },
  { label: "Medical AI Assistant", href: "/chat", icon: "✧" },
];

const adminNavigation = [
  { label: "Dashboard", href: "/", icon: "▦" },
  { label: "Doctor Management", href: "/admin/doctors", icon: "♙" },
  { label: "System Administration", href: "/admin", icon: "⚙" },
];

type SavedAssessment = {
  id: number;
  doctor_id: number;
  patient_reference: string;
  predicted_class: number;
  probability_class_0: number;
  probability_class_1: number;
  created_at: string;
};

type AssessmentDetail = SavedAssessment & {
  patient_data: Record<string, unknown>;
};

type ActivityItem = {
  date: string;
  count: number;
};

type DashboardData = {
  total_assessments: number;
  heart_disease_indicated: number;
  heart_disease_not_indicated: number;
  recent_assessments: SavedAssessment[];
  activity: ActivityItem[];
};

type PatientDashboardStats = {
  total_patients: number;
  heart_disease_assessments: number;
  no_heart_disease_assessments: number;
};

type RecentAssessment = SavedAssessment & {
  age?: number;
  gender?: string;
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getGender(value?: string): string {
  if (value === "M") return "Male";
  if (value === "F") return "Female";
  return "—";
}

function getOutcomeLabel(value: number): string {
  if (value === 1) return "Heart Disease";
  if (value === 0) return "No Heart Disease";
  return "Unknown";
}

function getOutcomeStyle(value: number): string {
  if (value === 1) return "bg-rose-50 text-rose-700";
  if (value === 0) return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function getRequestError(
  status: number,
  fallback: string
): string {
  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "Your account does not have permission to view this data.";
  }

  return `${fallback} (HTTP ${status}).`;
}

export default function Home() {
  const { user, loading, logout } = useAuth();

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [patientStats, setPatientStats] =
    useState<PatientDashboardStats | null>(null);

  const [recentAssessments, setRecentAssessments] =
    useState<RecentAssessment[]>([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [patientStatsError, setPatientStatsError] = useState("");

  const isAdmin = user?.role === "admin";
  const isDoctor = user?.role === "doctor";

  const navigation = isAdmin
    ? adminNavigation
    : doctorNavigation;

  useEffect(() => {
    if (loading || !isDoctor) return;

    const controller = new AbortController();

    async function loadPatientStats() {
      setStatsLoading(true);
      setPatientStatsError("");

      try {
        const response = await fetch(
          `${API_BASE}/api/patients/dashboard/stats`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            getRequestError(
              response.status,
              "Unable to load patient statistics"
            )
          );
        }

        const data: PatientDashboardStats =
          await response.json();

        if (!controller.signal.aborted) {
          setPatientStats(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setPatientStatsError(
            error instanceof Error
              ? error.message
              : "Unable to load patient statistics."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setStatsLoading(false);
        }
      }
    }

    void loadPatientStats();

    return () => controller.abort();
  }, [loading, isDoctor, user?.id]);

  useEffect(() => {
    if (loading || !isDoctor) return;

    const controller = new AbortController();

    async function loadDashboard() {
      setDataLoading(true);
      setDataError("");

      try {
        const response = await fetch(
          `${API_BASE}/api/assessments/dashboard`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            getRequestError(
              response.status,
              "Unable to load assessment dashboard"
            )
          );
        }

        const data: DashboardData = await response.json();

        if (controller.signal.aborted) return;

        setDashboard(data);

        const recent = await Promise.all(
          data.recent_assessments.map(
            async (
              assessment
            ): Promise<RecentAssessment> => {
              try {
                const detailResponse = await fetch(
                  `${API_BASE}/api/assessments/${assessment.id}`,
                  {
                    credentials: "include",
                    cache: "no-store",
                    signal: controller.signal,
                  }
                );

                if (!detailResponse.ok) {
                  return assessment;
                }

                const detail: AssessmentDetail =
                  await detailResponse.json();

                return {
                  ...assessment,
                  age:
                    typeof detail.patient_data?.Age === "number"
                      ? detail.patient_data.Age
                      : undefined,
                  gender:
                    typeof detail.patient_data?.Sex === "string"
                      ? detail.patient_data.Sex
                      : undefined,
                };
              } catch {
                return assessment;
              }
            }
          )
        );

        if (!controller.signal.aborted) {
          setRecentAssessments(recent);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setDataError(
            error instanceof Error
              ? error.message
              : "Unable to load assessment data."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setDataLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, [loading, isDoctor, user?.id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f7fd]">
        <p className="text-sm text-slate-500">
          Loading your dashboard...
        </p>
      </main>
    );
  }

  if (!user) return null;

  const total = dashboard?.total_assessments ?? 0;
  const heartDisease =
    dashboard?.heart_disease_indicated ?? 0;
  const noHeartDisease =
    dashboard?.heart_disease_not_indicated ?? 0;

  const heartDiseasePercent =
    total > 0 ? (heartDisease / total) * 100 : 0;

  const noHeartDiseasePercent =
    total > 0 ? (noHeartDisease / total) * 100 : 0;

  const averageModelProbability =
    recentAssessments.length > 0
      ? recentAssessments.reduce(
          (sum, item) =>
            sum + item.probability_class_1,
          0
        ) / recentAssessments.length
      : null;

  const metrics = [
    {
      title: "Total Patients",
      value: patientStats
        ? String(patientStats.total_patients)
        : "—",
      description: "Patients registered under your doctor account",
      icon: "♙",
      color: "bg-blue-50 text-blue-600",
      loading: statsLoading,
    },
    {
      title: "Heart Disease",
      value: dashboard
        ? String(heartDisease)
        : "—",
      description: "Saved assessments classified as Heart Disease",
      icon: "!",
      color: "bg-rose-50 text-rose-600",
      loading: dataLoading,
    },
    {
      title: "Assessments Completed",
      value: dashboard ? String(total) : "—",
      description: "Saved assessment records",
      icon: "✓",
      color: "bg-emerald-50 text-emerald-600",
      loading: dataLoading,
    },
    {
      title: "Average Model Probability",
      value:
        averageModelProbability !== null
          ? `${(averageModelProbability * 100).toFixed(1)}%`
          : "—",
      description:
        "Heart Disease probability across recent assessments",
      icon: "%",
      color: "bg-violet-50 text-violet-600",
      loading: dataLoading,
    },
  ];

  const activity = dashboard?.activity ?? [];
  const maxDailyCount = Math.max(
    1,
    ...activity.map((item) => item.count)
  );

  return (
    <div className="min-h-screen bg-[#f3f7fd] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-blue-100 bg-white px-5 py-7 lg:flex">
          <div className="mb-12 flex items-center gap-3">
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
          </div>

          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main Menu
          </p>

          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  item.href === "/"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <span className="w-6 text-center text-xl">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-100 pt-6">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                {user.full_name}
              </p>
              <p className="mt-1 text-xs font-medium capitalize text-blue-600">
                {user.role}
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
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Heart Disease CDSS
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                Clinical Dashboard
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Patient overview and cardiovascular risk monitoring
              </p>
            </div>

            {isAdmin ? (
              <Link
                href="/admin/doctors"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Manage Doctors
              </Link>
            ) : (
              <Link
                href="/prediction"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + New Risk Assessment
              </Link>
            )}
          </header>

          <nav className="mb-7 flex flex-wrap gap-2 lg:hidden">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-xs font-medium ${
                  item.href === "/"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {dataError && !isAdmin && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {dataError}
            </div>
          )}

          {patientStatsError && !isAdmin && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              Patient statistics: {patientStatsError}
            </div>
          )}

          {!isAdmin && (
            <>
              <section className="mb-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                  <div
                    key={metric.title}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-500">
                        {metric.title}
                      </p>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold ${metric.color}`}
                      >
                        {metric.icon}
                      </div>
                    </div>

                    <p className="mt-4 text-3xl font-bold text-slate-900">
                      {metric.loading && metric.value === "—"
                        ? "..."
                        : metric.value}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      {metric.description}
                    </p>
                  </div>
                ))}
              </section>

              <section className="mb-7 grid gap-6 xl:grid-cols-5">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-3">
                  <h3 className="text-lg font-bold text-slate-900">
                    Assessment Activity
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Saved heart disease assessments over time
                  </p>

                  {activity.length === 0 ? (
                    <div className="mt-6 flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                      <div className="mb-3 text-4xl text-blue-300">
                        ▥
                      </div>
                      <p className="text-sm font-semibold text-slate-600">
                        {dataLoading
                          ? "Loading assessment activity..."
                          : "No assessment data available"}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Saved assessments will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-5">
                      <div className="flex h-56 items-end gap-3 overflow-x-auto border-b border-slate-200 pb-2">
                        {activity.map((item) => {
                          const height = Math.max(
                            8,
                            (item.count / maxDailyCount) * 100
                          );

                          return (
                            <div
                              key={item.date}
                              className="flex h-full min-w-[54px] flex-1 flex-col items-center justify-end"
                            >
                              <span className="mb-2 text-xs font-semibold text-slate-700">
                                {item.count}
                              </span>
                              <div
                                title={`${item.count} assessments on ${item.date}`}
                                className="w-full max-w-14 rounded-t-lg bg-blue-500"
                                style={{ height: `${height}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex gap-3 overflow-x-auto">
                        {activity.map((item) => (
                          <div
                            key={item.date}
                            className="min-w-[54px] flex-1 text-center text-xs text-slate-500"
                          >
                            {formatShortDate(item.date)}
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 text-xs text-slate-500">
                        Each bar represents the number of assessments
                        saved on that date.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Risk Distribution
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Distribution of saved model prediction outcomes
                  </p>

                  <div className="flex min-h-64 flex-col items-center justify-center">
                    {total === 0 ? (
                      <div className="flex h-36 w-36 items-center justify-center rounded-full border-[14px] border-slate-100">
                        <span className="text-center text-xs text-slate-400">
                          {dataLoading ? "Loading..." : "No data"}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="flex h-40 w-40 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(
                            #f43f5e 0% ${heartDiseasePercent}%,
                            #10b981 ${heartDiseasePercent}% 100%
                          )`,
                        }}
                      >
                        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                          <span className="text-3xl font-bold text-slate-900">
                            {total}
                          </span>
                          <span className="text-xs text-slate-500">
                            Assessments
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs">
                      <span className="text-emerald-600">
                        ● No Heart Disease: {noHeartDisease}
                      </span>
                      <span className="text-rose-600">
                        ● Heart Disease: {heartDisease}
                      </span>
                    </div>

                    {total > 0 && (
                      <p className="mt-3 text-center text-xs text-slate-500">
                        {heartDiseasePercent.toFixed(1)}% Heart Disease
                        {" · "}
                        {noHeartDiseasePercent.toFixed(1)}% No Heart Disease
                      </p>
                    )}

                    <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                      These are model prediction classes, not
                      confirmed clinical diagnoses.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-7 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Recent Patient Assessments
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest saved cardiovascular assessment records
                    </p>
                  </div>

                  <Link
                    href="/assessments"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View All Assessments
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        {[
                          "Patient ID",
                          "Age",
                          "Gender",
                          "Model Outcome",
                          "Assessment Date",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-6 py-4 font-semibold"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {recentAssessments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-14 text-center text-slate-400"
                          >
                            {dataLoading
                              ? "Loading recent assessments..."
                              : "No patient assessments have been recorded yet."}
                          </td>
                        </tr>
                      ) : (
                        recentAssessments.map((assessment) => (
                          <tr
                            key={assessment.id}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {assessment.patient_reference}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {assessment.age ?? "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {getGender(assessment.gender)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getOutcomeStyle(
                                  assessment.predicted_class
                                )}`}
                              >
                                {getOutcomeLabel(
                                  assessment.predicted_class
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {formatDate(assessment.created_at)}
                            </td>
                            <td className="px-6 py-4">
                              <Link
                                href={`/assessments/${assessment.id}`}
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-lg font-bold text-slate-900">
                  Quick Actions
                </h3>

                <div className="grid gap-4 md:grid-cols-3">
                  <Link
                    href="/patients/new"
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="mb-3 text-2xl text-blue-600">
                      +
                    </div>
                    <h4 className="font-semibold">
                      Add New Patient
                    </h4>
                    <p className="mt-2 text-sm text-slate-500">
                      Register a new patient record
                    </p>
                  </Link>

                  <Link
                    href="/prediction"
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="mb-3 text-2xl text-rose-500">
                      ♥
                    </div>
                    <h4 className="font-semibold">
                      Risk Assessment
                    </h4>
                    <p className="mt-2 text-sm text-slate-500">
                      Generate a prediction 
                    </p>
                  </Link>

                  <Link
                    href="/chat"
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="mb-3 text-2xl text-violet-600">
                      ✧
                    </div>
                    <h4 className="font-semibold">
                      Medical AI Assistant
                    </h4>
                    <p className="mt-2 text-sm text-slate-500">
                      Explore medical questions and supporting literature
                    </p>
                  </Link>
                </div>
              </section>
            </>
          )}

          {isAdmin && (
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">
                Administration
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Manage doctor accounts and system administration.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/admin/doctors"
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  Doctor Management
                </Link>
                <Link
                  href="/admin"
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  System Administration
                </Link>
              </div>
            </section>
          )}

          <footer className="mt-10 border-t border-slate-200 py-5 text-xs text-slate-400">
            Heart Disease CDSS · Clinical model outputs require
            professional review.
          </footer>
        </main>
      </div>
    </div>
  );
}
