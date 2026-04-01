"use client";

import { useState } from "react";
import type { Marker } from "@/components/editor/types";
import { getMarkerColor } from "@/lib/editor/utils";

interface MarkerOverlayProps {
  markers: Marker[];
  duration: number;
  zoom: number;
  onMarkerClick: (marker: Marker) => void;
}

export default function MarkerOverlay({
  markers,
  duration,
  zoom,
  onMarkerClick,
}: MarkerOverlayProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (markers.length === 0 || duration <= 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {markers.map((marker) => {
        const leftPx = (marker.timeMs / 1000) * zoom;
        const color = marker.color || getMarkerColor(marker.type);
        const isHovered = hoveredId === marker.id;

        return (
          <div
            key={marker.id}
            className="absolute top-0 pointer-events-auto cursor-pointer group"
            style={{ left: `${leftPx}px` }}
            onClick={(e) => {
              e.stopPropagation();
              onMarkerClick(marker);
            }}
            onMouseEnter={() => setHoveredId(marker.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Marker triangle */}
            <div
              className="w-0 h-0 -translate-x-1/2"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: `8px solid ${color}`,
              }}
            />

            {/* Marker line */}
            <div
              className="w-px h-full -translate-x-1/2 opacity-50"
              style={{
                backgroundColor: color,
                minHeight: "56px",
              }}
            />

            {/* Tooltip */}
            {isHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-white whitespace-nowrap z-50 shadow-lg">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                  style={{ backgroundColor: color }}
                />
                {marker.label}
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: "4px solid transparent",
                    borderRight: "4px solid transparent",
                    borderTop: "4px solid #4b5563",
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
