"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { CompetitionTee } from "@/lib/types";
import { useParams } from "next/navigation";

/** Competition data available to all player pages via context. */
export interface CompetitionContext {
  id: string;
  name: string;
  joinCode: string;
  courseName: string;
  holeCount: number;
  holeNames: string[];
  tees: CompetitionTee[];
  status: string;
}

const CompCtx = createContext<CompetitionContext | null>(null);

export function useCompetition(): CompetitionContext {
  const ctx = useContext(CompCtx);
  if (!ctx) throw new Error("useCompetition must be used inside /c/[code] layout");
  return ctx;
}

export default function CompetitionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [competition, setCompetition] = useState<CompetitionContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/join/${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          setError("Competition not found. Check the link and try again.");
          return;
        }
        const data = await res.json();
        setCompetition(data.competition);
      })
      .catch(() => setError("Network error. Please try again."));
  }, [code]);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </main>
    );
  }

  if (!competition) {
    return <main className="flex-1 flex items-center justify-center">Loading…</main>;
  }

  return <CompCtx.Provider value={competition}>{children}</CompCtx.Provider>;
}
