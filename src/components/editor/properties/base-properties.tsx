// ============================================
// Base Properties Editor
// Timing, Opacity, Lock — common to all items
// ============================================

"use client";

import type { TrackItem } from "@/types/editor";
import { useEditorActions } from "@/hooks/use-editor-store";
import { PropSection, PropText, PropSlider, PropToggle, PropReadOnly } from "./prop-controls";

function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  const ms_ = Math.floor(ms % 1000).toString().padStart(3, "0");
  return `${m}:${s}.${ms_}`;
}

interface BasePropertiesProps {
  item: TrackItem;
}

export default function BaseProperties({ item }: BasePropertiesProps) {
  const { updateTrackItem } = useEditorActions();

  return (
    <PropSection title="Item">
      <PropText
        label="Name"
        value={item.name}
        onChange={(v) => updateTrackItem(item.id, { name: v })}
      />
      <PropReadOnly label="Type" value={item.type} />
      <PropReadOnly label="Start" value={formatMs(item.startMs)} />
      <PropReadOnly label="End" value={formatMs(item.endMs)} />
      <PropReadOnly label="Duration" value={formatMs(item.endMs - item.startMs)} />
      <PropSlider
        label="Opacity"
        value={Math.round((item.opacity ?? 1) * 100)}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => updateTrackItem(item.id, { opacity: v / 100 })}
      />
      <PropToggle
        label="Locked"
        value={item.locked ?? false}
        onChange={(v) => updateTrackItem(item.id, { locked: v })}
      />
    </PropSection>
  );
}
