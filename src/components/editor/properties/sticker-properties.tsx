// ============================================
// Sticker Properties Editor
// ============================================

"use client";

import type { StickerItem } from "@/types/editor";
import { useEditorActions } from "@/hooks/use-editor-store";
import { PropSection, PropNumber, PropToggle } from "./prop-controls";

interface StickerPropertiesProps {
  item: StickerItem;
}

export default function StickerProperties({ item }: StickerPropertiesProps) {
  const { updateTrackItemProperties } = useEditorActions();
  const p = item.properties;

  const update = (updates: Partial<typeof p>) =>
    updateTrackItemProperties(item.id, updates);

  return (
    <PropSection title="Sticker">
      <PropNumber
        label="Scale"
        value={Math.round((p.scale ?? 1) * 100)}
        min={1}
        max={500}
        unit="%"
        onChange={(v) => update({ scale: v / 100 })}
      />
      <PropNumber
        label="X"
        value={p.posX ?? 0}
        step={1}
        unit="px"
        onChange={(v) => update({ posX: v })}
      />
      <PropNumber
        label="Y"
        value={p.posY ?? 0}
        step={1}
        unit="px"
        onChange={(v) => update({ posY: v })}
      />
      <PropNumber
        label="Width"
        value={p.width ?? 100}
        min={10}
        unit="px"
        onChange={(v) => update({ width: v })}
      />
      <PropNumber
        label="Height"
        value={p.height ?? 100}
        min={10}
        unit="px"
        onChange={(v) => update({ height: v })}
      />
      <PropNumber
        label="Rotation"
        value={p.rotation ?? 0}
        min={-360}
        max={360}
        unit="°"
        onChange={(v) => update({ rotation: v })}
      />
      <PropToggle
        label="Flip H"
        value={p.flipH ?? false}
        onChange={(v) => update({ flipH: v })}
      />
      <PropToggle
        label="Flip V"
        value={p.flipV ?? false}
        onChange={(v) => update({ flipV: v })}
      />
    </PropSection>
  );
}
