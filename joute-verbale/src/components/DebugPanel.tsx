"use client";

import { useEffect, useRef } from "react";

export type DebugEntryType = "PROMPT" | "AI" | "USER" | "TOOL" | "RESULT" | "SYSTEM";

export interface DebugEntry {
  timestamp: Date;
  type: DebugEntryType;
  content: string;
}

const TYPE_COLORS: Record<DebugEntryType, string> = {
  PROMPT: "text-purple-400",
  AI: "text-green-400",
  USER: "text-blue-400",
  TOOL: "text-amber-400",
  RESULT: "text-amber-300",
  SYSTEM: "text-gray-500",
};

function formatTs(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function DebugPanel({
  entries,
  isOpen,
  onToggle,
}: {
  entries: DebugEntry[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 rounded-lg border border-foreground/20 bg-gray-950/90 px-3 py-2 text-xs font-mono text-green-400 hover:bg-gray-900 transition-colors backdrop-blur-sm"
        title="Toggle debug panel"
      >
        {isOpen ? "✕" : "⌘"}
      </button>

      {/* Panel */}
      <div
        className={`fixed top-0 left-0 z-40 h-full transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "min(420px, 90vw)" }}
      >
        <div className="h-full bg-gray-950/95 border-r border-foreground/10 backdrop-blur-sm flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-foreground/10">
            <span className="font-mono text-xs text-green-400">
              debug://joute-verbale
            </span>
            <span className="ml-auto font-mono text-xs text-foreground/30">
              {entries.length} entries
            </span>
          </div>

          {/* Entries */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
          >
            {entries.length === 0 && (
              <div className="text-xs text-foreground/20 font-mono py-4 text-center">
                Waiting for events…
              </div>
            )}
            {entries.map((entry, i) => (
              <div key={i} className="font-mono text-xs leading-relaxed">
                <span className="text-foreground/30">{formatTs(entry.timestamp)}</span>{" "}
                <span className={TYPE_COLORS[entry.type]}>
                  [{entry.type === "TOOL" || entry.type === "RESULT"
                    ? `${entry.type}:firecrawl_search`
                    : entry.type}]
                </span>{" "}
                <span className="text-foreground/70 whitespace-pre-wrap break-all">
                  {entry.type === "RESULT"
                    ? truncate(entry.content, 500)
                    : entry.type === "PROMPT"
                      ? truncate(entry.content, 800)
                      : entry.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
