"use client";

import { FileVideo, Clock, Monitor, Gauge, Music } from "lucide-react";

interface MetadataDisplayProps {
  fileName: string;
  sizeBytes: number;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  codec?: string | null;
  audioCodec?: string | null;
  bitrate?: number | null;
}

export function MetadataDisplay({
  fileName,
  sizeBytes,
  durationMs,
  width,
  height,
  fps,
  codec,
  audioCodec,
  bitrate,
}: MetadataDisplayProps) {
  const sizeMB = (sizeBytes / 1024 / 1024).toFixed(1);

  const items = [
    { icon: FileVideo, label: "File", value: `${fileName} (${sizeMB} MB)` },
    durationMs != null && {
      icon: Clock,
      label: "Duration",
      value: `${(durationMs / 1000).toFixed(1)}s`,
    },
    width != null &&
      height != null && {
        icon: Monitor,
        label: "Resolution",
        value: `${width}x${height}${fps ? ` @ ${fps}fps` : ""}`,
      },
    codec && { icon: Gauge, label: "Video Codec", value: codec },
    audioCodec && { icon: Music, label: "Audio Codec", value: audioCodec },
    bitrate != null && {
      icon: Gauge,
      label: "Bitrate",
      value: `${(bitrate / 1000).toFixed(0)} kbps`,
    },
  ].filter(Boolean) as Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
  }>;

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Video Information</h3>
      <dl className="space-y-2">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            <Icon className="h-4 w-4 text-gray-400" />
            <dt className="font-medium text-gray-500">{label}:</dt>
            <dd className="text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
