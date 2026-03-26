"use client";

import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useConversation } from "@11labs/react";
import { type DebateMode, buildDebatePrompt, TOTAL_ROUNDS } from "@/lib/debate-prompt";
import { getRandomSide, getRandomTopic } from "@/lib/topics";

function DebateContent() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") || "champion") as DebateMode;
  const topicParam = searchParams.get("topic");
  const sideParam = searchParams.get("side") as "FOR" | "AGAINST" | null;

  const { topic, userSide } = useMemo(() => {
    if (mode === "champion" && topicParam && sideParam) {
      return { topic: topicParam, userSide: sideParam };
    }
    const randomTopic = getRandomTopic();
    return { topic: randomTopic.motion, userSide: getRandomSide() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<"pre-start" | "introduction" | "debate">(
    "pre-start"
  );
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scores, setScores] = useState<{
    eloquence: number;
    evidence: number;
    resilience: number;
    logic: number;
    wit: number;
    total: number;
    title: string;
    verdict: string;
  } | null>(null);
  const [roundTimeLeft, setRoundTimeLeft] = useState(120); // 2 minutes in seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  const firecrawlSearch = useCallback(
    async (parameters: { query: string }): Promise<string> => {
      setIsSearching(true);
      try {
        const res = await fetch("/api/firecrawl-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: parameters.query }),
        });
        const data = await res.json();
        if (data.error) return `Search failed: ${data.error}`;
        return JSON.stringify(data.results);
      } catch {
        return "Search temporarily unavailable";
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const conversation = useConversation({
    clientTools: {
      firecrawl_search: firecrawlSearch,
    },
    onConnect: () => {
      console.log("ElevenLabs connected");
    },
    onDisconnect: () => {
      console.log("ElevenLabs disconnected");
      setStarted(false);
      setPhase("pre-start");
    },
    onDebug: () => {},
    onAudio: () => {},
    onMessage: (props: { message: string; source: "user" | "ai" }) => {
      // Transition from introduction to debate when the user speaks for the first time
      if (props.source === "user") {
        setPhase((prev) => (prev === "introduction" ? "debate" : prev));
      }

      setMessages((prev) => [
        ...prev,
        { role: props.source, text: props.message },
      ]);

      if (props.source === "ai") {
        const scoreMatch = props.message.match(
          /SCORES_JSON:(\{[^}]+\})/
        );
        if (scoreMatch) {
          try {
            setScores(JSON.parse(scoreMatch[1]));
          } catch {
            // ignore parse errors
          }
        }
      }
    },
    onError: (message: string) => {
      console.error("ElevenLabs error:", message);
    },
  });

  const handleStart = useCallback(async () => {
    if (!agentId) return;

    const aiSide = userSide === "FOR" ? "AGAINST" : "FOR";
    const switcherooInstructions =
      mode === "switcheroo"
        ? `ACTIVE — After Round 2, announce a side switch. You then argue ${userSide}, the user argues ${aiSide}.`
        : "INACTIVE";

    const prompt = buildDebatePrompt({ topic, userSide, mode });

    await conversation.startSession({
      agentId,
      connectionType: "websocket",
      overrides: {
        agent: {
          prompt: {
            prompt,
          },
        },
      },
      dynamicVariables: {
        topic,
        user_side: userSide,
        ai_side: aiSide,
        mode,
        switcheroo_instructions: switcherooInstructions,
      },
    });

    setStarted(true);
    setPhase("introduction");
  }, [agentId, conversation, mode, topic, userSide]);

  const handleEnd = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("Failed to end session:", err);
    } finally {
      setStarted(false);
      setPhase("pre-start");
    }
  }, [conversation]);

  // Find the index of the first user message — everything before it is introduction.
  const firstUserIdx = messages.findIndex((m) => m.role === "user");
  const debateMessages =
    firstUserIdx >= 0 ? messages.slice(firstUserIdx) : [];
  // Each debate round produces ~2 AI messages (acknowledgment + rebuttal).
  const currentRound = Math.min(
    Math.floor(
      debateMessages.filter((m) => m.role === "ai").length / 2
    ) + 1,
    TOTAL_ROUNDS
  );

  // Timer: reset on round change, tick down every second during debate phase
  const prevRoundRef = useRef(0);
  useEffect(() => {
    if (phase === "debate" && started) {
      // Reset timer when round changes
      if (currentRound !== prevRoundRef.current) {
        setRoundTimeLeft(120);
        prevRoundRef.current = currentRound;
      }
      // Start ticking
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRoundTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      // Not in debate phase — clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, started, currentRound]);

  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Timer color classes based on remaining time
  const timerColorClass =
    roundTimeLeft <= 10
      ? "text-red-400 animate-pulse"
      : roundTimeLeft <= 30
        ? "text-amber-400"
        : "text-foreground/60";

  if (scores) {
    return <ScoreScreen scores={scores} topic={topic} userSide={userSide} />;
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-8">
      {/* Topic banner */}
      <div className="w-full max-w-2xl text-center mb-8">
        <div className="text-sm uppercase tracking-widest text-gold/60 mb-2">
          {mode} mode
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gold leading-snug">
          &ldquo;{topic}&rdquo;
        </h1>
        <div className="mt-3 flex items-center justify-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              userSide === "FOR"
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            You: {userSide}
          </span>
          <span className="text-foreground/30">vs</span>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              userSide === "FOR"
                ? "bg-red-500/20 text-red-400"
                : "bg-green-500/20 text-green-400"
            }`}
          >
            AI: {userSide === "FOR" ? "AGAINST" : "FOR"}
          </span>
        </div>
      </div>

      {/* Round indicator + Timer */}
      {started && (
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="flex gap-2 items-center">
            {phase === "introduction" ? (
              <span className="text-sm text-gold/80 font-medium animate-pulse">
                Introduction
              </span>
            ) : (
              <>
                {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((r) => (
                  <div
                    key={r}
                    className={`w-10 h-1.5 rounded-full transition-colors ${
                      r <= currentRound ? "bg-gold" : "bg-foreground/10"
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-foreground/40">
                  Round {currentRound}/{TOTAL_ROUNDS}
                </span>
              </>
            )}
          </div>
          {/* Countdown timer */}
          {phase === "debate" && (
            <div className={`font-mono text-2xl font-bold tabular-nums ${timerColorClass} transition-colors`}>
              {formatTime(roundTimeLeft)}
              {roundTimeLeft <= 10 && roundTimeLeft > 0 && (
                <span className="ml-2 text-xs font-normal text-red-400/80">
                  Time&apos;s almost up!
                </span>
              )}
              {roundTimeLeft === 0 && (
                <span className="ml-2 text-xs font-normal text-red-400">
                  Time&apos;s up!
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Voice interaction area */}
      <div className="flex flex-col items-center gap-6 my-auto">
        {!started ? (
          <button
            onClick={handleStart}
            disabled={!agentId}
            className="group relative rounded-full bg-gold/10 border-2 border-gold/40 w-32 h-32 flex items-center justify-center transition-all hover:bg-gold/20 hover:border-gold/60 hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="text-gold text-lg font-semibold group-hover:text-gold-light">
              Start
            </span>
            <span className="absolute inset-0 rounded-full border-2 border-gold/20 animate-ping" />
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Waveform / Speaking indicator */}
            <div className="relative w-32 h-32 rounded-full flex items-center justify-center">
              {conversation.isSpeaking ? (
                <>
                  <div className="absolute inset-0 rounded-full bg-gold/10 border-2 border-gold/50" />
                  <div className="flex items-end gap-1 h-10">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-gold rounded-full animate-waveform"
                        style={{
                          height: `${12 + Math.random() * 28}px`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: `${0.5 + Math.random() * 0.5}s`,
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full bg-foreground/5 border-2 border-foreground/20" />
                  <div className="flex flex-col items-center">
                    {/* Mic icon */}
                    <svg
                      className="w-8 h-8 text-foreground/40"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                      />
                    </svg>
                    <span className="text-xs text-foreground/40 mt-1">
                      {conversation.status === "connecting"
                        ? "Connecting..."
                        : "Your turn"}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Researching indicator */}
            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-gold/80 animate-fade-in">
                <div className="flex gap-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce"
                    style={{ animationDelay: "0s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
                Researching with Firecrawl...
              </div>
            )}

            <button
              onClick={handleEnd}
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
            >
              End Debate
            </button>
          </div>
        )}

        {!agentId && (
          <p className="text-sm text-red-400/80 max-w-xs text-center">
            Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID. Set it in your .env.local
            file.
          </p>
        )}
      </div>

      {/* Recent messages (transcript) */}
      {messages.length > 0 && (
        <div className="w-full max-w-2xl mt-8 space-y-3 max-h-60 overflow-y-auto">
          {messages.slice(-6).map((msg, i) => (
            <div
              key={i}
              className={`text-sm px-4 py-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-foreground/5 text-foreground/70 ml-12"
                  : "bg-gold/5 text-foreground/80 mr-12 border border-gold/10"
              }`}
            >
              <span className="text-xs font-medium text-foreground/40 block mb-1">
                {msg.role === "user" ? "You" : "AI Debater"}
              </span>
              {msg.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreScreen({
  scores,
  topic,
  userSide,
}: {
  scores: {
    eloquence: number;
    evidence: number;
    resilience: number;
    logic: number;
    wit: number;
    total: number;
    title: string;
    verdict: string;
  };
  topic: string;
  userSide: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Delay reveal for dramatic effect
    const timer = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const dimensions = [
    { name: "Eloquence", score: scores.eloquence },
    { name: "Evidence", score: scores.evidence },
    { name: "Resilience", score: scores.resilience },
    { name: "Logic", score: scores.logic },
    { name: "Wit", score: scores.wit },
  ];

  const handleShare = async () => {
    const text = `I scored ${scores.total}/100 (${scores.title}) debating "${topic}" on Joute Verbale!\n\n"${scores.verdict}"\n\nThink you can beat me? Try it yourself: #ElevenHacks #JouteVerbale`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      setSharing(true);
      setTimeout(() => setSharing(false), 2000);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div ref={cardRef} className="w-full max-w-md text-center">
        <h2 className="text-sm uppercase tracking-widest text-gold/60 mb-2">
          Final Score
        </h2>

        {/* Big score number with pop animation */}
        <div
          className={`transition-all duration-600 ${
            revealed
              ? "opacity-100 animate-score-pop"
              : "opacity-0 scale-50"
          }`}
        >
          <div className="font-serif text-7xl font-bold text-gold mb-2">
            {scores.total}
            <span className="text-3xl text-foreground/30">/100</span>
          </div>
          <div className="text-xl font-semibold text-gold-light mb-6">
            {scores.title}
          </div>
        </div>

        {/* Score breakdown with animated bars */}
        <div className="space-y-3 mb-8">
          {dimensions.map((dim, i) => (
            <div
              key={dim.name}
              className="flex items-center gap-3"
              style={{
                opacity: revealed ? 1 : 0,
                transition: `opacity 0.4s ease ${0.5 + i * 0.15}s`,
              }}
            >
              <span className="text-sm text-foreground/60 w-24 text-left">
                {dim.name}
              </span>
              <div className="flex-1 h-2 bg-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full"
                  style={{
                    width: revealed ? `${(dim.score / 20) * 100}%` : "0%",
                    transition: `width 1.2s ease-out ${0.6 + i * 0.15}s`,
                  }}
                />
              </div>
              <span className="text-sm font-mono text-foreground/50 w-10 text-right">
                {dim.score}/20
              </span>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div
          className="border border-gold/20 rounded-xl bg-gold/5 p-4 mb-8"
          style={{
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.6s ease 1.5s",
          }}
        >
          <p className="text-foreground/80 italic">
            &ldquo;{scores.verdict}&rdquo;
          </p>
        </div>

        {/* Topic reminder */}
        <div className="text-xs text-foreground/30 mb-6">
          Topic: &ldquo;{topic}&rdquo; — You argued {userSide}
        </div>

        {/* Actions */}
        <div
          className="flex gap-3 justify-center"
          style={{
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.4s ease 1.8s",
          }}
        >
          <a
            href="/"
            className="rounded-lg border border-foreground/20 bg-foreground/5 px-5 py-2.5 text-sm text-foreground/60 hover:bg-foreground/10 transition-colors"
          >
            New Debate
          </a>
          <button
            onClick={handleShare}
            className="rounded-lg border border-gold/30 bg-gold/10 px-5 py-2.5 text-sm font-medium text-gold hover:bg-gold/20 transition-colors flex items-center gap-2"
          >
            {sharing ? (
              "Copied!"
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                  />
                </svg>
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DebatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="text-foreground/40">Loading debate...</div>
        </div>
      }
    >
      <DebateContent />
    </Suspense>
  );
}
