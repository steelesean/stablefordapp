"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPlayerId } from "@/lib/client-storage";
import { COURSE, TEE_IDS, type TeeId } from "@/lib/course";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [scorerName, setScorerName] = useState("");
  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [teeId, setTeeId] = useState<TeeId>("white");
  const [prediction, setPrediction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdvance = scorerName.trim().length > 1;

  const canSubmit =
    scorerName.trim().length > 1 &&
    name.trim().length > 1 &&
    handicap.trim() !== "" &&
    !Number.isNaN(parseFloat(handicap));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scorerName: scorerName.trim(),
          handicap: parseFloat(handicap),
          teeId,
          prediction: prediction.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }
      setPlayerId(data.player.id);
      router.push("/play");
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";

  return (
    <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-700"}`} />
        <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-700"}`} />
      </div>

      {step === 1 ? (
        /* ── Step 1: About the scorer ── */
        <div>
          <h1 className="text-2xl font-bold mb-1">About you</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You&apos;re scoring for a playing partner — but first, a couple of things about you.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="scorerName">
                Your name
              </label>
              <input
                id="scorerName"
                type="text"
                autoComplete="name"
                className={inputCls}
                placeholder="e.g. Sean Steele"
                value={scorerName}
                onChange={(e) => setScorerName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="prediction">
                Who do you think will win? <span className="text-gray-400 dark:text-gray-500">(just for fun)</span>
              </label>
              <input
                id="prediction"
                type="text"
                className={inputCls}
                placeholder="Your prediction"
                value={prediction}
                onChange={(e) => setPrediction(e.target.value)}
                maxLength={80}
              />
            </div>

            <button
              type="button"
              disabled={!canAdvance}
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        /* ── Step 2: About the player being scored ── */
        <div>
          <h1 className="text-2xl font-bold mb-1">Who are you scoring for?</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Enter the details for the player whose card you&apos;re keeping.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="name">
                Player&apos;s full name
              </label>
              <input
                id="name"
                type="text"
                className={inputCls}
                placeholder="e.g. Colin McGregor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="handicap">
                Their handicap
              </label>
              <input
                id="handicap"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                max="54"
                className={inputCls}
                placeholder="e.g. 14"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="tee">
                Their tee
              </label>
              <select
                id="tee"
                className={inputCls}
                value={teeId}
                onChange={(e) => setTeeId(e.target.value as TeeId)}
              >
                {TEE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {COURSE.tees[id].label} — par {COURSE.tees[id].totalPar}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-lg font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="flex-[2] py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98] disabled:opacity-50"
              >
                {submitting ? "Starting…" : "Start scoring"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
