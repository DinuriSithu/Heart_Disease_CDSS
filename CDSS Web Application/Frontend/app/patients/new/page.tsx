
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

type PatientForm = {
  patient_reference: string;
  full_name: string;
  date_of_birth: string;
  sex: string;
  medical_history: string;
  family_history: string;
  medications: string;
  allergies: string;
};

type CreatedPatient = {
  id: number;
  patient_reference: string;
  full_name: string;
};

const initialForm: PatientForm = {
  patient_reference: "",
  full_name: "",
  date_of_birth: "",
  sex: "",
  medical_history: "",
  family_history: "",
  medications: "",
  allergies: "",
};

function getApiError(
  data: unknown,
  fallback: string
): string {
  if (
    data &&
    typeof data === "object" &&
    "detail" in data
  ) {
    const detail = (
      data as { detail?: unknown }
    ).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item?.msg === "string"
            ? item.msg
            : "Invalid patient information"
        )
        .join("; ");
    }
  }

  return fallback;
}

export default function AddPatientPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<PatientForm>(initialForm);

  const [maxDate, setMaxDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");


  useEffect(() => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      today.getDate()
    ).padStart(2, "0");

    setMaxDate(`${year}-${month}-${day}`);
  }, []);

  function updateField(
    field: keyof PatientForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    const reference =
      form.patient_reference.trim();

    const name = form.full_name.trim();

    if (!reference || !name) {
      setError(
        "Patient reference and full name are required."
      );
      return;
    }

    if (
      maxDate &&
      form.date_of_birth &&
      form.date_of_birth > maxDate
    ) {
      setError(
        "Date of birth cannot be in the future."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/patients/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            patient_reference: reference,
            full_name: name,

            date_of_birth:
              form.date_of_birth
                ? `${form.date_of_birth}T00:00:00Z`
                : null,

            sex: form.sex || null,

            medical_history:
              form.medical_history.trim() || null,

            family_history:
              form.family_history.trim() || null,

            medications:
              form.medications.trim() || null,

            allergies:
              form.allergies.trim() || null,
          }),
        }
      );

      const details: unknown = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        let message = getApiError(
          details,
          `Registration failed (HTTP ${response.status}).`
        );

        if (response.status === 401) {
          message =
            "Your doctor session is missing or expired. Please log in again.";
        } else if (response.status === 403) {
          message =
            "Only doctors can register patients.";
        } else if (response.status === 409) {
          message =
            "A patient with this reference already exists.";
        }

        throw new Error(message);
      }

      const created = details as CreatedPatient;

      if (
        !created ||
        typeof created.id !== "number"
      ) {
        throw new Error(
          "Patient was created, but the server returned an unexpected response."
        );
      }

      setSuccess(
        `Patient ${created.patient_reference} registered successfully.`
      );

      router.push("/patients");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to register patient."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-[#f3f7fd] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-4xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              HeartCare / Patients / Add Patient
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Register New Patient
            </h1>

            <p className="mt-2 text-slate-500">
              Create a patient record and document
              relevant clinical history.
            </p>
          </div>

          <Link
            href="/patients"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Patients
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">

            <h2 className="text-xl font-bold text-slate-900">
              Patient Identification
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Fields marked with * are required.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <label className="text-sm font-semibold text-slate-700">
                Patient Reference *

                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.patient_reference}
                  disabled={loading}
                  onChange={(event) =>
                    updateField(
                      "patient_reference",
                      event.target.value
                    )
                  }
                  placeholder="e.g. PAT-002"
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Full Name *

                <input
                  type="text"
                  required
                  maxLength={150}
                  value={form.full_name}
                  disabled={loading}
                  onChange={(event) =>
                    updateField(
                      "full_name",
                      event.target.value
                    )
                  }
                  placeholder="Patient full name"
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Date of Birth

                <input
                  type="date"
                  max={maxDate || undefined}
                  value={form.date_of_birth}
                  disabled={loading}
                  onChange={(event) =>
                    updateField(
                      "date_of_birth",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Sex

                <select
                  value={form.sex}
                  disabled={loading}
                  onChange={(event) =>
                    updateField(
                      "sex",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select sex
                  </option>

                  <option value="M">
                    Male
                  </option>

                  <option value="F">
                    Female
                  </option>
                </select>
              </label>
            </div>

            <div className="my-8 border-t border-slate-100" />

            <h2 className="text-xl font-bold text-slate-900">
              Medical Background
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Record known medical information. Leave
              fields blank when information is unavailable.
            </p>

            <div className="mt-6 space-y-5">
              {(
                [
                  {
                    key: "medical_history",
                    label: "Medical History",
                    placeholder:
                      "Previous diagnoses, procedures, or relevant conditions...",
                  },
                  {
                    key: "family_history",
                    label: "Family History",
                    placeholder:
                      "Relevant family history of cardiovascular disease...",
                  },
                  {
                    key: "medications",
                    label: "Current Medications",
                    placeholder:
                      "Current prescribed medications...",
                  },
                  {
                    key: "allergies",
                    label: "Allergies",
                    placeholder:
                      "Known allergies and reactions...",
                  },
                ] as const
              ).map((field) => (
                <label
                  key={field.key}
                  className="block text-sm font-semibold text-slate-700"
                >
                  {field.label}

                  <textarea
                    rows={3}
                    value={form[field.key]}
                    disabled={loading}
                    onChange={(event) =>
                      updateField(
                        field.key,
                        event.target.value
                      )
                    }
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}

                {error.toLowerCase().includes("session") && (
                  <p className="mt-2">
                    Return to the login page, sign in
                    as a doctor, and try again.
                  </p>
                )}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700"
              >
                {success}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? "Registering Patient..."
                  : "Register Patient"}
              </button>

              <Link
                href="/patients"
                className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
