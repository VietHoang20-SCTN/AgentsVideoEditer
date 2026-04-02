// ============================================
// Audio Clip Properties Editor
// ============================================

"use client";

import type { AudioClipItem } from "@/types/editor";
import { useEditorActions } from "@/hooks/use-editor-store";
import { PropSection, PropSlider, PropNumber } from "./prop-controls";

interface AudioClipPropertiesProps {
  item: AudioClipItem;
}

export default function AudioClipProperties({ item }: AudioClipPropertiesProps) {
  const { updateTrackItemProperties } = useEditorActions();
  const p = item.properties;

  const update = (updates: Partial<typeof p>) =>
    updateTrackItemProperties(item.id, updates);

  return (
    <PropSection title="Audio">
      <PropSlider
        label="Volume"
        value={Math.round((p.volume ?? 1) * 100)}
        min={0}
        max={200}
        unit="%"
        onChange={(v) => update({ volume: v / 100 })}
      />
      <PropNumber
        label="Speed"
        value={p.speed ?? 1}
        min={0.1}
        max={4}
        step={0.1}
        unit="×"
        onChange={(v) => update({ speed: v })}
      />
      <PropNumber
        label="Fade In"
        value={p.fadeInMs ?? 0}
        min={0}
        step={100}
        unit="ms"
        onChange={(v) => update({ fadeInMs: v })}
      />
      <PropNumber
        label="Fade Out"
        value={p.fadeOutMs ?? 0}
        min={0}
        step={100}
        unit="ms"
        onChange={(v) => update({ fadeOutMs: v })}
      />
    </PropSection>
  );
}
