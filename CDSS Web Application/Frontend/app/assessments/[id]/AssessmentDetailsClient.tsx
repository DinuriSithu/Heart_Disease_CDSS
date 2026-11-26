"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";
type Assessment = {
  id: number; doctor_id: number; patient_reference: string;
  patient_data: Record<string, unknown>; predicted_class: number;
  probability_class_0: number; probability_class_1: number;
  shap_explanations: Array<Record<string, unknown>>;
  medical_evidence: Record<string, unknown> | null; created_at: string;
};
function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "Not recorded";
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}
function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
async function readError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null);
  if (response.status === 401) return "Your session has expired. Please log in again.";
  if (response.status === 403) return "Only doctors can view assessments.";
  return typeof data?.detail === "string" ? data.detail : fallback;
}
const cardClass = "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm";
function SavedEvidence({ evidence }: { evidence: Assessment["medical_evidence"] }) {
  const sources = Array.isArray(evidence?.sources) ? evidence.sources : [];
  return <section className={cardClass}>
    <h2 className="text-xl font-bold text-slate-900">Saved Medical Evidence</h2>
    {!evidence ? <p className="mt-4 text-slate-500">No medical evidence was saved with this assessment.</p> : <div className="mt-5 space-y-5">
      <p className="text-sm font-semibold text-green-700">Medical evidence saved</p>
      {typeof evidence.saved_at === "string" && <p className="text-xs text-slate-500">Saved: {displayDate(evidence.saved_at)}</p>}
      <p className="text-sm text-slate-600">Retrieval status: {displayValue(evidence.status)}</p>
      <div className="rounded-xl bg-blue-50 p-5"><h3 className="font-semibold text-slate-900">BioMistral Answer</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{displayValue(evidence.answer)}</p></div>
      <h3 className="text-lg font-semibold text-slate-900">Supporting Medical Sources</h3>
      {sources.length === 0 && <p className="text-sm text-slate-500">No supporting sources were saved.</p>}
      {sources.map((source, index) => {
        if (!source || typeof source !== "object") return null;
        const url = typeof source.url === "string" && /^https?:\/\//i.test(source.url) ? source.url : null;
        return <div key={index} className="rounded-xl border border-slate-200 p-5">
          <h4 className="font-semibold text-slate-900">{displayValue(source.title).replace(/\.pdf$/i, "")}</h4>
          {source.page != null && <p className="mt-1 text-xs text-slate-500">Page: {displayValue(source.page)}</p>}
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{source.summary || "No source summary was saved."}</p>
          {typeof source.excerpt === "string" && source.excerpt && <details className="mt-3 text-sm text-slate-600"><summary className="cursor-pointer">Retrieved excerpt</summary><p className="mt-2 whitespace-pre-wrap break-words">{source.excerpt}</p></details>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">View Original Medical Document</a>}
        </div>;
      })}
      <p className="text-xs leading-5 text-slate-500">This is a saved AI-generated evidence response submitted by the application. It may contain errors or omissions. Verify original sources and current clinical guidance. It is not a confirmed diagnosis.</p>
    </div>}
  </section>;
}
export default function AssessmentDetailsClient({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setAssessment(null);
    async function loadAssessment() {
      try {
        const response = await fetch(`${API_URL}/api/assessments/${assessmentId}`, { credentials: "include", cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(await readError(response, `Unable to load assessment (HTTP ${response.status}).`));
        const data: Assessment = await response.json();
        if (!controller.signal.aborted) setAssessment(data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load assessment.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    if (/^[1-9]\d*$/.test(assessmentId)) void loadAssessment();
    else { setError("Invalid assessment ID."); setLoading(false); }
    return () => controller.abort();
  }, [assessmentId]);
  async function handleDelete() {
    if (!assessment || deleting || !window.confirm(`Permanently delete assessment #${assessment.id}?\n\nThis cannot be undone.`)) return;
    setDeleting(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/assessments/${assessment.id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error(await readError(response, `Unable to delete assessment (HTTP ${response.status}).`));
      router.replace("/assessments"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to delete assessment."); }
    finally { setDeleting(false); }
  }
  return <main className="min-h-screen bg-[#f3f7fd] px-5 py-8 md:px-10"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-blue-600">HeartCare / Assessments / Details</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Assessment #{assessmentId}</h1></div><div className="flex flex-wrap gap-3"><Link href="/" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to Dashboard</Link><Link href="/assessments" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Assessment History</Link></div></header>
    {loading && <p className="text-slate-500">Loading assessment details...</p>}
    {error && <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!loading && assessment && <div className="space-y-6">
      <section className={cardClass}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">Assessment Summary</h2><p className="mt-3 text-slate-600">Patient Reference: <strong>{assessment.patient_reference}</strong></p><p className="mt-2 text-slate-600">Date: {displayDate(assessment.created_at)}</p></div><button type="button" disabled={deleting} onClick={() => void handleDelete()} className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{deleting ? "Deleting..." : "Delete Assessment"}</button></div></section>
      <section className={cardClass}><h2 className="text-xl font-bold text-slate-900">Prediction Result</h2><div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Model Prediction</p><p className={`mt-2 font-bold ${assessment.predicted_class === 1 ? "text-rose-700" : "text-emerald-700"}`}>{assessment.predicted_class === 1 ? "Heart Disease" : assessment.predicted_class === 0 ? "No Heart Disease" : "Unknown"}</p></div>{[["Heart Disease Probability", assessment.probability_class_1], ["No Heart Disease Probability", assessment.probability_class_0]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{(Number(value)*100).toFixed(1)}%</p></div>)}</div><p className="mt-5 text-sm text-slate-500">Model predictions support clinical decisions but are not confirmed diagnoses.</p></section>
      <section className={cardClass}><h2 className="text-xl font-bold text-slate-900">Clinical Input Data</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{Object.entries(assessment.patient_data ?? {}).map(([key,value]) => <div key={key} className="rounded-xl border border-slate-100 p-4"><p className="text-sm font-semibold text-slate-500">{key}</p><p className="mt-2 whitespace-pre-wrap break-words text-slate-800">{displayValue(value)}</p></div>)}</div></section>
      <section className={cardClass}><h2 className="text-xl font-bold text-slate-900">SHAP Explanations</h2>{(assessment.shap_explanations ?? []).length === 0 ? <p className="mt-4 text-slate-500">No SHAP explanations were saved.</p> : <div className="mt-5 space-y-3">{assessment.shap_explanations.map((item,index) => <div key={index} className="rounded-xl border border-slate-100 p-4">{Object.entries(item).map(([key,value]) => <div key={key} className="flex flex-wrap gap-2 py-1 text-sm"><span className="font-semibold text-slate-700">{key}:</span><span className="whitespace-pre-wrap break-words text-slate-600">{displayValue(value)}</span></div>)}</div>)}</div>}</section>
      <SavedEvidence evidence={assessment.medical_evidence}/>
    </div>}
  </div></main>;
}
