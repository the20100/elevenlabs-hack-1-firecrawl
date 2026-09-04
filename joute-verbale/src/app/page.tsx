"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { topics, getRandomSide, type Topic } from "@/lib/topics";

type GameMode = "champion" | "roulette" | "switcheroo";

export default function Home() {
  const [activeMode, setActiveMode] = useState<GameMode | null>(null);
  const [topic, setTopic] = useState("");
  const [side, setSide] = useState<"FOR" | "AGAINST">("FOR");
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<{
    topic: Topic;
    side: "FOR" | "AGAINST";
  } | null>(null);
  const [spinDisplay, setSpinDisplay] = useState<string>("");
  const router = useRouter();

  const handleChampionStart = () => {
    if (!topic.trim()) return;
    router.push(
      `/debate?mode=champion&topic=${encodeURIComponent(topic.trim())}&side=${side}`
    );
  };

  const handleSpin = useCallback(() => {
    setSpinning(true);
    setSpinResult(null);

    // Cycle through random topics rapidly, then slow down
    let tick = 0;
    const maxTicks = 20;
    const finalTopic = topics[Math.floor(Math.random() * topics.length)];
    const finalSide = getRandomSide();

    const interval = setInterval(() => {
      tick++;
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      setSpinDisplay(randomTopic.motion);

      if (tick >= maxTicks) {
        clearInterval(interval);
        setSpinDisplay(finalTopic.motion);
        setSpinResult({ topic: finalTopic, side: finalSide });
        setSpinning(false);
      }
    }, 60 + tick * 15); // Gradually slow down

    return () => clearInterval(interval);
  }, []);

  const handleRandomStart = () => {
    if (!spinResult || !activeMode) return;
    router.push(
      `/debate?mode=${activeMode}&topic=${encodeURIComponent(spinResult.topic.motion)}&side=${spinResult.side}`
    );
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      {/* Spotlight glow effect */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-gold/5 blur-[120px]" />

      <header className="relative z-10 flex flex-col items-center gap-4 text-center">
        <h1 className="font-serif text-6xl font-bold tracking-tight text-gold sm:text-7xl">
          Joute Verbale
        </h1>
        <p className="max-w-md text-lg text-foreground/60">
          Argue with the internet.
        </p>
      </header>

      <nav className="relative z-10 mt-12 flex flex-col gap-4 w-full max-w-xs">
        {activeMode === null && (
          <>
            <ModeButton
              title="Champion"
              description="Pick your topic & side"
              onClick={() => setActiveMode("champion")}
            />
            <ModeButton
              title="Roulette"
              description="Random topic, random side"
              onClick={() => setActiveMode("roulette")}
            />
            <ModeButton
              title="Switcheroo"
              description="Sides swap mid-debate"
              onClick={() => setActiveMode("switcheroo")}
            />
          </>
        )}

        {/* Champion form */}
        {activeMode === "champion" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your debate topic..."
              autoFocus
              className="w-full rounded-lg border border-gold/20 bg-gold/5 px-4 py-3 text-foreground placeholder:text-foreground/30 focus:border-gold/50 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleChampionStart()}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setSide("FOR")}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  side === "FOR"
                    ? "border-green-500/50 bg-green-500/20 text-green-400"
                    : "border-foreground/10 bg-foreground/5 text-foreground/40 hover:border-foreground/20"
                }`}
              >
                FOR
              </button>
              <button
                onClick={() => setSide("AGAINST")}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  side === "AGAINST"
                    ? "border-red-500/50 bg-red-500/20 text-red-400"
                    : "border-foreground/10 bg-foreground/5 text-foreground/40 hover:border-foreground/20"
                }`}
              >
                AGAINST
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveMode(null)}
                className="flex-1 rounded-lg border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-sm text-foreground/50 hover:bg-foreground/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleChampionStart}
                disabled={!topic.trim()}
                className="flex-1 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold hover:bg-gold/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Start Debate
              </button>
            </div>
          </div>
        )}

        {/* Roulette / Switcheroo spin */}
        {(activeMode === "roulette" || activeMode === "switcheroo") && (
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <div className="text-sm uppercase tracking-widest text-gold/60">
              {activeMode} mode
            </div>

            {/* Spin display area */}
            <div className="w-full min-h-[80px] flex items-center justify-center rounded-xl border border-gold/20 bg-gold/5 px-4 py-4">
              {!spinning && !spinResult && (
                <span className="text-foreground/30 text-center">
                  Press spin to get your topic
                </span>
              )}
              {(spinning || spinResult) && (
                <p
                  className={`text-center font-serif text-lg leading-snug ${
                    spinning
                      ? "text-foreground/40 animate-pulse"
                      : "text-gold font-semibold"
                  }`}
                >
                  &ldquo;{spinDisplay}&rdquo;
                </p>
              )}
            </div>

            {/* Side assignment */}
            {spinResult && (
              <div className="flex items-center gap-3 animate-fade-in">
                <span className="text-sm text-foreground/50">You argue:</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    spinResult.side === "FOR"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {spinResult.side}
                </span>
              </div>
            )}

            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  setActiveMode(null);
                  setSpinResult(null);
                  setSpinDisplay("");
                }}
                className="flex-1 rounded-lg border border-foreground/10 bg-foreground/5 px-4 py-2.5 text-sm text-foreground/50 hover:bg-foreground/10 transition-colors"
              >
                Back
              </button>
              {!spinResult ? (
                <button
                  onClick={handleSpin}
                  disabled={spinning}
                  className="flex-1 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold hover:bg-gold/20 transition-colors disabled:opacity-50"
                >
                  {spinning ? "Spinning..." : "Spin"}
                </button>
              ) : (
                <button
                  onClick={handleRandomStart}
                  className="flex-1 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold hover:bg-gold/20 transition-colors"
                >
                  Start Debate
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <footer className="relative z-10 mt-16 text-sm text-foreground/30">
        Built for ElevenHacks 2026
      </footer>
    </div>
  );
}

function ModeButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1 rounded-xl border border-gold/20 bg-gold/5 px-6 py-4 text-center transition-all hover:border-gold/50 hover:bg-gold/10"
    >
      <span className="text-lg font-semibold text-gold group-hover:text-gold-light">
        {title}
      </span>
      <span className="text-sm text-foreground/50">{description}</span>
    </button>
  );
}
