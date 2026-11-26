"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API = "http://127.0.0.1:8000";

type PatientData = {
  Age: number;
  Sex: "M" | "F";
  ChestPainType: "TA" | "ATA" | "NAP" | "ASY";
  RestingBP: number;
  Cholesterol: number;
  FastingBS: 0 | 1;
  RestingECG: "Normal" | "ST" | "LVH";
  MaxHR: number;
  ExerciseAngina: "Y" | "N";
  Oldpeak: number;
  ST_Slope: "Up" | "Flat" | "Down";
};

type RegisteredPatient = {
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

type Explanation = {
  feature: string;
  feature_value: number;
  shap_value: number;
};

type PredictionResponse = {
  predicted_class: number;
  probability_class_0: number;
  probability_class_1: number;
  shap_explanations: Explanation[];
};

type MedicalEvidence = {
  question: string;
  answer: string;
  status: string;
  sources: {
    rank: number;
    title: string;
    page: number | string | null;
    url: string | null;
    excerpt: string;
    summary?: string | null;
  }[];
};

type SavedAssessment = {
  id: number;
  patient_reference: string;
  created_at: string;
};

const initialData: PatientData = {
  Age: 40,
  Sex: "M",
  ChestPainType: "ATA",
  RestingBP: 120,
  Cholesterol: 200,
  FastingBS: 0,
  RestingECG: "Normal",
  MaxHR: 150,
  ExerciseAngina: "N",
  Oldpeak: 0,
  ST_Slope: "Up",
};

const numericFields = [
  {
    key: "Age",
    label: "Age (years)",
    min: 18,
    max: 100,
    step: 1,
  },
  {
    key: "RestingBP",
    label: "Resting Blood Pressure (mmHg)",
    min: 60,
    max: 250,
    step: 1,
  },
  {
    key: "Cholesterol",
    label: "Cholesterol (mg/dL)",
    min: 0,
    max: 700,
    step: 1,
  },
  {
    key: "MaxHR",
    label: "Maximum Heart Rate (bpm)",
    min: 60,
    max: 250,
    step: 1,
  },
  {
    key: "Oldpeak",
    label: "ST Depression",
    min: -3,
    max: 7,
    step: 0.1,
  },
] as const;

const categoricalFields = [
  {
    key: "Sex",
    label: "Sex",
    options: [
      { value: "M", label: "Male" },
      { value: "F", label: "Female" },
    ],
  },
  {
    key: "ChestPainType",
    label: "Chest Pain Type",
    options: [
      { value: "TA", label: "Typical Angina" },
      { value: "ATA", label: "Atypical Angina" },
      { value: "NAP", label: "Non-Anginal Pain" },
      { value: "ASY", label: "Asymptomatic" },
    ],
  },
  {
    key: "FastingBS",
    label: "Fasting Blood Sugar",
    options: [
      { value: "0", label: "Not above 120 mg/dL" },
      { value: "1", label: "Above 120 mg/dL" },
    ],
  },
  {
    key: "RestingECG",
    label: "Resting ECG",
    options: [
      { value: "Normal", label: "Normal" },
      { value: "ST", label: "ST-T Wave Abnormality" },
      { value: "LVH", label: "Left Ventricular Hypertrophy" },
    ],
  },
  {
    key: "ExerciseAngina",
    label: "Exercise-Induced Angina",
    options: [
      { value: "N", label: "No" },
      { value: "Y", label: "Yes" },
    ],
  },
  {
    key: "ST_Slope",
    label: "ST Segment Slope",
    options: [
      { value: "Up", label: "Upsloping" },
      { value: "Flat", label: "Flat" },
      { value: "Down", label: "Downsloping" },
    ],
  },
] as const;

const featureNames: Record<string, string> = {
  Age: "Age",
  RestingBP: "Resting Blood Pressure",
  Cholesterol: "Cholesterol",
  MaxHR: "Maximum Heart Rate",
  Oldpeak: "ST Depression",
  FastingBS: "Fasting Blood Sugar",
  Sex: "Sex",
  ChestPainType: "Chest Pain Type",
  RestingECG: "Resting ECG",
  ExerciseAngina: "Exercise-Induced Angina",
  ST_Slope: "ST Segment Slope",
  MaxHR_Age_Ratio: "Heart Rate Relative to Age",
};

const categoryNames: Record<string, string> = {
  M: "Male",
  F: "Female",
  TA: "Typical Angina",
  ATA: "Atypical Angina",
  NAP: "Non-Anginal Pain",
  ASY: "Asymptomatic",
  Y: "Yes",
  N: "No",
  Up: "Upsloping",
  Flat: "Flat",
  Down: "Downsloping",
  Normal: "Normal",
  ST: "ST-T Wave Abnormality",
  LVH: "Left Ventricular Hypertrophy",
};

function getFeatureLabel(feature: string): string {
  const cleaned = feature.replace(/^(num__|cat__)/, "");

  if (featureNames[cleaned]) {
    return featureNames[cleaned];
  }

  const matchingKey = Object.keys(featureNames)
    .filter((key) => cleaned.startsWith(`${key}_`))
    .sort((a, b) => b.length - a.length)[0];

  if (matchingKey) {
    const category = cleaned.slice(matchingKey.length + 1);

    return `${featureNames[matchingKey]} — ${
      categoryNames[category] ?? category
    }`;
  }

  return cleaned.replaceAll("_", " ");
}

function getPatientFinding(
  explanation: Explanation,
  patient: PatientData
): string {
  const feature = explanation.feature;

  if (feature.startsWith("cat__")) {
    return explanation.feature_value >= 0.5
      ? "Category present"
      : "Category not present";
  }

  if (feature === "num__Age") {
    return `${patient.Age} years`;
  }

  if (feature === "num__RestingBP") {
    return `${patient.RestingBP} mmHg`;
  }

  if (feature === "num__Cholesterol") {
    return patient.Cholesterol === 0
      ? "Not recorded"
      : `${patient.Cholesterol} mg/dL`;
  }

  if (feature === "num__MaxHR") {
    return `${patient.MaxHR} bpm`;
  }

  if (feature === "num__Oldpeak") {
    return String(patient.Oldpeak);
  }

  if (feature === "num__FastingBS") {
    return patient.FastingBS === 1
      ? "Above 120 mg/dL"
      : "Not above 120 mg/dL";
  }

  if (feature === "num__MaxHR_Age_Ratio") {
    return "Calculated from age and heart rate";
  }

  return "";
}


function calculateAge(
  dateOfBirth: string | null
): number | null {
  if (!dateOfBirth) return null;

  const datePart = dateOfBirth.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const birthDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() + 1 !== month ||
    birthDate.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();

  let age = today.getUTCFullYear() - year;

  if (
    today.getUTCMonth() + 1 < month ||
    (
      today.getUTCMonth() + 1 === month &&
      today.getUTCDate() < day
    )
  ) {
    age--;
  }

  return age >= 0 ? age : null;
}


function getErrorMessage(
  details: unknown,
  fallback: string
): string {
  if (
    details &&
    typeof details === "object" &&
    "detail" in details
  ) {
    const detail = (
      details as { detail?: unknown }
    ).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item?.msg === "string"
            ? item.msg
            : "Invalid information"
        )
        .join("; ");
    }
  }

  return fallback;
}

