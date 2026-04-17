"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { COURSE } from "@/lib/course";
import CourseSearch from "./CourseSearch";
import type { NormalisedCourse, NormalisedTee } from "@/lib/golf-api";

interface HoleRow {
  name: string;
  par: string;
  si: string;
}

function emptyHoles(): HoleRow[] {
  return Array.from({ length: 18 }, () => ({ name: "", par: "", si: "" }));
}

function deerParkHoles(): HoleRow[] {
  const tee = COURSE.tees.white; // default tee for template
  return Array.from({ length: 18 }, (_, i) => ({
    name: COURSE.holeNames[i],
    par: String(tee.par[i]),
    si: String(tee.strokeIndex[i]),
  }));
}

function holesFromTee(tee: NormalisedTee): HoleRow[] {
  return Array.from({ length: tee.par.length }, (_, i) => ({
    name: "",
    par: String(tee.par[i] ?? ""),
    si: String(tee.strokeIndex[i] ?? ""),
  }));
}

type Mode = "search" | "manual";

export default function NewCompetitionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<Mode>("search");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [teeLabel, setTeeLabel] = useState("");

  // Step 2
  const [holes, setHoles] = useState<HoleRow[]>(emptyHoles());

  function loadDefaults() {
    setCourseName(COURSE.name);
    setTeeLabel("White (Men's Medal)");
    setHoles(deerParkHoles());
  }

  function handleCourseSelected(picked: {
    course: NormalisedCourse;
    tee: NormalisedTee;
  }) {
    setCourseName(picked.course.name);
    setTeeLabel(picked.tee.label);
    setHoles(holesFromTee(picked.tee));
    setError(null);
    setStep(2);
  }

  function updateHole(idx: number, field: keyof HoleRow, value: string) {
    setHoles((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function validate(): string | null {
    if (!courseName.trim()) return "Course name is required.";
    if (!teeLabel.trim()) return "Tee name is required.";
    const pars = holes.map((h) => Number(h.par));
    const sis = holes.map((h) => Number(h.si));
    if (pars.some((p) => !Number.isFinite(p) || p < 1 || p > 7)) {
      return "All pars must be between 1 and 7.";
    }
    if (sis.some((s) => !Number.isFinite(s) || s < 1 || s > 18)) {
      return "Stroke indexes must be 1–18.";
    }
    const siSet = new Set(sis);
    if (siSet.size !== 18) {
      return "Each stroke index (1–18) must be used exactly once.";
    }
    return null;
  }

  async function handleCreate() {
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }

    setSubmitting(true);
    try {
      const pars = holes.map((h) => Number(h.par));
      const body = {
        name: name.trim(),
        courseName: courseName.trim(),
        holeCount: 18,
        holeNames: holes.map((h) => h.name.trim()),
        tees: [
          {
            id: teeLabel.trim().toLowerCase().replace(/\s+/g, "-"),
            label: teeLabel.trim(),
            par: pars,
            strokeIndex: holes.map((h) => Number(h.si)),
            totalPar: pars.reduce((a, v) => a + v, 0),
          },
        ],
      };

      const res = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create competition.");
        setSubmitting(false);
        return;
      }
      router.push(`/dashboard/${data.competition.id}`);
    } catch {
      setError("Network error — try again.");
      setSubmitting(false);
    }
  }

  const totalPar = holes.reduce((a, h) => a + (Number(h.par) || 0), 0);

  const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const cellInputCls =
    "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-center text-sm text-gray-900 dark:text-gray-100 tabular-nums";

  return (
    <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              step >= s ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Create a competition</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Name it, then find your course.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="compName">
              Competition name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="compName"
              type="text"
              className={inputCls}
              placeholder="e.g. The Colin Cup 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          {mode === "search" ? (
            <CourseSearch
              onSelected={handleCourseSelected}
              onEnterManually={() => setMode("manual")}
            />
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="courseName">
                  Course name
                </label>
                <input
                  id="courseName"
                  type="text"
                  className={inputCls}
                  placeholder="e.g. Deer Park Golf & Country Club"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="teeLabel">
                  Tee
                </label>
                <input
                  id="teeLabel"
                  type="text"
                  className={inputCls}
                  placeholder="e.g. White (Men's Medal)"
                  value={teeLabel}
                  onChange={(e) => setTeeLabel(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <button
                  type="button"
                  onClick={loadDefaults}
                  className="text-emerald-700 dark:text-emerald-400 underline"
                >
                  Use Deer Park defaults
                </button>
                <span className="text-gray-400">·</span>
                <button
                  type="button"
                  onClick={() => setMode("search")}
                  className="text-emerald-700 dark:text-emerald-400 underline"
                >
                  ← Back to course search
                </button>
              </div>

              <button
                type="button"
                disabled={!courseName.trim() || !teeLabel.trim()}
                onClick={() => setStep(2)}
                className="w-full py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98] disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Course setup</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {courseName ? (
                <>
                  {courseName} — {teeLabel}. Double-check par and stroke index;
                  add hole names if you like.
                </>
              ) : (
                "Enter the par and stroke index for each hole. Names are optional."
              )}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="py-2 px-2 text-left w-10">#</th>
                  <th className="py-2 px-1 text-left">Name</th>
                  <th className="py-2 px-1 text-center w-20">Par</th>
                  <th className="py-2 px-2 text-center w-20">SI</th>
                </tr>
              </thead>
              <tbody>
                {holes.map((h, i) => (
                  <tr
                    key={i}
                    className={
                      i === 8
                        ? "border-b-2 border-gray-300 dark:border-gray-600"
                        : "border-b border-gray-100 dark:border-gray-800"
                    }
                  >
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400 tabular-nums">
                      {i + 1}
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="text"
                        className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                        placeholder={`Hole ${i + 1}`}
                        value={h.name}
                        onChange={(e) => updateHole(i, "name", e.target.value)}
                        maxLength={40}
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        min="1"
                        max="7"
                        className={cellInputCls}
                        placeholder="4"
                        value={h.par}
                        onChange={(e) => updateHole(i, "par", e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="1"
                        max="18"
                        className={cellInputCls}
                        placeholder={String(i + 1)}
                        value={h.si}
                        onChange={(e) => updateHole(i, "si", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800 font-semibold">
                  <td className="py-2 px-2" colSpan={2}>Total</td>
                  <td className="py-2 px-1 text-center">{totalPar}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setError(null); setStep(1); }}
              className="flex-1 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                const err = validate();
                if (err) { setError(err); return; }
                setError(null);
                setStep(3);
              }}
              className="flex-[2] py-4 rounded-xl bg-emerald-600 text-white font-semibold active:scale-[.98]"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Review & create</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Check everything looks right.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            {name && (
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Competition</span>
                <p className="font-semibold">{name}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Course</span>
              <p className="font-semibold">{courseName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Tee</span>
              <p className="text-sm">{teeLabel} — par {totalPar}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Holes</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm mt-1">
                {holes.map((h, i) => (
                  <div key={i} className="flex justify-between tabular-nums">
                    <span className="text-gray-600 dark:text-gray-400">
                      {i + 1}. {h.name || `Hole ${i + 1}`}
                    </span>
                    <span>
                      Par {h.par}, SI {h.si}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setError(null); setStep(2); }}
              className="flex-1 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleCreate}
              className="flex-[2] py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98] disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create competition"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
