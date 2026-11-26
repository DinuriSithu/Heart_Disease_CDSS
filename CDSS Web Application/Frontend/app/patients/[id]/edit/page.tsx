import { Suspense } from "react";
import EditPatientClient from "./EditPatientClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function EditPatientContent({
  params,
}: PageProps) {
  const { id } = await params;

  return <EditPatientClient patientId={id} />;
}

export default function EditPatientPage({
  params,
}: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f3f7fd] px-5 py-8 md:px-10">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-2xl font-bold text-slate-900">
              Loading Patient Editor...
            </h1>
            <p className="mt-3 text-slate-500">
              Preparing patient information.
            </p>
          </div>
        </main>
      }
    >
      <EditPatientContent params={params} />
    </Suspense>
  );
}
