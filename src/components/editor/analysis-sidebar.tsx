"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  FileText,
  Sparkles,
  Bookmark,
  Lightbulb,
  Loader2,
} from "lucide-react";
import type { AIAnalysisData } from "@/components/editor/types";
import { formatTimeShort, getMarkerColor } from "@/lib/editor/utils";

interface AnalysisSidebarProps {
  analysis: AIAnalysisData | null;
  onSeek: (timeMs: number) => void;
  isLoading: boolean;
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-700/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-800/50 transition-colors"
      >
        {isOpen ? (
          <ChevronDown size={14} className="text-gray-400" />
        ) : (
          <ChevronRight size={14} className="text-gray-400" />
        )}
        <Icon size={14} className="text-gray-400" />
        <span>{title}</span>
      </button>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80
      ? "bg-green-500/20 text-green-400"
      : pct >= 50
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-red-500/20 text-red-400";

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
      {pct}%
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
      {type}
    </span>
  );
}

function SeekButton({
  timeMs,
  onSeek,
  children,
}: {
  timeMs: number;
  onSeek: (timeMs: number) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onSeek(timeMs)}
      className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-800 transition-colors group"
    >
      {children}
    </button>
  );
}

export default function AnalysisSidebar({
  analysis,
  onSeek,
  isLoading,
}: AnalysisSidebarProps) {
  if (isLoading) {
    return (
      <div className="w-80 bg-gray-900 border-l border-gray-700 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-sm">Analyzing video...</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="w-80 bg-gray-900 border-l border-gray-700 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-500 px-6 text-center">
          <Sparkles size={24} />
          <span className="text-sm">No AI analysis available</span>
          <span className="text-xs text-gray-600">
            Analysis will appear here once processing is complete
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto flex flex-col">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400" />
          AI Analysis
        </h2>
      </div>

      {/* Language */}
      <CollapsibleSection title="Language" icon={Globe}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">{analysis.languageName}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{analysis.detectedLanguage}</span>
            <ConfidenceBadge value={analysis.confidence} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Summary */}
      <CollapsibleSection title="Summary" icon={FileText}>
        <p className="text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
      </CollapsibleSection>

      {/* Transcript Highlights */}
      {analysis.transcriptHighlights.length > 0 && (
        <CollapsibleSection title="Transcript Highlights" icon={Sparkles} defaultOpen={false}>
          <div className="space-y-1">
            {analysis.transcriptHighlights.map((h, i) => (
              <SeekButton key={i} timeMs={h.start * 1000} onSeek={onSeek}>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 font-mono mt-0.5 shrink-0">
                    {formatTimeShort(h.start * 1000)}
                  </span>
                  <span className="text-xs text-gray-300 line-clamp-2">{h.text}</span>
                </div>
              </SeekButton>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Edit Suggestions */}
      {analysis.editSuggestions.length > 0 && (
        <CollapsibleSection title="Edit Suggestions" icon={Lightbulb} defaultOpen={false}>
          <div className="space-y-1">
            {analysis.editSuggestions.map((s, i) => (
              <SeekButton key={i} timeMs={s.start * 1000} onSeek={onSeek}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={s.type} />
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTimeShort(s.start * 1000)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{s.reason}</span>
                </div>
              </SeekButton>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Markers */}
      {analysis.editorMarkers.length > 0 && (
        <CollapsibleSection title="Markers" icon={Bookmark} defaultOpen={false}>
          <div className="space-y-1">
            {analysis.editorMarkers.map((m, i) => (
              <SeekButton key={i} timeMs={m.time * 1000} onSeek={onSeek}>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getMarkerColor(m.type || "user") }}
                  />
                  <span className="text-xs text-gray-300 truncate">{m.label}</span>
                  <span className="text-xs text-gray-500 font-mono ml-auto shrink-0">
                    {formatTimeShort(m.time * 1000)}
                  </span>
                </div>
              </SeekButton>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
