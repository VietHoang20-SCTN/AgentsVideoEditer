// ============================================
// Transition Properties Editor
// ============================================

"use client";

import type { TransitionItem } from "@/types/editor";
import { useEditorActions } from "@/hooks/use-editor-store";
import { PropSection, PropNumber, PropSelect, PropReadOnly } from "./prop-controls";

const EASING_OPTIONS = [
  { value: "linear", label: "Linear" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In-Out" },
];

interface TransitionPropertiesProps {
  item: TransitionItem;
}

export default function TransitionProperties({ item }: TransitionPropertiesProps) {
  const { updateTrackItemProperties } = useEditorActions();
  const p = item.properties;

  const update = (updates: Partial<typeof p>) =>
    updateTrackItemProperties(item.id, updates);

  return (
    <PropSection title="Transition">
      <PropReadOnly label="Type" value={p.transitionType ?? "—"} />
      <PropNumber
        label="Duration"
        value={p.durationMs ?? 500}
        min={100}
        max={5000}
        step={100}
        unit="ms"
        onChange={(v) => update({ durationMs: v })}
      />
      <PropSelect
        label="Easing"
        value={p.easing ?? "ease-in-out"}
        options={EASING_OPTIONS}
        onChange={(v) => update({ easing: v as "linear" | "ease-in" | "ease-out" | "ease-in-out" })}
      />
    </PropSection>
  );
}
