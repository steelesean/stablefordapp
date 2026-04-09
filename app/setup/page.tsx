"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPlayerId } from "@/lib/client-storage";
import { COURSE, TEE_IDS, type TeeId } from "@/lib/course";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [teeId, setTeeId] = useState<TeeId>("white");
  const [prediction, setPrediction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
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
      <h1 className="text-2xl font-bold mb-1">Let&apos;s get you set up</h1>
      <p className="text-sm text-gray-500 mb-6">
        {COURSE.name}. Takes 20 seconds.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
            placeholder="Jane McGregor"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="handicap">
            Handicap
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
            Tee
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
            Who do you think will win? <span className="text-gray-400">(just for fun)</span>
          </label>
          <input
            id="prediction"
            type="text"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
            placeholder="Your prediction"
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
          {submitting ? "Starting…" : "Start round"}
        </button>
      </form>
    </main>
  );
}
