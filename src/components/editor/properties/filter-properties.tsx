// ============================================
// Filter Properties Editor
// ============================================

"use client";

import type { FilterItem } from "@/types/editor";
import { useEditorActions } from "@/hooks/use-editor-store";
import { PropSection, PropSlider } from "./prop-controls";

interface FilterPropertiesProps {
  item: FilterItem;
}

export default function FilterProperties({ item }: FilterPropertiesProps) {
  const { updateTrackItemProperties } = useEditorActions();
  const p = item.properties;

  const update = (updates: Partial<typeof p>) =>
    updateTrackItemProperties(item.id, updates);

  return (
    <PropSection title="Filter">
      <PropSlider
        label="Intensity"
        value={Math.round((p.intensity ?? 1) * 100)}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => update({ intensity: v / 100 })}
      />
      <PropSlider
        label="Brightness"
        value={p.brightness ?? 0}
        min={-100}
        max={100}
        onChange={(v) => update({ brightness: v })}
      />
      <PropSlider
        label="Contrast"
        value={p.contrast ?? 0}
        min={-100}
        max={100}
        onChange={(v) => update({ contrast: v })}
      />
      <PropSlider
        label="Saturation"
        value={p.saturation ?? 0}
        min={-100}
        max={100}
        onChange={(v) => update({ saturation: v })}
      />
      <PropSlider
        label="Temperature"
        value={p.temperature ?? 0}
        min={-100}
        max={100}
        onChange={(v) => update({ temperature: v })}
      />
      <PropSlider
        label="Tint"
        value={p.tint ?? 0}
        min={-100}
        max={100}
        onChange={(v) => update({ tint: v })}
      />
      <PropSlider
        label="Highlights"
        value={p.highlights ?? 0}
        min={-100}
        max={100}
        onChange={(v) => update({ highlights: v })}
      />
      <PropSlider
        label="Shadows"
        value={p.shadows ?? 0}
        min={-100}
        max={100}
        onChange={(v) => update({ shadows: v })}
      />
    </PropSection>
  );
}
