"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [showChampionForm, setShowChampionForm] = useState(false);
  const [topic, setTopic] = useState("");
  const [side, setSide] = useState<"FOR" | "AGAINST">("FOR");
  const router = useRouter();

  const handleChampionStart = () => {
    if (!topic.trim()) return;
    router.push(
      `/debate?mode=champion&topic=${encodeURIComponent(topic.trim())}&side=${side}`
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
        {!showChampionForm ? (
          <>
            <button
              onClick={() => setShowChampionForm(true)}
              className="group flex flex-col items-center gap-1 rounded-xl border border-gold/20 bg-gold/5 px-6 py-4 text-center transition-all hover:border-gold/50 hover:bg-gold/10"
            >
              <span className="text-lg font-semibold text-gold group-hover:text-gold-light">
                Champion
              </span>
              <span className="text-sm text-foreground/50">
                Pick your topic & side
              </span>
            </button>
            <ModeButton
              title="Roulette"
              description="Random topic, random side"
              href="/debate?mode=roulette"
            />
            <ModeButton
              title="Switcheroo"
              description="Sides swap mid-debate"
              href="/debate?mode=switcheroo"
            />
          </>
        ) : (
          <div className="flex flex-col gap-4">
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
                onClick={() => setShowChampionForm(false)}
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
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group flex flex-col items-center gap-1 rounded-xl border border-gold/20 bg-gold/5 px-6 py-4 text-center transition-all hover:border-gold/50 hover:bg-gold/10"
    >
      <span className="text-lg font-semibold text-gold group-hover:text-gold-light">
        {title}
      </span>
      <span className="text-sm text-foreground/50">{description}</span>
    </a>
  );
}
