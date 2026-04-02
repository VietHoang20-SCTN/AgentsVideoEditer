// ============================================
// Right Panel - Properties Inspector
// Shows properties for the selected item
// ============================================

"use client";

import React from "react";
import {
  Settings,
  Film,
  Music,
  Type,
  Image,
  Sparkles,
} from "lucide-react";
import { usePanels, useSingleSelectedItem } from "@/hooks/use-editor-store";
import type { TrackItem } from "@/types/editor";
import { formatTime } from "@/lib/editor/utils";

function PropertyRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs text-gray-200 font-mono">{value}</span>
    </div>
  );
}

function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-800 pb-3 mb-3">
      <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ItemIcon({ type }: { type: string }) {
  switch (type) {
    case "video-clip":
      return <Film size={14} className="text-blue-400" />;
    case "audio-clip":
      return <Music size={14} className="text-green-400" />;
    case "text-overlay":
      return <Type size={14} className="text-yellow-400" />;
    case "image-overlay":
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image size={14} className="text-purple-400" />;
    case "effect":
      return <Sparkles size={14} className="text-pink-400" />;
    default:
      return <Settings size={14} className="text-gray-400" />;
  }
}

function ItemProperties({ item }: { item: TrackItem }) {
  const durationMs = item.endMs - item.startMs;

  return (
    <div className="p-3">
      {/* Item header */}
      <div className="flex items-center gap-2 mb-4">
        <ItemIcon type={item.type} />
        <span className="text-sm font-medium text-white truncate">
          {item.name || item.type}
        </span>
      </div>

      {/* Timing */}
      <PropertySection title="Timing">
        <PropertyRow label="Start" value={formatTime(item.startMs)} />
        <PropertyRow label="End" value={formatTime(item.endMs)} />
        <PropertyRow label="Duration" value={formatTime(durationMs)} />
      </PropertySection>

      {/* Appearance */}
      <PropertySection title="Appearance">
        <PropertyRow label="Opacity" value={`${item.opacity}%`} />
        <PropertyRow label="Locked" value={item.locked ? "Yes" : "No"} />
      </PropertySection>

      {/* Type-specific properties */}
      {(item.type === "video-clip" || item.type === "audio-clip") && "properties" in item && (
        <PropertySection title="Source">
          <PropertyRow
            label="Source Start"
            value={formatTime((item.properties as { sourceStartMs: number }).sourceStartMs)}
          />
          <PropertyRow
            label="Source End"
            value={formatTime((item.properties as { sourceEndMs: number }).sourceEndMs)}
          />
          {item.type === "video-clip" && (
            <PropertyRow
              label="Volume"
              value={`${(item.properties as { volume: number }).volume}%`}
            />
          )}
        </PropertySection>
      )}
    </div>
  );
}

export default function RightPanel() {
  const panels = usePanels();
  const selectedItem = useSingleSelectedItem();

  if (panels.rightContext.type === "none" || !selectedItem) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Properties
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-500 px-6 text-center">
            <Settings size={24} />
            <span className="text-xs">No item selected</span>
            <span className="text-xs text-gray-600">
              Select an item on the timeline to view properties
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Properties
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ItemProperties item={selectedItem} />
      </div>
    </div>
  );
}