export default function PredictionPage() {
  const [registeredPatients, setRegisteredPatients] =
    useState<RegisteredPatient[]>([]);

  const [selectedPatient, setSelectedPatient] =
    useState<RegisteredPatient | null>(null);

  const [patientSearch, setPatientSearch] = useState("");
  const [patientsLoading, setPatientsLoading] =
    useState(false);
  const [patientsError, setPatientsError] = useState("");

  const [patient, setPatient] =
    useState<PatientData>(initialData);

  const [result, setResult] =
    useState<PredictionResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [evidence, setEvidence] =
    useState<MedicalEvidence | null>(null);

  const [evidenceLoading, setEvidenceLoading] =
    useState(false);

  const [evidenceError, setEvidenceError] = useState("");

  const [savingAssessment, setSavingAssessment] =
    useState(false);

  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [savedAssessmentId, setSavedAssessmentId] =
    useState<number | null>(null);

  const requestVersion = useRef(0);
  const patientSearchVersion = useRef(0);
  const savingRef = useRef(false);
  const [evidenceSaved, setEvidenceSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPatients() {
      setPatientsLoading(true);
      setPatientsError("");

      try {
        const response = await fetch(
          `${API}/api/patients/`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        const details = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              details,
              `Unable to load patients (HTTP ${response.status}).`
            )
          );
        }

        if (!Array.isArray(details)) {
          throw new Error("Invalid patient list response.");
        }

        if (!controller.signal.aborted) {
          setRegisteredPatients(details);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setPatientsError(
            err instanceof Error
              ? err.message
              : "Unable to load registered patients."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setPatientsLoading(false);
        }
      }
    }

    void loadPatients();

    return () => controller.abort();
  }, []);

  function clearEvidence() {
    requestVersion.current += 1;

    setEvidence(null);
    setEvidenceError("");
    setEvidenceLoading(false);
  }

  function clearSaveMessages() {
    setSaveMessage("");
    setSaveError("");
    setSavedAssessmentId(null);
    setEvidenceSaved(false);
  }

  function invalidateAssessment() {
    requestVersion.current += 1;
    setResult(null);
    setError("");
    setLoading(false);
    setEvidence(null);
    setEvidenceError("");
    setEvidenceLoading(false);
    clearSaveMessages();
  }

  function updateField<K extends keyof PatientData>(
    key: K,
    value: PatientData[K]
  ) {
    if (savingRef.current) return;

    setPatient((previous) => ({
      ...previous,
      [key]: value,
    }));

    invalidateAssessment();
  }

  function selectRegisteredPatient(
    selected: RegisteredPatient
  ) {
    if (savingRef.current) return;

    setSelectedPatient(selected);
    setPatientSearch(
      `${selected.patient_reference} — ${selected.full_name}`
    );

    setPatientsError("");

    const age = calculateAge(selected.date_of_birth);

    setPatient((previous) => ({
      ...previous,
      Age:
        age !== null && age >= 18 && age <= 100
          ? age
          : previous.Age,
      Sex:
        selected.sex === "M" || selected.sex === "F"
          ? selected.sex
          : previous.Sex,
    }));

    invalidateAssessment();
  }

  function clearSelectedPatient() {
    if (savingRef.current) return;

    setSelectedPatient(null);
    setPatientSearch("");
    invalidateAssessment();
  }

  async function searchPatients() {
    const version = ++patientSearchVersion.current;

    setPatientsLoading(true);
    setPatientsError("");

    try {
      const query = patientSearch.trim();

      const url = new URL(`${API}/api/patients/`);

      if (query && !selectedPatient) {
        url.searchParams.set("search", query);
      }

      const response = await fetch(url.toString(), {
        credentials: "include",
      });

      const details = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            details,
            `Patient search failed (HTTP ${response.status}).`
          )
        );
      }

      if (!Array.isArray(details)) {
        throw new Error("Invalid patient search response.");
      }

      if (version === patientSearchVersion.current) {
        setRegisteredPatients(details);
      }
    } catch (err) {
      if (version === patientSearchVersion.current) {
        setPatientsError(
          err instanceof Error
            ? err.message
            : "Unable to search patients."
        );
      }
    } finally {
      if (version === patientSearchVersion.current) {
        setPatientsLoading(false);
      }
    }
  }

  function resetForm() {
    if (savingRef.current) return;

    setPatient(initialData);
    setSelectedPatient(null);
    setPatientSearch("");
    invalidateAssessment();
  }

  async function handlePrediction(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedPatient) {
      setError(
        "Please select a registered patient before generating an assessment."
      );
      return;
    }

    if (loading || savingRef.current) return;

    invalidateAssessment();

    const calculatedAge = calculateAge(selectedPatient.date_of_birth);
    if (calculatedAge === null) {
      setError("The selected patient does not have a valid date of birth. Please update the patient profile before assessment.");
      return;
    }
    if (calculatedAge < 18 || calculatedAge > 100) {
      setError("The calculated age is outside the supported range of 18 to 100 years.");
      return;
    }
    if (!Number.isInteger(patient.MaxHR) || patient.MaxHR < 60 || patient.MaxHR > 250) {
      setError("Maximum Heart Rate must be between 60 and 250 bpm.");
      return;
    }
    const validatedPatientData: PatientData = { ...patient, Age: calculatedAge };
    setPatient(validatedPatientData);

    const currentVersion = requestVersion.current;

    setLoading(true);

    try {
      const response = await fetch(
        `${API}/api/prediction/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            patient_id: selectedPatient.id,
            patient_data: validatedPatientData,
          }),
        }
      );

      if (!response.ok) {
        const details = await response
          .json()
          .catch(() => null);

        throw new Error(
          getErrorMessage(
            details,
            `Assessment request failed (HTTP ${response.status}).`
          )
        );
      }

      const data: PredictionResponse =
        await response.json();

      if (currentVersion === requestVersion.current) {
        setResult(data);
      }
    } catch (err) {
      if (currentVersion === requestVersion.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to generate assessment."
        );
      }
    } finally {
      if (currentVersion === requestVersion.current) {
        setLoading(false);
      }
    }
  }

  async function loadMedicalEvidence() {
    if (!result || evidenceLoading || savingRef.current || evidenceSaved) {
      return;
    }

    setEvidenceLoading(true);
    setEvidenceError("");
    setEvidence(null);

    const currentVersion = ++requestVersion.current;

    const question = [
      "Summarize supporting medical evidence relevant to",
      "heart disease assessment and clinical risk factors.",
      `Age: ${patient.Age} years.`,
      `Sex: ${patient.Sex === "M" ? "Male" : "Female"}.`,
      `Resting blood pressure: ${patient.RestingBP} mmHg.`,
      `Cholesterol: ${
        patient.Cholesterol === 0
          ? "Not recorded"
          : `${patient.Cholesterol} mg/dL`
      }.`,
      `Chest pain: ${patient.ChestPainType}.`,
      `Fasting blood sugar above 120 mg/dL: ${
        patient.FastingBS === 1 ? "Yes" : "No"
      }.`,
      `Resting ECG: ${patient.RestingECG}.`,
      `Maximum heart rate: ${patient.MaxHR} bpm.`,
      `Exercise-induced angina: ${
        patient.ExerciseAngina === "Y" ? "Yes" : "No"
      }.`,
      `ST depression: ${patient.Oldpeak}.`,
      `ST segment slope: ${patient.ST_Slope}.`,
      `Model probability for no heart disease: ${(
        result.probability_class_0 * 100
      ).toFixed(1)}%.`,
      `Model probability for heart disease: ${(
        result.probability_class_1 * 100
      ).toFixed(1)}%.`,
      "These are model estimates, not a diagnosis.",
      "Explain relevant clinical considerations in clear language.",
      "Use retrieved medical sources and avoid making a diagnosis.",
    ].join(" ");

    try {
      const response = await fetch(
        `${API}/api/chat/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            question,
            top_k: 5,
          }),
        }
      );

      if (!response.ok) {
        const details = await response
          .json()
          .catch(() => null);

        throw new Error(
          getErrorMessage(
            details,
            `Unable to retrieve medical evidence (HTTP ${response.status}).`
          )
        );
      }

      const data: MedicalEvidence =
        await response.json();

      if (currentVersion === requestVersion.current) {
        setEvidence(data);
      }
    } catch (err) {
      if (currentVersion === requestVersion.current) {
        setEvidenceError(
          err instanceof Error
            ? err.message
            : "Unable to retrieve medical evidence."
        );
      }
    } finally {
      if (currentVersion === requestVersion.current) {
        setEvidenceLoading(false);
      }
    }
  }

  function evidenceAttachment() {
    if (!evidence || !result || !selectedPatient) return null;
    return {
      patient_id: selectedPatient.id,
      patient_data: patient,
      predicted_class: result.predicted_class,
      probability_class_0: result.probability_class_0,
      probability_class_1: result.probability_class_1,
      medical_evidence: evidence,
    };
  }

  async function saveEvidenceToExistingAssessment() {
    const attachment = evidenceAttachment();
    if (!attachment || savedAssessmentId === null || savingRef.current || evidenceSaved || evidenceLoading) return;
    savingRef.current = true;
    setSavingAssessment(true);
    setSaveError("");
    try {
      const response = await fetch(`${API}/api/assessments/${savedAssessmentId}/medical-evidence`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attachment),
      });
      if (!response.ok) throw new Error(getErrorMessage(await response.json().catch(() => null), `Evidence save failed (HTTP ${response.status}).`));
      setEvidenceSaved(true);
      setSaveMessage(`Medical evidence saved to assessment #${savedAssessmentId}.`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save medical evidence.");
    } finally {
      savingRef.current = false;
      setSavingAssessment(false);
    }
  }

  async function handleSaveAssessment() {
    if (!selectedPatient) {
      setSaveError(
        "Please select a registered patient before saving."
      );
      setSaveMessage("");
      return;
    }

    if (!result) {
      setSaveError(
        "Generate a prediction before saving."
      );
      setSaveMessage("");
      return;
    }

    if (savingRef.current || evidenceLoading || savedAssessmentId !== null) {
      return;
    }

    const calculatedAge = calculateAge(selectedPatient.date_of_birth);
    if (calculatedAge === null || calculatedAge < 18 || calculatedAge > 100 || calculatedAge !== patient.Age) {
      setSaveError("Patient age is invalid or has changed. Generate a new assessment before saving.");
      return;
    }
    if (!Number.isInteger(patient.MaxHR) || patient.MaxHR < 60 || patient.MaxHR > 250) {
      setSaveError("Maximum Heart Rate must be between 60 and 250 bpm.");
      return;
    }

    savingRef.current = true;
    setSavingAssessment(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const response = await fetch(
        `${API}/api/assessments/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            patient_id: selectedPatient.id,
            patient_reference:
              selectedPatient.patient_reference,
            patient_data: { ...patient, Age: calculatedAge },
            evidence_attachment: evidenceAttachment(),
          }),
        }
      );

      if (!response.ok) {
        const details = await response
          .json()
          .catch(() => null);

        let message = getErrorMessage(
          details,
          `Save failed (HTTP ${response.status}).`
        );

        if (response.status === 401) {
          message =
            "Your session has expired. Please log in again.";
        } else if (response.status === 403) {
          message =
            "Only doctors can save assessments.";
        } else if (response.status === 404) {
          message =
            "The selected patient was not found. Refresh the patient list.";
        }

        throw new Error(message);
      }

      const saved: SavedAssessment =
        await response.json();

      setSavedAssessmentId(saved.id);
      setEvidenceSaved(evidence !== null);

      setSaveMessage(
        `Assessment #${saved.id} saved successfully for ${selectedPatient.full_name} (${selectedPatient.patient_reference}).`
      );
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : "Unable to save assessment."
      );
    } finally {
      savingRef.current = false;
      setSavingAssessment(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const validExplanations =
    result?.shap_explanations
      .filter(
        (item) =>
          typeof item.shap_value === "number" &&
          Number.isFinite(item.shap_value)
      )
      .sort(
        (a, b) =>
          Math.abs(b.shap_value) -
          Math.abs(a.shap_value)
      )
      .slice(0, 10) ?? [];

  const maxContribution = Math.max(
    ...validExplanations.map((item) =>
      Math.abs(item.shap_value)
    ),
    0.000001
  );

  return (
    <main className="min-h-screen bg-[#f3f7fd] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              HeartCare / Risk Assessment
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Heart Disease Risk Assessment
            </h1>

            <p className="mt-2 text-slate-500">
              Select a registered patient, enter clinical
              measurements and review the model assessment
              and supporting medical evidence.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/patients"
              className="rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Patients
            </Link>

            <Link
              href="/"
              className="rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="mb-7 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Select Registered Patient
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Search by patient name or reference ID.
                Assessments will be linked to the selected
                patient record.
              </p>
            </div>

            <Link
              href="/patients/new"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Add New Patient
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={patientSearch}
              disabled={savingAssessment}
              onChange={(event) => {
                setPatientSearch(event.target.value);

                if (selectedPatient) {
                  setSelectedPatient(null);
                  invalidateAssessment();
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchPatients();
                }
              }}
              placeholder="Search name or ID, e.g. PAT-001"
              className={`${inputClass} mt-0 flex-1`}
            />

            <button
              type="button"
              onClick={searchPatients}
              disabled={patientsLoading || savingAssessment}
              className="rounded-xl bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {patientsLoading ? "Searching..." : "Search"}
            </button>

            <button
              type="button"
              onClick={() => {
                clearSelectedPatient();
                void searchPatients();
              }}
              disabled={savingAssessment}
              className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>

          {patientsError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {patientsError}
            </p>
          )}

          {!selectedPatient && (
            <div className="mt-5 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              {registeredPatients.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">
                  {patientsLoading
                    ? "Loading patients..."
                    : "No matching patients found. Register a patient first."}
                </p>
              ) : (
                registeredPatients.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    disabled={savingAssessment}
                    onClick={() =>
                      selectRegisteredPatient(record)
                    }
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 text-left last:border-b-0 hover:bg-blue-50 disabled:opacity-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {record.full_name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {record.patient_reference}
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-blue-700">
                      Select
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedPatient && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Selected Patient
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-slate-900">
                    {selectedPatient.full_name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-700">
                    Patient ID:{" "}
                    <strong>
                      {selectedPatient.patient_reference}
                    </strong>
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Database record #{selectedPatient.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedPatient}
                  disabled={savingAssessment}
                  className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Change Patient
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Date of Birth
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    {selectedPatient.date_of_birth
                      ? selectedPatient.date_of_birth.slice(0, 10)
                      : "Not recorded"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Registered Sex
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    {selectedPatient.sex === "M"
                      ? "Male"
                      : selectedPatient.sex === "F"
                        ? "Female"
                        : "Not recorded"}
                  </p>
                </div>
              </div>

              <h4 className="mt-6 font-bold text-slate-900">
                Recorded Medical History
              </h4>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {[
                  {
                    label: "Medical History",
                    value: selectedPatient.medical_history,
                  },
                  {
                    label: "Family History",
                    value: selectedPatient.family_history,
                  },
                  {
                    label: "Current Medications",
                    value: selectedPatient.medications,
                  },
                  {
                    label: "Allergies",
                    value: selectedPatient.allergies,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-blue-100 bg-white p-4"
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      {item.label}
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                      {item.value?.trim() || "Not recorded"}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-600">
                Registered age and sex have been used to
                initialize the clinical form when available.
                Verify all clinical measurements before
                generating the assessment.
              </p>
            </div>
          )}
        </section>

        <form onSubmit={handlePrediction}>
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-bold text-slate-900">
              Patient Clinical Information
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Enter the measurements for the selected patient.
              The initial values are examples and must be
              replaced with the intended clinical values.
            </p>

            {!selectedPatient && (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Select a registered patient above before
                generating an assessment.
              </p>
            )}

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {numericFields.map((field) => (
                <label
                  key={field.key}
                  className="text-sm font-medium text-slate-700"
                >
                  {field.label}


                  <input
                    type="number"
                    required={field.key !== "Age"}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={field.key === "Age"
                      ? calculateAge(selectedPatient?.date_of_birth ?? null) ?? ""
                      : Number.isNaN(patient[field.key]) ? "" : patient[field.key]}
                    readOnly={field.key === "Age"}
                    disabled={savingAssessment}
                    onChange={(event) => {
                      if (field.key === "Age") return;
                      updateField(field.key, event.target.value === "" ? Number.NaN : Number(event.target.value));
                    }}
                    className={`${inputClass} ${field.key === "Age" ? "cursor-not-allowed bg-slate-100" : ""}`}
                  />
                  {field.key === "Age" && (
                    <span className="mt-1 block text-xs text-slate-500">
                      Automatically calculated from registered date of birth.
                    </span>
                  )}
                </label>
              ))}

              {categoricalFields.map((field) => (
                <label
                  key={field.key}
                  className="text-sm font-medium text-slate-700"
                >
                  {field.label}

                  <select
                    required
                    value={String(patient[field.key])}
                    disabled={savingAssessment}
                    onChange={(event) => {
                      const value =
                        field.key === "FastingBS"
                          ? (Number(event.target.value) as 0 | 1)
                          : event.target.value;

                      updateField(
                        field.key,
                        value as PatientData[typeof field.key]
                      );
                    }}
                    className={inputClass}
                  >
                    {field.options.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  loading ||
                  savingAssessment ||
                  !selectedPatient
                }
                className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Generating Assessment..."
                  : "Generate Risk Assessment"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={savingAssessment}
                className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Reset Form
              </button>
            </div>
          </section>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
          >
            {error}
          </div>
        )}

        {result && selectedPatient && (
          <div className="mt-7 space-y-6">

            <section className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Heart Disease Assessment Results
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Assessment for{" "}
                <strong>{selectedPatient.full_name}</strong>
                {" "}({selectedPatient.patient_reference})
              </p>

              <div
                className={`mt-6 rounded-xl border p-5 ${
                  result.predicted_class === 0
                    ? "border-emerald-200 bg-emerald-50"
                    : result.predicted_class === 1
                      ? "border-rose-200 bg-rose-50"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <h3
                  className={`text-xl font-bold ${
                    result.predicted_class === 0
                      ? "text-emerald-800"
                      : result.predicted_class === 1
                        ? "text-rose-800"
                        : "text-slate-800"
                  }`}
                >
                  {result.predicted_class === 0
                    ? "Heart Disease Not Indicated by Model"
                    : result.predicted_class === 1
                      ? "Heart Disease Indicated by Model"
                      : "Assessment Outcome Unavailable"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {result.predicted_class === 0
                    ? "The model predicts the absence of heart disease based on the information provided. This result does not rule out heart disease."
                    : result.predicted_class === 1
                      ? "The model identified patterns associated with heart disease. Further clinical evaluation is needed to determine whether heart disease is present."
                      : "The assessment returned an unrecognized outcome. Please review the result."}
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                  <p className="text-sm font-medium text-slate-700">
                    No Heart Disease
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-700">
                    {(result.probability_class_0 * 100).toFixed(1)}%
                  </p>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            result.probability_class_0 * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Model-estimated probability
                  </p>
                </div>

                <div className="rounded-xl border border-rose-100 bg-rose-50 p-5">
                  <p className="text-sm font-medium text-slate-700">
                    Heart Disease
                  </p>

                  <p className="mt-2 text-3xl font-bold text-rose-700">
                    {(result.probability_class_1 * 100).toFixed(1)}%
                  </p>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-rose-100">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            result.probability_class_1 * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Model-estimated probability
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm text-slate-500">
                These results are generated by a prediction
                model. They are not a confirmed diagnosis or
                a validated clinical risk score. Clinical
                evaluation and professional judgment remain
                essential.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Factors Influencing This Assessment
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                The chart shows which patient characteristics
                had the greatest influence on the model's
                assessment.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-center">
                  <p className="text-sm font-semibold text-blue-700">
                    ← Toward No Heart Disease
                  </p>
                </div>

                <div className="rounded-xl bg-rose-50 p-3 text-center">
                  <p className="text-sm font-semibold text-rose-700">
                    Toward Heart Disease →
                  </p>
                </div>
              </div>

              {validExplanations.length === 0 ? (
                <p className="mt-6 text-slate-500">
                  No explanation data is available.
                </p>
              ) : (
                <div className="mt-7 space-y-6">
                  {validExplanations.map((item, index) => {
                    const value = item.shap_value;

                    const width =
                      (Math.abs(value) / maxContribution) * 100;

                    const label =
                      getFeatureLabel(item.feature);

                    const finding =
                      getPatientFinding(item, patient);

                    return (
                      <div key={`${item.feature}-${index}`}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {label}
                            </p>

                            {finding && (
                              <p className="mt-1 text-xs text-slate-500">
                                Patient finding: {finding}
                              </p>
                            )}
                          </div>

                          <span className="text-xs font-medium text-slate-500">
                            {value > 0 ? "+" : ""}
                            {value.toFixed(3)}
                          </span>
                        </div>

                        <div className="grid h-4 grid-cols-2">
                          <div className="flex justify-end border-r border-slate-400">
                            {value < 0 && (
                              <div
                                className="h-full rounded-l bg-blue-500"
                                style={{
                                  width: `${width}%`,
                                }}
                              />
                            )}
                          </div>

                          <div>
                            {value > 0 && (
                              <div
                                className="h-full rounded-r bg-rose-500"
                                style={{
                                  width: `${width}%`,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-6 text-xs text-slate-600">
                <span>
                  <span className="mr-2 text-blue-500">
                    ●
                  </span>
                  Toward No Heart Disease
                </span>

                <span>
                  <span className="mr-2 text-rose-500">
                    ●
                  </span>
                  Toward Heart Disease
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Blue bars show factors moving the model's
                assessment toward no heart disease. Red bars
                show factors moving the assessment toward
                heart disease. Longer bars indicate greater
                influence on the model's prediction.
                These contributions are not percentage
                changes in disease probability.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Supporting Medical Evidence
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Review relevant medical literature and
                clinical considerations associated with
                this assessment.
              </p>

              <button
                type="button"
                onClick={loadMedicalEvidence}
                disabled={evidenceLoading || savingAssessment || evidenceSaved}
                className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {evidenceSaved ? "Medical Evidence Saved" : evidenceLoading
                  ? "Retrieving Medical Evidence..."
                  : evidence
                    ? "Refresh Medical Evidence"
                    : "Review Supporting Medical Evidence"}
              </button>

              {evidenceLoading && (
                <p className="mt-4 text-sm text-slate-500">
                  Searching medical sources and preparing
                  the evidence summary. This may take a moment.
                </p>
              )}

              {evidenceError && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {evidenceError}
                </div>
              )}

              {evidence && (
                <div className="mt-6 space-y-6">

                  <div className="rounded-xl bg-blue-50 p-5">
                    <h3 className="font-semibold text-slate-900">
                      BioMistral Answer
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {evidence.answer}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Supporting Medical Sources
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      AI-generated explanations of retrieved
                      medical documents. Verify important
                      claims against the original sources.
                    </p>

                    {evidence.sources.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        No supporting source summaries were returned.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {evidence.sources.map(
                          (source, index) => (
                            <div
                              key={`${source.rank}-${index}`}
                              className="rounded-xl border border-slate-200 bg-white p-5"
                            >
                              <h4 className="font-semibold text-slate-900">
                                {source.title
                                  .replace(/\.pdf$/i, "")
                                  .trim()}
                              </h4>

                              {source.summary?.trim() ? (
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                  {source.summary}
                                </p>
                              ) : (
                                <p className="mt-3 text-sm text-slate-500">
                                  No readable explanation
                                  is available for this document.
                                </p>
                              )}

                              {source.url &&
                                /^https?:\/\//i.test(source.url) && (
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline"
                                  >
                                    View Original Medical Document
                                  </a>
                                )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {savedAssessmentId !== null && !evidenceSaved && (
                    <button type="button" onClick={saveEvidenceToExistingAssessment}
                      disabled={savingAssessment || evidenceLoading}
                      className="rounded-xl bg-green-700 px-6 py-3 font-semibold text-white disabled:opacity-50">
                      {savingAssessment ? "Saving Medical Evidence..." : "Save Medical Evidence to Assessment"}
                    </button>
                  )}
                  {evidenceSaved && <p role="status" className="text-sm font-semibold text-green-700">Medical evidence saved successfully.</p>}
                  {saveError && savedAssessmentId !== null && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
                
                  <p className="text-xs leading-5 text-slate-500">
                    This information is generated using
                    retrieved medical literature and an
                    AI language model. The summaries may
                    contain errors or omissions. Review
                    original sources and current clinical
                    guidance before making clinical decisions.
                    This is decision support, not a confirmed
                    diagnosis.
                  </p>
                </div>
              )}
            </section>
         
            <section className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Save Patient Assessment
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Save the assessment of this patient.
              </p>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedPatient.full_name}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Patient Reference:{" "}
                  {selectedPatient.patient_reference}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Database Patient ID: {selectedPatient.id}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveAssessment}
                disabled={
                  savingAssessment ||
                  evidenceLoading ||
                  !result ||
                  savedAssessmentId !== null
                }
                className="mt-5 rounded-xl bg-green-700 px-7 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAssessment
                  ? "Saving Assessment..."
                  : savedAssessmentId !== null
                    ? "Assessment Saved"
                    : "Save Assessment"}
              </button>

              {saveMessage && (
                <div
                  role="status"
                  className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700"
                >
                  <p>{saveMessage}</p>

                  {savedAssessmentId !== null && (
                    <Link
                      href={`/assessments/${savedAssessmentId}`}
                      className="mt-3 inline-block font-semibold text-blue-700 underline"
                    >
                      View Saved Assessment
                    </Link>
                  )}
                </div>
              )}

              {saveError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {saveError}
                </p>
              )}

              <p className="mt-4 text-xs text-slate-500">
                {evidenceSaved ? "Medical evidence is saved with this assessment." : evidence ? "Medical evidence is ready to save.":""}
              </p>
            </section>

          </div>
        )}
      </div>
    </main>
  );
}
