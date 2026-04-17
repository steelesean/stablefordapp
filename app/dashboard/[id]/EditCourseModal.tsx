"use client";

import { useState } from "react";
import type { Competition } from "@/lib/types";

interface Props {
  competition: Competition;
  onClose: () => void;
  onSaved: () => void;
}

interface HoleRow {
  name: string;
  par: string;
  si: string;
}

function rowsFromCompetition(comp: Competition): HoleRow[] {
  const tee = comp.tees[0];
  return Array.from({ length: comp.holeCount }, (_, i) => ({
    name: comp.holeNames[i] ?? "",
    par: String(tee?.par[i] ?? ""),
    si: String(tee?.strokeIndex[i] ?? ""),
  }));
}

export default function EditCourseModal({ competition, onClose, onSaved }: Props) {
  const [courseName, setCourseName] = useState(competition.courseName);
  const [teeLabel, setTeeLabel] = useState(competition.tees[0]?.label ?? "");
  const [holes, setHoles] = useState<HoleRow[]>(rowsFromCompetition(competition));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    const n = holes.length;
    if (sis.some((s) => !Number.isFinite(s) || s < 1 || s > n)) {
      return `Stroke indexes must be 1–${n}.`;
    }
    if (new Set(sis).size !== n) {
      return `Each stroke index (1–${n}) must be used exactly once.`;
    }
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      const pars = holes.map((h) => Number(h.par));
      const body = {
        action: "updateCourse",
        coursePatch: {
          courseName: courseName.trim(),
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
        },
      };
      const res = await fetch(`/api/competitions/${competition.id}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.code === "locked") {
          setError("A player has already joined — course details are locked.");
        } else {
          setError(d.error ?? "Save failed.");
        }
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Network error — try again.");
      setSaving(false);
    }
  }

  const totalPar = holes.reduce((a, h) => a + (Number(h.par) || 0), 0);

  const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-gray-100";
  const cellInputCls =
    "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-center text-sm text-gray-900 dark:text-gray-100 tabular-nums";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl my-4 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold">Edit course details</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can tweak these until the first player joins — after that, the card is locked.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="editCourseName">
              Course name
            </label>
            <input
              id="editCourseName"
              type="text"
              className={inputCls}
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="editTeeLabel">
              Tee
            </label>
            <input
              id="editTeeLabel"
              type="text"
              className={inputCls}
              value={teeLabel}
              onChange={(e) => setTeeLabel(e.target.value)}
            />
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
                        className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
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
                        value={h.par}
                        onChange={(e) => updateHole(i, "par", e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="1"
                        max={holes.length}
                        className={cellInputCls}
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
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-[2] py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
