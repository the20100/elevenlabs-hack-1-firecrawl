"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useConversation } from "@11labs/react";
import { buildDebatePrompt, type DebateMode } from "@/lib/debate-prompt";
import { getRandomSide, getRandomTopic } from "@/lib/topics";

function DebateContent() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") || "champion") as DebateMode;
  const topicParam = searchParams.get("topic");
  const sideParam = searchParams.get("side") as "FOR" | "AGAINST" | null;

  // Determine topic and side based on mode
  const { topic, userSide } = useMemo(() => {
    if (mode === "champion" && topicParam && sideParam) {
      return { topic: topicParam, userSide: sideParam };
    }
    // Roulette or Switcheroo: random topic and side
    const randomTopic = getRandomTopic();
    return { topic: randomTopic.motion, userSide: getRandomSide() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
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

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  const firecrawlSearch = useCallback(
    async (parameters: { query: string }): Promise<string> => {
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
      }
    },
    []
  );

  const conversation = useConversation({
    clientTools: {
      firecrawl_search: firecrawlSearch,
    },
    onMessage: (props: { message: string; source: "user" | "ai" }) => {
      setMessages((prev) => [
        ...prev,
        { role: props.source, text: props.message },
      ]);

      // Check for scores JSON in AI messages
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
    if (!agentId) {
      console.error("No agent ID configured");
      return;
    }

    const prompt = buildDebatePrompt({ topic, userSide, mode });

    await conversation.startSession({
      agentId,
      connectionType: "websocket",
      overrides: {
        agent: {
          prompt: { prompt },
          firstMessage: `Welcome to Joute Verbale. The motion before us today is: "${topic}". You will be arguing ${userSide}. You have 3 rounds to make your case. Take a moment to collect your thoughts... and... go.`,
        },
      },
    });

    setStarted(true);
  }, [agentId, conversation, mode, topic, userSide]);

  const handleEnd = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  // Determine current round from message count (rough heuristic)
  const currentRound = Math.min(
    Math.floor(messages.filter((m) => m.role === "ai").length / 1) + 1,
    3
  );

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

      {/* Round indicator */}
      {started && (
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((r) => (
            <div
              key={r}
              className={`w-20 h-1.5 rounded-full transition-colors ${
                r <= currentRound ? "bg-gold" : "bg-foreground/10"
              }`}
            />
          ))}
          <span className="ml-2 text-sm text-foreground/40">
            Round {currentRound}/3
          </span>
        </div>
      )}

      {/* Voice status */}
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
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full border-2 border-gold/20 animate-ping" />
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Speaking indicator */}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                conversation.isSpeaking
                  ? "bg-gold/20 border-2 border-gold animate-pulse"
                  : "bg-foreground/5 border-2 border-foreground/20"
              }`}
            >
              <span className="text-sm text-foreground/60">
                {conversation.status === "connecting"
                  ? "Connecting..."
                  : conversation.isSpeaking
                    ? "AI Speaking"
                    : "Listening..."}
              </span>
            </div>

            {/* Research indicator */}
            {conversation.isSpeaking && (
              <div className="text-xs text-gold/60 animate-pulse">
                Powered by Firecrawl Search
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
  const dimensions = [
    { name: "Eloquence", score: scores.eloquence, emoji: "🎭" },
    { name: "Evidence", score: scores.evidence, emoji: "📊" },
    { name: "Resilience", score: scores.resilience, emoji: "🛡️" },
    { name: "Logic", score: scores.logic, emoji: "🧠" },
    { name: "Wit", score: scores.wit, emoji: "⚡" },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md text-center">
        <h2 className="text-sm uppercase tracking-widest text-gold/60 mb-2">
          Final Score
        </h2>
        <div className="font-serif text-7xl font-bold text-gold mb-2">
          {scores.total}
          <span className="text-3xl text-foreground/30">/100</span>
        </div>
        <div className="text-xl font-semibold text-gold-light mb-6">
          {scores.title}
        </div>

        {/* Score breakdown */}
        <div className="space-y-3 mb-8">
          {dimensions.map((dim) => (
            <div key={dim.name} className="flex items-center gap-3">
              <span className="text-lg w-6">{dim.emoji}</span>
              <span className="text-sm text-foreground/60 w-24 text-left">
                {dim.name}
              </span>
              <div className="flex-1 h-2 bg-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-1000"
                  style={{ width: `${(dim.score / 20) * 100}%` }}
                />
              </div>
              <span className="text-sm font-mono text-foreground/50 w-10 text-right">
                {dim.score}/20
              </span>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="border border-gold/20 rounded-xl bg-gold/5 p-4 mb-8">
          <p className="text-foreground/80 italic">&ldquo;{scores.verdict}&rdquo;</p>
        </div>

        {/* Topic reminder */}
        <div className="text-xs text-foreground/30 mb-6">
          Topic: &ldquo;{topic}&rdquo; — You argued {userSide}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="rounded-lg border border-gold/30 bg-gold/10 px-6 py-2.5 text-sm font-medium text-gold hover:bg-gold/20 transition-colors"
          >
            New Debate
          </a>
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
