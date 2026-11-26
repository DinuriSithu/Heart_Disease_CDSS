
import { Suspense } from "react";
import AssessmentDetailsClient from "./AssessmentDetailsClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function AssessmentDetailsContent({
  params,
}: PageProps) {
  const { id } = await params;

  return <AssessmentDetailsClient assessmentId={id} />;
}

export default function AssessmentDetailsPage({
  params,
}: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f3f7fd] px-5 py-8 md:px-10">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-blue-600">
              HeartCare / Assessments
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Loading Assessment...
            </h1>

            <p className="mt-4 text-slate-500">
              Preparing assessment details.
            </p>
          </div>
        </main>
      }
    >
      <AssessmentDetailsContent params={params} />
    </Suspense>
  );
}
