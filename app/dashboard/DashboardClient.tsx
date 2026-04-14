"use client";

import { useEffect, useState } from "react";
import { hasSeenOnboarding } from "@/lib/client-storage";
import OnboardingOverlay from "./OnboardingOverlay";

export default function DashboardClient() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setShowOnboarding(!hasSeenOnboarding());
    setChecked(true);
  }, []);

  if (!checked) return null;

  return (
    <>
      {showOnboarding && (
        <OnboardingOverlay onDismiss={() => setShowOnboarding(false)} />
      )}

      {!showOnboarding && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="text-xs text-gray-400 dark:text-gray-500 underline"
          >
            Show me around
          </button>
        </div>
      )}
    </>
  );
}
