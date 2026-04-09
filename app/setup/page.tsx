"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPlayerId } from "@/lib/client-storage";
import { COURSE, TEE_IDS, type TeeId } from "@/lib/course";

export default function SetupPage() {
  const router = useRouter();
  const [scorerName, setScorerName] = useState("");
  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [teeId, setTeeId] = useState<TeeId>("white");
  const [prediction, setPrediction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
      <h1 className="text-2xl font-bold mb-1">Set up a scorecard</h1>
      <p className="text-sm text-gray-500 mb-2">
        {COURSE.name}.
      </p>
      <p className="text-sm text-gray-600 mb-6 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
        You&apos;re scoring for a playing partner — not yourself. Enter your name, then theirs.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="scorerName">
            Your name <span className="text-gray-400">(the scorer)</span>
          </label>
          <input
            id="scorerName"
            type="text"
            autoComplete="name"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
            placeholder="e.g. Sean Steele"
            value={scorerName}
            onChange={(e) => setScorerName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Who are you scoring for? <span className="text-gray-400">(the player)</span>
          </label>
          <input
            id="name"
            type="text"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
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
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
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
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base bg-white"
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

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="prediction">
            Who do they think will win? <span className="text-gray-400">(just for fun)</span>
          </label>
          <input
            id="prediction"
            type="text"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
            placeholder="Their prediction"
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            maxLength={80}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98] disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Start scoring"}
        </button>
      </form>
    </main>
  );
}
