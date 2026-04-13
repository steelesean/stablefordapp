import Link from "next/link";
import { getUser } from "@/lib/supabase-auth";
import { listCompetitions } from "@/lib/store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const competitions = await listCompetitions(user.id);

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your competitions</h1>
        <Link
          href="/dashboard/new"
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
        >
          Create new
        </Link>
      </div>

      {competitions.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="text-4xl">🏌️</div>
          <p className="text-gray-500 dark:text-gray-400">
            You haven&apos;t created any competitions yet.
          </p>
          <Link
            href="/dashboard/new"
            className="inline-block px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold"
          >
            Create your first competition
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {competitions.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/${c.id}`}
              className="block rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{c.name || c.courseName}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {c.courseName} · {c.holeCount} holes
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      c.status === "open"
                        ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {c.status === "open" ? "Open" : "Closed"}
                  </span>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Code: {c.joinCode}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
