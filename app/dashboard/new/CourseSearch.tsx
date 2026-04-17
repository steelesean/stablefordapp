"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NormalisedCourse, NormalisedTee } from "@/lib/golf-api";

interface Props {
  onSelected: (result: {
    course: NormalisedCourse;
    tee: NormalisedTee;
  }) => void;
  onEnterManually: () => void;
}

type Status = "idle" | "searching" | "empty" | "ready" | "error";

export default function CourseSearch({ onSelected, onEnterManually }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<NormalisedCourse[]>([]);
  const [picked, setPicked] = useState<NormalisedCourse | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runNameSearch = useCallback(async (q: string) => {
    setStatus("searching");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Search failed");
        return;
      }
      const list: NormalisedCourse[] = data.courses ?? [];
      setResults(list);
      setStatus(list.length === 0 ? "empty" : "ready");
    } catch {
      setStatus("error");
      setErrorMsg("Network error");
    }
  }, []);

  // Debounced name search
  useEffect(() => {
    if (picked) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setStatus("idle");
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      runNameSearch(q);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runNameSearch, picked]);

  function findNearMe() {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported in this browser.");
      return;
    }
    setGeoLoading(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/courses/search?lat=${latitude}&lng=${longitude}&radius=25`,
          );
          const data = await res.json();
          if (!res.ok) {
            setStatus("error");
            setErrorMsg(data.error ?? "Nearby search failed");
          } else {
            const list: NormalisedCourse[] = data.courses ?? [];
            setResults(list);
            setStatus(list.length === 0 ? "empty" : "ready");
          }
        } catch {
          setStatus("error");
          setErrorMsg("Network error");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Try enabling it or search by name."
            : "Couldn't get your location.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  // --- Tee picker ---------------------------------------------------------

  if (picked) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 p-4">
          <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Selected course
          </p>
          <p className="font-semibold text-lg">{picked.name}</p>
          {picked.county && (
            <p className="text-xs text-gray-600 dark:text-gray-400">{picked.county}</p>
          )}
          <button
            type="button"
            className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 underline"
            onClick={() => setPicked(null)}
          >
            Change course
          </button>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Pick a tee</p>
          <div className="space-y-2">
            {picked.tees.map((tee) => (
              <button
                key={tee.id}
                type="button"
                onClick={() => onSelected({ course: picked, tee })}
                className="w-full flex items-center justify-between rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-left hover:border-emerald-500"
              >
                <div>
                  <p className="font-semibold">{tee.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tee.gender === "M" ? "Men's" : tee.gender === "L" ? "Ladies'" : "Mixed"} ·
                    {" "}par {tee.totalPar}
                    {tee.yardage && tee.yardage.length > 0 && (
                      <> · {tee.yardage.reduce((a, b) => a + b, 0).toLocaleString()} yds</>
                    )}
                  </p>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Search box + results ----------------------------------------------

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="courseQuery">
          Find your course
        </label>
        <input
          id="courseQuery"
          type="search"
          autoComplete="off"
          placeholder="Start typing your club's name…"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {status === "searching" && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Searching…</p>
      )}

      {status === "ready" && results.length > 0 && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setPicked(c)}
              className="w-full flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-left hover:border-emerald-500"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {c.county ?? "—"} · {c.tees.length} tee{c.tees.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 shrink-0">→</span>
            </button>
          ))}
        </div>
      )}

      {status === "empty" && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400 space-y-3">
          <p>No courses matched &ldquo;{query}&rdquo;.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={findNearMe}
              disabled={geoLoading}
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {geoLoading ? "Locating…" : "📍 Find courses near me"}
            </button>
            <button
              type="button"
              onClick={onEnterManually}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-semibold"
            >
              ✍ Enter manually
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      {/* Always-visible secondary options (before user has typed) */}
      {status === "idle" && (
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={findNearMe}
            disabled={geoLoading}
            className="text-emerald-700 dark:text-emerald-400 underline disabled:opacity-50"
          >
            {geoLoading ? "Locating…" : "📍 Find courses near me"}
          </button>
          <span className="text-gray-400">·</span>
          <button
            type="button"
            onClick={onEnterManually}
            className="text-emerald-700 dark:text-emerald-400 underline"
          >
            ✍ Enter manually
          </button>
        </div>
      )}
    </div>
  );
}
