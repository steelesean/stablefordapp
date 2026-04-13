import Link from "next/link";
import { getUser } from "@/lib/supabase-auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Double-check auth (proxy handles redirect, but this is defence-in-depth)
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <>
      <nav className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="font-bold text-lg">
            Stableford
          </Link>
          <LogoutButton />
        </div>
      </nav>
      {children}
    </>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="text-xs text-gray-500 dark:text-gray-400 underline"
      >
        Sign out
      </button>
    </form>
  );
}
