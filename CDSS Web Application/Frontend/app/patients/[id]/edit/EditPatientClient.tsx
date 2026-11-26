
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

type EditForm = {
  full_name: string;
  date_of_birth: string;
  sex: string;
  medical_history: string;
  family_history: string;
  medications: string;
  allergies: string;
};

const EMPTY_FORM: EditForm = {
  full_name: "",
  date_of_birth: "",
  sex: "",
  medical_history: "",
  family_history: "",
  medications: "",
  allergies: "",
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
    return "Only doctors can edit patient details.";
  }

  return fallback;
}

export default function EditPatientClient({
  patientId,
}: {
  patientId: string;
}) {
  const router = useRouter();

  const [patient, setPatient] =
    useState<Patient | null>(null);

  const [form, setForm] =
    useState<EditForm>(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [maxDate, setMaxDate] = useState("");

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

  useEffect(() => {
    const controller = new AbortController();

    async function loadPatient() {
      setLoading(true);
      setError("");

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
            await readError(
              response,
              `Unable to load patient (HTTP ${response.status}).`
            )
          );
        }

        const data: Patient = await response.json();

        if (controller.signal.aborted) return;

        setPatient(data);

        setForm({
          full_name: data.full_name,
          date_of_birth: data.date_of_birth
            ? data.date_of_birth.slice(0, 10)
            : "",
          sex: data.sex ?? "",
          medical_history:
            data.medical_history ?? "",
          family_history:
            data.family_history ?? "",
          medications:
            data.medications ?? "",
          allergies:
            data.allergies ?? "",
        });
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

    if (/^[1-9]\d*$/.test(patientId)) {
      void loadPatient();
    } else {
      setError("Invalid patient ID.");
      setLoading(false);
    }

    return () => controller.abort();
  }, [patientId]);

  function updateField(
    field: keyof EditForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!patient || saving) return;

    setError("");

    if (!form.full_name.trim()) {
      setError("Patient full name is required.");
      return;
    }

    if (
      form.date_of_birth &&
      maxDate &&
      form.date_of_birth > maxDate
    ) {
      setError(
        "Date of birth cannot be in the future."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth
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
      };

      const response = await fetch(
        `${API_URL}/api/patients/${patient.id}`,
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
          await readError(
            response,
            `Unable to update patient (HTTP ${response.status}).`
          )
        );
      }

      router.replace(`/patients/${patient.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save patient changes."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass =
    "block text-sm font-semibold text-slate-700";

  return (
    <main className="min-h-screen bg-[#f3f7fd] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              HeartCare / Patients / Edit
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Edit Patient Details
            </h1>

            <p className="mt-2 text-slate-500">
              Update patient information and medical background.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Back to Dashboard
            </Link>

            <Link
              href={`/patients/${patientId}`}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Cancel Editing
            </Link>
          </div>
        </header>

        {loading && (
          <p className="text-slate-500">
            Loading patient details...
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!loading && patient && (
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-6"
          >
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-bold text-slate-900">
                Patient Information
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="patient-reference"
                    className={labelClass}
                  >
                    Patient Reference
                  </label>

                  <input
                    id="patient-reference"
                    value={patient.patient_reference}
                    readOnly
                    className={`${inputClass} bg-slate-50 text-slate-500`}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Patient Reference cannot be changed.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="full-name"
                    className={labelClass}
                  >
                    Full Name *
                  </label>

                  <input
                    id="full-name"
                    type="text"
                    maxLength={150}
                    required
                    value={form.full_name}
                    onChange={(event) =>
                      updateField(
                        "full_name",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="date-of-birth"
                    className={labelClass}
                  >
                    Date of Birth
                  </label>

                  <input
                    id="date-of-birth"
                    type="date"
                    max={maxDate || undefined}
                    value={form.date_of_birth}
                    onChange={(event) =>
                      updateField(
                        "date_of_birth",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="sex"
                    className={labelClass}
                  >
                    Sex
                  </label>

                  <select
                    id="sex"
                    value={form.sex}
                    onChange={(event) =>
                      updateField(
                        "sex",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Not recorded
                    </option>
                    <option value="M">
                      Male
                    </option>
                    <option value="F">
                      Female
                    </option>
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-bold text-slate-900">
                Medical Background
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Record updates to the patient's clinical background.
                Leave a field empty if no information is recorded.
              </p>

              <div className="mt-6 space-y-5">
                {(
                  [
                    ["medical_history", "Medical History"],
                    ["family_history", "Family History"],
                    ["medications", "Current Medications"],
                    ["allergies", "Allergies"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label
                      htmlFor={field}
                      className={labelClass}
                    >
                      {label}
                    </label>

                    <textarea
                      id={field}
                      rows={4}
                      value={form[field]}
                      onChange={(event) =>
                        updateField(
                          field,
                          event.target.value
                        )
                      }
                      placeholder={`Enter ${label.toLowerCase()}...`}
                      className={`${inputClass} resize-y`}
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-3">
              <Link
                href={`/patients/${patient.id}`}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving Changes..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
