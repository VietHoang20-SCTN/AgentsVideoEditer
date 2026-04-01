// ============================================
// Left Panel - Asset Browser / Media Library
// Tabs: Media, Text, Audio, Effects
// ============================================

"use client";

import React from "react";
import {
  Film,
  Type,
  Music,
  Sparkles,
  FileText,
} from "lucide-react";
import { usePanels, useEditorActions } from "@/hooks/use-editor-store";
import type { LeftPanelTab } from "@/types/editor";

interface LeftPanelProps {
  /** Slot for media browser content */
  mediaBrowser?: React.ReactNode;
  /** Slot for analysis sidebar content */
  analysisSidebar?: React.ReactNode;
}

const TABS: { id: LeftPanelTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "media", label: "Media", icon: Film },
  { id: "text", label: "Text", icon: Type },
  { id: "audio", label: "Audio", icon: Music },
  { id: "effects", label: "Effects", icon: Sparkles },
  { id: "ai-analysis", label: "Analysis", icon: FileText },
];

export default function LeftPanel({ mediaBrowser, analysisSidebar }: LeftPanelProps) {
  const panels = usePanels();
  const { setLeftTab } = useEditorActions();

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = panels.leftTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setLeftTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] transition-colors ${
                isActive
                  ? "text-blue-400 border-b-2 border-blue-400 bg-gray-800/50"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
              }`}
              title={tab.label}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {panels.leftTab === "media" && (
          <div className="p-3">
            {mediaBrowser || (
              <div className="flex flex-col items-center gap-2 text-gray-500 py-8">
                <Film size={24} />
                <span className="text-xs">Media browser</span>
                <span className="text-xs text-gray-600">Drag media to timeline</span>
              </div>
            )}
          </div>
        )}

        {panels.leftTab === "text" && (
          <div className="p-3">
            <div className="flex flex-col items-center gap-2 text-gray-500 py-8">
              <Type size={24} />
              <span className="text-xs">Text overlays</span>
              <span className="text-xs text-gray-600">Add titles and captions</span>
            </div>
          </div>
        )}

        {panels.leftTab === "audio" && (
          <div className="p-3">
            <div className="flex flex-col items-center gap-2 text-gray-500 py-8">
              <Music size={24} />
              <span className="text-xs">Audio library</span>
              <span className="text-xs text-gray-600">Add background music</span>
            </div>
          </div>
        )}

        {panels.leftTab === "effects" && (
          <div className="p-3">
            <div className="flex flex-col items-center gap-2 text-gray-500 py-8">
              <Sparkles size={24} />
              <span className="text-xs">Effects & transitions</span>
              <span className="text-xs text-gray-600">Coming soon</span>
            </div>
          </div>
        )}

        {panels.leftTab === "ai-analysis" && (
          <div className="flex-1">
            {analysisSidebar || (
              <div className="flex flex-col items-center gap-2 text-gray-500 py-8 px-3">
                <FileText size={24} />
                <span className="text-xs">AI Analysis</span>
                <span className="text-xs text-gray-600">
                  Analysis will appear here after processing
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
