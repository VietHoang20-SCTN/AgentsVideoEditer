// ============================================
// Effect Properties Editor
// ============================================

"use client";

import type { EffectItem } from "@/types/editor";
import { useEditorActions } from "@/hooks/use-editor-store";
import { PropSection, PropSlider, PropReadOnly } from "./prop-controls";

interface EffectPropertiesProps {
  item: EffectItem;
}

export default function EffectProperties({ item }: EffectPropertiesProps) {
  const { updateTrackItemProperties } = useEditorActions();
  const p = item.properties;

  const update = (updates: Partial<typeof p>) =>
    updateTrackItemProperties(item.id, updates);

  return (
    <PropSection title="Effect">
      <PropReadOnly label="Type" value={p.effectType ?? "—"} />
      <PropSlider
        label="Intensity"
        value={Math.round((p.intensity ?? 1) * 100)}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => update({ intensity: v / 100 })}
      />
    </PropSection>
  );
}
