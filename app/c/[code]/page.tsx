"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCompetition } from "./layout";
import { getPlayerId, clearPlayerId } from "@/lib/client-storage";

export default function CompetitionLandingPage() {
  const comp = useCompetition();
  const [existingId, setExistingId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check for existing player in this competition
    const id = getPlayerId(comp.joinCode);
    setExistingId(id);
    setChecked(true);
  }, [comp.joinCode]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="max-w-sm w-full space-y-8">
        <header className="space-y-2">
          <div className="text-5xl">🏌️</div>
          <h1
            className="text-4xl font-extrabold"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {comp.name || comp.courseName}
          </h1>
          <p className="text-sm uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
            {comp.courseName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Stableford. You&apos;ll enter the scores for a playing partner, and yours will be kept
            by theirs.
          </p>
        </header>

        {comp.status === "closed" ? (
          <p className="text-gray-500 dark:text-gray-400">
            This competition is closed. No new players can join.
          </p>
        ) : checked && existingId ? (
          <div className="space-y-3">
            <Link
              href={`/c/${comp.joinCode}/play`}
              className="block w-full py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98]"
            >
              Resume scoring
            </Link>
            <button
              className="text-sm text-gray-500 dark:text-gray-400 underline"
              onClick={() => {
                if (confirm("Start over? Your saved progress on this phone will be cleared.")) {
                  clearPlayerId(comp.joinCode);
                  setExistingId(null);
                }
              }}
            >
              Start over instead
            </button>
          </div>
        ) : (
          <Link
            href={`/c/${comp.joinCode}/setup`}
            className="block w-full py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98]"
          >
            Start scoring a partner
          </Link>
        )}
      </div>
    </main>
  );
}
