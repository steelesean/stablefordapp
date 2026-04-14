"use client";

import { useCallback, useEffect, useState } from "react";
import { setOnboardingSeen } from "@/lib/client-storage";

const SLIDES = [
  {
    emoji: "⛳",
    heading: "Welcome to Stableford",
    body: "Run your golf society competitions in minutes. Set up a round, share a link, and watch scores come in live.",
  },
  {
    emoji: "📝",
    heading: "Create a competition",
    body: "Add your course, set par and stroke index for each hole, and choose the tee. You can use Deer Park defaults or enter any course.",
  },
  {
    emoji: "🔗",
    heading: "Share with players",
    body: "Each competition gets a unique link and join code. Players open it on their phone, enter their name and handicap — no account needed.",
  },
  {
    emoji: "📊",
    heading: "Track live scores",
    body: "Watch scores update in real time on your dashboard. See rankings, countback tiebreakers, and predicted winner votes.",
  },
  {
    emoji: "🏆",
    heading: "Close and share results",
    body: "When everyone is done, close the round and copy the final leaderboard to share with the group.",
  },
];

interface Props {
  onDismiss: () => void;
}

export default function OnboardingOverlay({ onDismiss }: Props) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const dismiss = useCallback(() => {
    setOnboardingSeen(true);
    onDismiss();
  }, [onDismiss]);

  const goForward = useCallback(() => {
    if (current >= SLIDES.length - 1) {
      dismiss();
    } else {
      setDirection("forward");
      setCurrent((c) => c + 1);
    }
  }, [current, dismiss]);

  const goBack = useCallback(() => {
    if (current > 0) {
      setDirection("back");
      setCurrent((c) => c - 1);
    }
  }, [current]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goForward();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "Escape") {
        dismiss();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goForward, goBack, dismiss]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.25) {
      goBack();
    } else {
      goForward();
    }
  }

  const slide = SLIDES[current];

  return (
    <div
      className="fixed inset-0 z-30 bg-gray-950 flex flex-col cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Progress dots */}
      <div className="flex gap-1 px-4 pt-4 pb-2">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= current ? "bg-white" : "bg-white/25"
            }`}
          />
        ))}
      </div>

      {/* Skip button */}
      <div className="px-4 py-2 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="text-sm text-white/70 hover:text-white px-3 py-1"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center text-white">
        <div
          key={current}
          className="space-y-4 max-w-sm animate-fade-in"
        >
          <div className="text-7xl">{slide.emoji}</div>
          <h2 className="text-2xl font-bold">{slide.heading}</h2>
          <p className="text-base text-white/80 leading-relaxed">{slide.body}</p>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="px-4 pb-8 text-center">
        <p className="text-xs text-white/40">
          {current < SLIDES.length - 1
            ? "Tap to continue"
            : "Tap to get started"}
        </p>
      </div>
    </div>
  );
}
