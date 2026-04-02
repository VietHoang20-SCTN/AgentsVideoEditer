// ============================================
// Right Panel - Interactive Properties Inspector
// Dispatches to store via type-specific editors
// ============================================

"use client";

import React from "react";
import { Settings, Film, Music, Type, Image, Sparkles, GitBranch, Wand2 } from "lucide-react";
import { usePanels, useSingleSelectedItem } from "@/hooks/use-editor-store";
import type {
  TrackItem,
  VideoClipItem,
  AudioClipItem,
  TextOverlayItem,
  StickerItem,
  EffectItem,
  TransitionItem,
  FilterItem,
} from "@/types/editor";

import BaseProperties from "@/components/editor/properties/base-properties";
import VideoClipProperties from "@/components/editor/properties/video-clip-properties";
import AudioClipProperties from "@/components/editor/properties/audio-clip-properties";
import TextOverlayProperties from "@/components/editor/properties/text-overlay-properties";
import StickerProperties from "@/components/editor/properties/sticker-properties";
import EffectProperties from "@/components/editor/properties/effect-properties";
import TransitionProperties from "@/components/editor/properties/transition-properties";
import FilterProperties from "@/components/editor/properties/filter-properties";

// ── Item type icon ────────────────────────────

function ItemIcon({ type }: { type: string }) {
  switch (type) {
    case "video-clip":
      return <Film size={14} className="text-blue-400" />;
    case "audio-clip":
      return <Music size={14} className="text-green-400" />;
    case "text-overlay":
      return <Type size={14} className="text-yellow-400" />;
    case "sticker":
      return <Image size={14} className="text-purple-400" />;
    case "effect":
      return <Sparkles size={14} className="text-pink-400" />;
    case "transition":
      return <GitBranch size={14} className="text-orange-400" />;
    case "filter":
      return <Wand2 size={14} className="text-cyan-400" />;
    default:
      return <Settings size={14} className="text-gray-400" />;
  }
}

// ── Type badge color ──────────────────────────

function typeBadgeClass(type: string): string {
  switch (type) {
    case "video-clip":   return "bg-blue-900/50 text-blue-300";
    case "audio-clip":   return "bg-green-900/50 text-green-300";
    case "text-overlay": return "bg-yellow-900/50 text-yellow-300";
    case "sticker":      return "bg-purple-900/50 text-purple-300";
    case "effect":       return "bg-pink-900/50 text-pink-300";
    case "transition":   return "bg-orange-900/50 text-orange-300";
    case "filter":       return "bg-cyan-900/50 text-cyan-300";
    default:             return "bg-gray-800 text-gray-400";
  }
}

// ── Type-specific property editor switch ──────

function TypeSpecificProperties({ item }: { item: TrackItem }) {
  switch (item.type) {
    case "video-clip":
      return <VideoClipProperties item={item as VideoClipItem} />;
    case "audio-clip":
      return <AudioClipProperties item={item as AudioClipItem} />;
    case "text-overlay":
      return <TextOverlayProperties item={item as TextOverlayItem} />;
    case "sticker":
      return <StickerProperties item={item as StickerItem} />;
    case "effect":
      return <EffectProperties item={item as EffectItem} />;
    case "transition":
      return <TransitionProperties item={item as TransitionItem} />;
    case "filter":
      return <FilterProperties item={item as FilterItem} />;
    default:
      return null;
  }
}

// ── Full item inspector ───────────────────────

function ItemInspector({ item }: { item: TrackItem }) {
  return (
    <div className="flex flex-col">
      {/* Item header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800">
        <ItemIcon type={item.type} />
        <span className="flex-1 text-sm font-medium text-white truncate">
          {item.name || item.type}
        </span>
        <span
          className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${typeBadgeClass(item.type)}`}
        >
          {item.type.replace("-", " ")}
        </span>
      </div>

      {/* Base properties (timing, opacity, lock) */}
      <BaseProperties item={item} />

      {/* Type-specific property sections */}
      <TypeSpecificProperties item={item} />
    </div>
  );
}

// ── Main panel ────────────────────────────────

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
              Select an item on the timeline to edit its properties
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800 shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Properties
        </h2>
      </div>

      {/* Scrollable inspector content */}
      <div className="flex-1 overflow-y-auto">
        <ItemInspector item={selectedItem} />
      </div>
    </div>
  );
}
