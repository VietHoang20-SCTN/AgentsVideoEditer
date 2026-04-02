import { describe, it, expect } from "vitest";
import {
  collectSnapPoints,
  findSnap,
  findMoveSnap,
  snapThresholdToMs,
  type SnapPoint,
} from "@/components/editor/timeline/timeline-snap";
import type { TrackItem, SnapSettings, Marker } from "@/types/editor";

// ── Test helpers ─────────────────────────────────────

function makeItem(overrides: Partial<TrackItem> = {}): TrackItem {
  return {
    id: "item-1",
    name: "Test Clip",
    type: "video-clip",
    trackId: "track-1",
    startMs: 1000,
    endMs: 5000,
    layer: 0,
    locked: false,
    visible: true,
    properties: {
      sourceUrl: "test.mp4",
      thumbnailUrl: "",
      originalDurationMs: 10000,
      volume: 1,
      muted: false,
      speed: 1,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      flipH: false,
      flipV: false,
      rotation: 0,
      cropTop: 0,
      cropBottom: 0,
      cropLeft: 0,
      cropRight: 0,
      posX: 0,
      posY: 0,
      width: 1920,
      height: 1080,
      scale: 1,
      opacity: 1,
    },
    ...overrides,
  } as TrackItem;
}

function makeMarker(overrides: Partial<Marker> = {}): Marker {
  return {
    id: "marker-1",
    timeMs: 3000,
    label: "Test Marker",
    type: "scene",
    ...overrides,
  };
}

const defaultSnap: SnapSettings = {
  enabled: true,
  snapToPlayhead: true,
  snapToItems: true,
  snapToMarkers: true,
  thresholdPx: 10,
};

// ── snapThresholdToMs ────────────────────────────────

describe("snapThresholdToMs", () => {
  it("converts pixel threshold to ms at zoom 100", () => {
    // 10px at zoom=100 (100px/s) = 100ms
    expect(snapThresholdToMs(10, 100)).toBe(100);
  });

  it("converts at different zoom levels", () => {
    expect(snapThresholdToMs(10, 50)).toBe(200);
    expect(snapThresholdToMs(10, 200)).toBe(50);
  });

  it("returns 0 for 0 threshold", () => {
    expect(snapThresholdToMs(0, 100)).toBe(0);
  });
});

// ── collectSnapPoints ────────────────────────────────
// Signature: collectSnapPoints(trackItems, markers, playheadMs, settings, excludeIds: Set<string>)

describe("collectSnapPoints", () => {
  it("includes playhead when snapToPlayhead is true", () => {
    const result = collectSnapPoints([], [], 5000, defaultSnap, new Set(["item-1"]));
    const playheadPoints = result.filter((p) => p.type === "playhead");
    expect(playheadPoints).toHaveLength(1);
    expect(playheadPoints[0].ms).toBe(5000);
  });

  it("excludes playhead when snapToPlayhead is false", () => {
    const result = collectSnapPoints(
      [], [], 5000,
      { ...defaultSnap, snapToPlayhead: false },
      new Set(["item-1"])
    );
    const playheadPoints = result.filter((p) => p.type === "playhead");
    expect(playheadPoints).toHaveLength(0);
  });

  it("includes other items start/end when snapToItems is true", () => {
    const items = [
      makeItem({ id: "item-1", startMs: 1000, endMs: 3000 }),
      makeItem({ id: "item-2", startMs: 5000, endMs: 8000 }),
    ];
    // Excluding item-1 — should include item-2 edges
    const result = collectSnapPoints(items, [], 0, defaultSnap, new Set(["item-1"]));
    const itemStarts = result.filter((p) => p.type === "item-start");
    const itemEnds = result.filter((p) => p.type === "item-end");
    expect(itemStarts.some((p) => p.ms === 5000)).toBe(true);
    expect(itemEnds.some((p) => p.ms === 8000)).toBe(true);
  });

  it("excludes the dragged item itself", () => {
    const items = [
      makeItem({ id: "item-1", startMs: 1000, endMs: 3000 }),
    ];
    const result = collectSnapPoints(items, [], 0, defaultSnap, new Set(["item-1"]));
    const itemPoints = result.filter(
      (p) => p.type === "item-start" || p.type === "item-end"
    );
    // Should not include item-1's own edges
    expect(itemPoints.every((p) => p.ms !== 1000 && p.ms !== 3000)).toBe(true);
  });

  it("excludes items when snapToItems is false", () => {
    const items = [
      makeItem({ id: "item-2", startMs: 5000, endMs: 8000 }),
    ];
    const result = collectSnapPoints(
      items, [], 0,
      { ...defaultSnap, snapToItems: false },
      new Set(["item-1"])
    );
    const itemPoints = result.filter(
      (p) => p.type === "item-start" || p.type === "item-end"
    );
    expect(itemPoints).toHaveLength(0);
  });

  it("includes markers when snapToMarkers is true", () => {
    const markers = [makeMarker({ timeMs: 7000 })];
    const result = collectSnapPoints([], markers, 0, defaultSnap, new Set(["item-1"]));
    const markerPoints = result.filter((p) => p.type === "marker");
    expect(markerPoints).toHaveLength(1);
    expect(markerPoints[0].ms).toBe(7000);
  });

  it("excludes markers when snapToMarkers is false", () => {
    const markers = [makeMarker()];
    const result = collectSnapPoints(
      [], markers, 0,
      { ...defaultSnap, snapToMarkers: false },
      new Set(["item-1"])
    );
    const markerPoints = result.filter((p) => p.type === "marker");
    expect(markerPoints).toHaveLength(0);
  });

  it("includes everything when all snap options enabled", () => {
    const items = [makeItem({ id: "item-2", startMs: 2000, endMs: 4000 })];
    const markers = [makeMarker({ timeMs: 6000 })];
    const result = collectSnapPoints(items, markers, 8000, defaultSnap, new Set(["item-1"]));
    expect(result.length).toBeGreaterThanOrEqual(4); // playhead + 2 item edges + 1 marker
    expect(result.some((p) => p.type === "playhead")).toBe(true);
    expect(result.some((p) => p.type === "item-start")).toBe(true);
    expect(result.some((p) => p.type === "item-end")).toBe(true);
    expect(result.some((p) => p.type === "marker")).toBe(true);
  });
});

