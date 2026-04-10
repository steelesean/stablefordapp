"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearPlayerId, getPlayerId } from "@/lib/client-storage";

export default function LandingPage() {
  const [existingId, setExistingId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setExistingId(getPlayerId());
    setChecked(true);
  }, []);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="max-w-sm w-full space-y-8">
        <header className="space-y-2">
          <div className="text-5xl">🏆</div>
          <h1 className="text-4xl font-extrabold" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>The Colin Cup</h1>
          <p className="text-sm uppercase tracking-wider text-emerald-700 font-semibold">
            Deer Park Golf &amp; Country Club
          </p>
          <p className="text-sm text-gray-500">
            Stableford. You&apos;ll enter the scores for a playing partner, and yours will be kept by theirs.
          </p>
        </header>

        {checked && existingId ? (
          <div className="space-y-3">
            <Link
              href="/play"
              className="block w-full py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98]"
            >
              Resume scoring
            </Link>
            <button
              className="text-sm text-gray-500 underline"
              onClick={() => {
                if (confirm("Start over? Your saved progress on this phone will be cleared.")) {
                  clearPlayerId();
                  setExistingId(null);
                }
              }}
            >
              Start over instead
            </button>
          </div>
        ) : (
          <Link
            href="/setup"
            className="block w-full py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98]"
          >
            Start scoring a partner
          </Link>
        )}

      </div>
    </main>
  );
}
