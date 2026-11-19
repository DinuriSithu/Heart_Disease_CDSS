
"use client";

import { useState } from "react";
import Link from "next/link";

type Source = {
  rank: number;
  title: string;
  page: number | string | null;
  url: string | null;
  excerpt: string;
  summary?: string | null;
};

type ChatResponse = {
  question: string;
  answer: string;
  status: string;
  sources: Source[];
};

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (trimmedQuestion.length < 5) {
      setError(
        "Please enter a question with at least 5 characters."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/chat/ask",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            question: trimmedQuestion,
            top_k: 5,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `The medical chatbot is unavailable (HTTP ${response.status}).`
        );
      }

      const data: ChatResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the medical chatbot."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-blue-700 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mt-8 text-3xl font-bold text-slate-900">
          BioMistral Medical Chatbot
        </h1>

        <p className="mt-3 text-slate-600">
          Ask general questions about heart disease and
          review supporting medical evidence.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label
            htmlFor="question"
            className="block font-semibold text-slate-900"
          >
            Your medical question
          </label>

          <textarea
            id="question"
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            placeholder="What are the common risk factors for heart disease?"
            maxLength={1000}
            rows={4}
            className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-slate-900"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {loading
              ? "Generating answer..."
              : "Ask BioMistral"}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {result && (
          <section className="mt-8 space-y-6">
            {/* MAIN BIOMISTRAL ANSWER */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                BioMistral Answer
              </h2>

              <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">
                {result.answer}
              </p>
            </div>

            {/* READABLE SUPPORTING SOURCES */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Supporting Medical Sources
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                AI-generated explanations of the retrieved
                medical documents. Review the original
                documents to verify clinical claims.
              </p>

              {result.sources.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">
                  No readable supporting source summaries
                  are available for this answer.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {result.sources.map((source, index) => (
                    <article
                      key={`${source.rank}-${index}`}
                      className="rounded-lg border border-slate-200 p-5"
                    >
                      <h3 className="font-semibold text-slate-900">
                        {source.title
                          .replace(/\.pdf$/i, "")
                          .trim()}
                      </h3>

                      {source.summary?.trim() ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                          {source.summary}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">
                          No readable explanation is
                          available for this document.
                        </p>
                      )}

                      {source.url &&
                        /^https?:\/\//i.test(source.url) && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
                          >
                            View Original Medical Document
                          </a>
                        )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <p className="mt-8 text-sm text-slate-500">
          Academic demonstration only. Not intended for
          diagnosis, treatment decisions, or emergency
          medical advice. Do not enter identifiable patient
          information.
        </p>
      </div>
    </main>
  );
}
