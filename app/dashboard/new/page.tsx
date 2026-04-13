"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { COURSE } from "@/lib/course";

type TeeInput = {
  id: string;
  label: string;
  par: string[];       // string inputs for each hole
  strokeIndex: string[];
};

const EMPTY_TEE: TeeInput = {
  id: "",
  label: "",
  par: new Array(18).fill(""),
  strokeIndex: new Array(18).fill(""),
};

function deerParkDefaults() {
  const tees: TeeInput[] = Object.values(COURSE.tees).map((t) => ({
    id: t.id,
    label: t.label,
    par: t.par.map(String),
    strokeIndex: t.strokeIndex.map(String),
  }));
  return {
    name: "",
    courseName: COURSE.name,
    holeNames: [...COURSE.holeNames],
    tees,
  };
}

export default function NewCompetitionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [holeNames, setHoleNames] = useState<string[]>(new Array(18).fill(""));
  const [tees, setTees] = useState<TeeInput[]>([{ ...EMPTY_TEE, id: "white", label: "White" }]);

  function loadDefaults() {
    const d = deerParkDefaults();
    setCourseName(d.courseName);
    setHoleNames(d.holeNames);
    setTees(d.tees);
  }

  function updateTee(idx: number, field: keyof TeeInput, value: string | string[]) {
    setTees((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function updateTeeHoleValue(
    teeIdx: number,
    field: "par" | "strokeIndex",
    holeIdx: number,
    value: string,
  ) {
    setTees((prev) => {
      const next = [...prev];
      const arr = [...next[teeIdx][field]];
      arr[holeIdx] = value;
      next[teeIdx] = { ...next[teeIdx], [field]: arr };
      return next;
    });
  }

  function addTee() {
    setTees((prev) => [...prev, { ...EMPTY_TEE, id: `tee-${prev.length + 1}` }]);
  }

  function removeTee(idx: number) {
    setTees((prev) => prev.filter((_, i) => i !== idx));
  }

  function validateTees(): string | null {
    for (const tee of tees) {
      if (!tee.label.trim()) return "Each tee needs a label.";
      const pars = tee.par.map(Number);
      const sis = tee.strokeIndex.map(Number);
      if (pars.some((p) => !Number.isFinite(p) || p < 1 || p > 7)) {
        return `${tee.label}: all pars must be between 1 and 7.`;
      }
      if (sis.some((s) => !Number.isFinite(s) || s < 1 || s > 18)) {
        return `${tee.label}: stroke indexes must be 1–18.`;
      }
      const siSet = new Set(sis);
      if (siSet.size !== 18) {
        return `${tee.label}: each stroke index (1–18) must be used exactly once.`;
      }
    }
    return null;
  }

  async function handleCreate() {
    setError(null);
    const teeErr = validateTees();
    if (teeErr) {
      setError(teeErr);
      return;
    }
    if (!courseName.trim()) {
      setError("Course name is required.");
      return;
    }
    if (tees.length === 0) {
      setError("At least one tee is required.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        courseName: courseName.trim(),
        holeCount: 18,
        holeNames: holeNames.map((n) => n.trim()),
        tees: tees.map((t) => ({
          id: t.id.trim().toLowerCase().replace(/\s+/g, "-") || t.label.trim().toLowerCase().replace(/\s+/g, "-"),
          label: t.label.trim(),
          par: t.par.map(Number),
          strokeIndex: t.strokeIndex.map(Number),
        })),
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

  const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const smallInputCls =
    "w-14 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-center text-sm text-gray-900 dark:text-gray-100 tabular-nums";

  return (
    <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
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
              Give it a name and tell us the course.
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

          <button
            type="button"
            onClick={loadDefaults}
            className="text-sm text-emerald-700 dark:text-emerald-400 underline"
          >
            Use Deer Park defaults (fills everything)
          </button>

          <button
            type="button"
            disabled={!courseName.trim()}
            onClick={() => setStep(2)}
            className="w-full py-4 rounded-xl bg-emerald-600 text-white text-lg font-semibold shadow active:scale-[.98] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Hole names</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Name each hole. Leave blank if the course doesn&apos;t name them.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {holeNames.map((hn, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right tabular-nums">
                  {i + 1}
                </span>
                <input
                  type="text"
                  className={inputCls}
                  placeholder={`Hole ${i + 1}`}
                  value={hn}
                  onChange={(e) => {
                    const next = [...holeNames];
                    next[i] = e.target.value;
                    setHoleNames(next);
                  }}
                  maxLength={40}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-[2] py-4 rounded-xl bg-emerald-600 text-white font-semibold active:scale-[.98]"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Tee configurations</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Set up each tee with par and stroke index for every hole.
            </p>
          </div>

          {tees.map((tee, tIdx) => (
            <div
              key={tIdx}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Tee {tIdx + 1}</h3>
                {tees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTee(tIdx)}
                    className="text-xs text-red-600 dark:text-red-400 underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Tee ID</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. white"
                    value={tee.id}
                    onChange={(e) => updateTee(tIdx, "id", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Label</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. White (Men's Medal)"
                    value={tee.label}
                    onChange={(e) => updateTee(tIdx, "label", e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="text-sm tabular-nums">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400 text-xs">
                      <th className="pr-2 text-left">Hole</th>
                      {Array.from({ length: 18 }, (_, i) => (
                        <th key={i} className="px-0.5 text-center w-14">
                          {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pr-2 text-xs text-gray-500 dark:text-gray-400">Par</td>
                      {tee.par.map((v, hIdx) => (
                        <td key={hIdx} className="px-0.5">
                          <input
                            type="number"
                            min="1"
                            max="7"
                            className={smallInputCls}
                            value={v}
                            onChange={(e) =>
                              updateTeeHoleValue(tIdx, "par", hIdx, e.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pr-2 text-xs text-gray-500 dark:text-gray-400">SI</td>
                      {tee.strokeIndex.map((v, hIdx) => (
                        <td key={hIdx} className="px-0.5">
                          <input
                            type="number"
                            min="1"
                            max="18"
                            className={smallInputCls}
                            value={v}
                            onChange={(e) =>
                              updateTeeHoleValue(tIdx, "strokeIndex", hIdx, e.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                Total par: {tee.par.reduce((a, v) => a + (Number(v) || 0), 0)}
              </p>
            </div>
          ))}

          <button
            type="button"
            onClick={addTee}
            className="text-sm text-emerald-700 dark:text-emerald-400 underline"
          >
            + Add another tee
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                const err = validateTees();
                if (err) {
                  setError(err);
                  return;
                }
                setError(null);
                setStep(4);
              }}
              className="flex-[2] py-4 rounded-xl bg-emerald-600 text-white font-semibold active:scale-[.98]"
            >
              Review
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Review & create</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Check everything looks right before creating.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
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
              <span className="text-xs text-gray-500 dark:text-gray-400">Holes</span>
              <p className="text-sm">
                {holeNames.filter((n) => n.trim()).length > 0
                  ? holeNames
                      .map((n, i) => n.trim() || `Hole ${i + 1}`)
                      .join(", ")
                  : "18 holes (unnamed)"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Tees</span>
              {tees.map((t, i) => (
                <p key={i} className="text-sm">
                  {t.label} — par {t.par.reduce((a, v) => a + (Number(v) || 0), 0)}
                </p>
              ))}
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
              onClick={() => setStep(3)}
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
