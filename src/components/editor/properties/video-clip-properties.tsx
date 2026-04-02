// ============================================
// Video Clip Properties Editor
// ============================================

"use client";

import type { VideoClipItem } from "@/types/editor";
import { useEditorActions } from "@/hooks/use-editor-store";
import { PropSection, PropSlider, PropToggle, PropNumber } from "./prop-controls";

interface VideoClipPropertiesProps {
  item: VideoClipItem;
}

export default function VideoClipProperties({ item }: VideoClipPropertiesProps) {
  const { updateTrackItemProperties } = useEditorActions();
  const p = item.properties;

  const update = (updates: Partial<typeof p>) =>
    updateTrackItemProperties(item.id, updates);

  return (
    <>
      <PropSection title="Playback">
        <PropSlider
          label="Volume"
          value={Math.round((p.volume ?? 1) * 100)}
          min={0}
          max={200}
          unit="%"
          onChange={(v) => update({ volume: v / 100 })}
        />
        <PropToggle
          label="Muted"
          value={p.audioMuted ?? false}
          onChange={(v) => update({ audioMuted: v })}
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
      </PropSection>

      <PropSection title="Transform" defaultOpen={false}>
        <PropNumber
          label="Scale"
          value={Math.round((p.scale ?? 1) * 100)}
          min={1}
          max={500}
          unit="%"
          onChange={(v) => update({ scale: v / 100 })}
        />
        <PropNumber
          label="Pos X"
          value={p.posX ?? 0}
          step={1}
          unit="px"
          onChange={(v) => update({ posX: v })}
        />
        <PropNumber
          label="Pos Y"
          value={p.posY ?? 0}
          step={1}
          unit="px"
          onChange={(v) => update({ posY: v })}
        />
        <PropNumber
          label="Rotation"
          value={p.rotation ?? 0}
          min={-360}
          max={360}
          step={1}
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

      <PropSection title="Color" defaultOpen={false}>
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
      </PropSection>

      <PropSection title="Crop" defaultOpen={false}>
        <PropSlider
          label="Left"
          value={Math.round((p.cropLeft ?? 0) * 100)}
          min={0}
          max={50}
          unit="%"
          onChange={(v) => update({ cropLeft: v / 100 })}
        />
        <PropSlider
          label="Right"
          value={Math.round((p.cropRight ?? 0) * 100)}
          min={0}
          max={50}
          unit="%"
          onChange={(v) => update({ cropRight: v / 100 })}
        />
        <PropSlider
          label="Top"
          value={Math.round((p.cropTop ?? 0) * 100)}
          min={0}
          max={50}
          unit="%"
          onChange={(v) => update({ cropTop: v / 100 })}
        />
        <PropSlider
          label="Bottom"
          value={Math.round((p.cropBottom ?? 0) * 100)}
          min={0}
          max={50}
          unit="%"
          onChange={(v) => update({ cropBottom: v / 100 })}
        />
      </PropSection>
    </>
  );
}