// ── findSnap ─────────────────────────────────────────

describe("findSnap", () => {
  const points: SnapPoint[] = [
    { ms: 1000, type: "item-start" },
    { ms: 3000, type: "item-end" },
    { ms: 5000, type: "playhead" },
  ];

  it("snaps to closest point within threshold", () => {
    const result = findSnap(1050, points, 100);
    expect(result.snapped).toBe(true);
    expect(result.ms).toBe(1000);
    expect(result.snapPoint?.ms).toBe(1000);
  });

  it("returns original value when no point within threshold", () => {
    const result = findSnap(2000, points, 100);
    expect(result.snapped).toBe(false);
    expect(result.ms).toBe(2000);
    expect(result.snapPoint).toBeNull();
  });

  it("chooses the closest point when multiple within threshold", () => {
    const result = findSnap(2950, points, 200);
    expect(result.snapped).toBe(true);
    expect(result.ms).toBe(3000);
  });

  it("handles exact match", () => {
    const result = findSnap(5000, points, 100);
    expect(result.snapped).toBe(true);
    expect(result.ms).toBe(5000);
  });

  it("handles empty snap points array", () => {
    const result = findSnap(1000, [], 100);
    expect(result.snapped).toBe(false);
    expect(result.ms).toBe(1000);
  });

  it("handles zero threshold", () => {
    const result = findSnap(1000, points, 0);
    expect(result.snapped).toBe(true);
    expect(result.ms).toBe(1000);
  });

  it("does not snap when exactly at threshold boundary + 1", () => {
    // 1000 + 101 = 1101 with threshold 100 → should not snap
    const result = findSnap(1101, points, 100);
    expect(result.snapped).toBe(false);
  });
});

// ── findMoveSnap ─────────────────────────────────────
// Signature: findMoveSnap(startMs, endMs, snapPoints, thresholdMs)
// Returns: { deltaMs, snapped, snapPoint, edge }

describe("findMoveSnap", () => {
  const points: SnapPoint[] = [
    { ms: 5000, type: "item-start" },
    { ms: 10000, type: "item-end" },
  ];

  it("snaps item start edge to snap point", () => {
    // Item start at 4950, end at 6950 → start is 50ms from 5000
    const result = findMoveSnap(4950, 6950, points, 100);
    expect(result.snapped).toBe(true);
    expect(result.deltaMs).toBe(50); // needs +50 to reach 5000
    expect(result.edge).toBe("start");
  });

  it("snaps item end edge to snap point", () => {
    // Item start at 7960, end at 9960 → end is 40ms from 10000
    const result = findMoveSnap(7960, 9960, points, 100);
    expect(result.snapped).toBe(true);
    expect(result.deltaMs).toBe(40); // needs +40 to reach end=10000
    expect(result.edge).toBe("end");
  });

  it("prefers closer snap of start vs end", () => {
    // Start at 5010 (10 from 5000), end at 7010 (2990 from 10000)
    const result = findMoveSnap(5010, 7010, points, 100);
    expect(result.snapped).toBe(true);
    expect(result.deltaMs).toBe(-10); // start needs -10 to reach 5000
    expect(result.edge).toBe("start");
  });

  it("returns unsnapped when nothing near", () => {
    const result = findMoveSnap(7000, 9000, points, 50);
    expect(result.snapped).toBe(false);
    expect(result.deltaMs).toBe(0);
    expect(result.edge).toBeNull();
  });

  it("handles empty snap points", () => {
    const result = findMoveSnap(1000, 3000, [], 100);
    expect(result.snapped).toBe(false);
    expect(result.deltaMs).toBe(0);
  });

  it("handles both edges snapping — picks closest", () => {
    const tightPoints: SnapPoint[] = [
      { ms: 1000, type: "item-start" },
      { ms: 4000, type: "item-end" },
    ];
    // Item: start=1020, end=4050 → start is 20 away, end is 50 away
    const result = findMoveSnap(1020, 4050, tightPoints, 100);
    expect(result.snapped).toBe(true);
    expect(result.edge).toBe("start"); // 20 < 50
    expect(result.deltaMs).toBe(-20);
  });
});
