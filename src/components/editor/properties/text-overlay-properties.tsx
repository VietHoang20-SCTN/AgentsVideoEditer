// ============================================
// Text Overlay Properties Editor
// ============================================

"use client";

import type { TextOverlayItem } from "@/types/editor";
import { useEditorActions } from "@/hooks/use-editor-store";
import {
  PropSection,
  PropText,
  PropNumber,
  PropSlider,
  PropColor,
  PropToggle,
  PropSelect,
} from "./prop-controls";

const TEXT_ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const FONT_WEIGHT_OPTIONS = [
  { value: "400", label: "Normal (400)" },
  { value: "700", label: "Bold (700)" },
  { value: "300", label: "Light (300)" },
  { value: "900", label: "Black (900)" },
];

interface TextOverlayPropertiesProps {
  item: TextOverlayItem;
}

export default function TextOverlayProperties({ item }: TextOverlayPropertiesProps) {
  const { updateTrackItemProperties } = useEditorActions();
  const p = item.properties;

  const update = (updates: Partial<typeof p>) =>
    updateTrackItemProperties(item.id, updates);

  return (
    <>
      <PropSection title="Content">
        <PropText
          label="Text"
          value={p.content ?? ""}
          multiline
          onChange={(v) => update({ content: v })}
        />
        <PropText
          label="Font"
          value={p.fontFamily ?? "sans-serif"}
          onChange={(v) => update({ fontFamily: v })}
        />
        <PropNumber
          label="Size"
          value={p.fontSize ?? 24}
          min={4}
          max={200}
          unit="px"
          onChange={(v) => update({ fontSize: v })}
        />
        <PropSelect
          label="Weight"
          value={String(p.fontWeight ?? 400)}
          options={FONT_WEIGHT_OPTIONS}
          onChange={(v) => update({ fontWeight: parseInt(v, 10) })}
        />
        <PropSelect
          label="Align"
          value={p.textAlign ?? "center"}
          options={TEXT_ALIGN_OPTIONS}
          onChange={(v) => update({ textAlign: v as "left" | "center" | "right" })}
        />
      </PropSection>

      <PropSection title="Style">
        <PropColor
          label="Color"
          value={p.color ?? "#ffffff"}
          onChange={(v) => update({ color: v })}
        />
        <PropColor
          label="BG Color"
          value={p.backgroundColor ?? "#00000000"}
          onChange={(v) => update({ backgroundColor: v })}
        />
        <PropToggle
          label="Bold"
          value={p.bold ?? false}
          onChange={(v) => update({ bold: v })}
        />
        <PropToggle
          label="Italic"
          value={p.italic ?? false}
          onChange={(v) => update({ italic: v })}
        />
        <PropToggle
          label="Underline"
          value={p.underline ?? false}
          onChange={(v) => update({ underline: v })}
        />
        <PropNumber
          label="Letter Sp."
          value={p.letterSpacing ?? 0}
          min={-10}
          max={50}
          step={0.5}
          unit="px"
          onChange={(v) => update({ letterSpacing: v })}
        />
        <PropNumber
          label="Line H."
          value={p.lineHeight ?? 1.2}
          min={0.5}
          max={4}
          step={0.1}
          onChange={(v) => update({ lineHeight: v })}
        />
      </PropSection>

      <PropSection title="Stroke & Shadow" defaultOpen={false}>
        <PropColor
          label="Stroke"
          value={p.strokeColor ?? "#000000"}
          onChange={(v) => update({ strokeColor: v })}
        />
        <PropNumber
          label="Stroke W."
          value={p.strokeWidth ?? 0}
          min={0}
          max={20}
          unit="px"
          onChange={(v) => update({ strokeWidth: v })}
        />
        <PropColor
          label="Shadow"
          value={p.shadowColor ?? "#000000"}
          onChange={(v) => update({ shadowColor: v })}
        />
        <PropSlider
          label="Shadow Blur"
          value={p.shadowBlur ?? 0}
          min={0}
          max={30}
          onChange={(v) => update({ shadowBlur: v })}
        />
        <PropNumber
          label="Shadow X"
          value={p.shadowOffsetX ?? 0}
          step={1}
          unit="px"
          onChange={(v) => update({ shadowOffsetX: v })}
        />
        <PropNumber
          label="Shadow Y"
          value={p.shadowOffsetY ?? 0}
          step={1}
          unit="px"
          onChange={(v) => update({ shadowOffsetY: v })}
        />
      </PropSection>

      <PropSection title="Position" defaultOpen={false}>
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
          value={p.width ?? 400}
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
      </PropSection>
    </>
  );
}
