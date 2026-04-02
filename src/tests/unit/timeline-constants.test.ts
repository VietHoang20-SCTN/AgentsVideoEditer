import { describe, it, expect } from "vitest";
import {
  msToPixel,
  pixelToMs,
  formatRulerTime,
  getRulerInterval,
  TRACK_HEADER_WIDTH,
  RULER_HEIGHT,
  MIN_ITEM_LABEL_WIDTH,
  TRACK_TYPE_COLORS,
  TRACK_TYPE_ICONS,
} from "@/components/editor/timeline/timeline-constants";

// ── msToPixel ────────────────────────────────────────

describe("msToPixel", () => {
  it("converts 0ms to 0px at any zoom", () => {
    expect(msToPixel(0, 100)).toBe(0);
    expect(msToPixel(0, 50)).toBe(0);
    expect(msToPixel(0, 200)).toBe(0);
  });

  it("converts 1000ms to zoom px (zoom = pixels per second)", () => {
    expect(msToPixel(1000, 100)).toBe(100);
    expect(msToPixel(1000, 50)).toBe(50);
    expect(msToPixel(1000, 200)).toBe(200);
  });

  it("handles fractional ms", () => {
    expect(msToPixel(500, 100)).toBe(50);
    expect(msToPixel(250, 200)).toBe(50);
  });

  it("handles very large values", () => {
    // 1 hour at zoom 100
    expect(msToPixel(3_600_000, 100)).toBe(360_000);
  });

  it("handles very small zoom", () => {
    expect(msToPixel(10_000, 5)).toBe(50);
  });

  it("handles very large zoom", () => {
    expect(msToPixel(1000, 500)).toBe(500);
  });
});

// ── pixelToMs ────────────────────────────────────────

describe("pixelToMs", () => {
  it("converts 0px to 0ms", () => {
    expect(pixelToMs(0, 100)).toBe(0);
  });

  it("is the inverse of msToPixel", () => {
    const testCases = [
      { ms: 1000, zoom: 100 },
      { ms: 5000, zoom: 50 },
      { ms: 250, zoom: 200 },
      { ms: 60_000, zoom: 10 },
    ];
    for (const { ms, zoom } of testCases) {
      const px = msToPixel(ms, zoom);
      expect(pixelToMs(px, zoom)).toBeCloseTo(ms, 5);
    }
  });

  it("converts correctly at zoom 100", () => {
    expect(pixelToMs(100, 100)).toBe(1000);
    expect(pixelToMs(50, 100)).toBe(500);
  });

  it("converts correctly at different zoom levels", () => {
    expect(pixelToMs(100, 50)).toBe(2000);
    expect(pixelToMs(100, 200)).toBe(500);
  });
});

// ── formatRulerTime ──────────────────────────────────

describe("formatRulerTime", () => {
  it("formats 0ms as '0s'", () => {
    expect(formatRulerTime(0)).toBe("0s");
  });

  it("formats seconds under 60 with 's' suffix", () => {
    expect(formatRulerTime(5000)).toBe("5s");
    expect(formatRulerTime(30000)).toBe("30s");
    expect(formatRulerTime(59000)).toBe("59s");
  });

  it("formats 60s as '1:00'", () => {
    expect(formatRulerTime(60000)).toBe("1:00");
  });

  it("formats minutes with zero-padded seconds", () => {
    expect(formatRulerTime(65000)).toBe("1:05");
    expect(formatRulerTime(125000)).toBe("2:05");
    expect(formatRulerTime(600000)).toBe("10:00");
  });

  it("truncates fractional ms (floors to whole second)", () => {
    expect(formatRulerTime(1500)).toBe("1s");
    expect(formatRulerTime(999)).toBe("0s");
  });
});

// ── getRulerInterval ─────────────────────────────────

describe("getRulerInterval", () => {
  it("returns 1s major / 250ms minor at high zoom (200+)", () => {
    const interval = getRulerInterval(200);
    expect(interval.majorMs).toBe(1000);
    expect(interval.minorMs).toBe(250);
  });

  it("returns 2s major / 500ms minor at zoom 100-199", () => {
    const interval = getRulerInterval(100);
    expect(interval.majorMs).toBe(2000);
    expect(interval.minorMs).toBe(500);

    const interval150 = getRulerInterval(150);
    expect(interval150.majorMs).toBe(2000);
  });

  it("returns 5s major / 1s minor at zoom 50-99", () => {
    const interval = getRulerInterval(50);
    expect(interval.majorMs).toBe(5000);
    expect(interval.minorMs).toBe(1000);
  });

  it("returns 10s major / 2s minor at zoom 25-49", () => {
    const interval = getRulerInterval(25);
    expect(interval.majorMs).toBe(10000);
    expect(interval.minorMs).toBe(2000);
  });

  it("returns 30s major / 5s minor at zoom 10-24", () => {
    const interval = getRulerInterval(10);
    expect(interval.majorMs).toBe(30000);
    expect(interval.minorMs).toBe(5000);
  });

  it("returns 60s major / 10s minor at very low zoom (<10)", () => {
    const interval = getRulerInterval(5);
    expect(interval.majorMs).toBe(60000);
    expect(interval.minorMs).toBe(10000);
  });

  it("minor divides evenly into major", () => {
    const zoomLevels = [5, 10, 25, 50, 100, 200, 500];
    for (const zoom of zoomLevels) {
      const { majorMs, minorMs } = getRulerInterval(zoom);
      expect(majorMs % minorMs).toBe(0);
    }
  });
});

// ── Constants existence ──────────────────────────────

describe("constants", () => {
  it("TRACK_HEADER_WIDTH is a positive number", () => {
    expect(TRACK_HEADER_WIDTH).toBeGreaterThan(0);
    expect(typeof TRACK_HEADER_WIDTH).toBe("number");
  });

  it("RULER_HEIGHT is a positive number", () => {
    expect(RULER_HEIGHT).toBeGreaterThan(0);
  });

  it("MIN_ITEM_LABEL_WIDTH is a positive number", () => {
    expect(MIN_ITEM_LABEL_WIDTH).toBeGreaterThan(0);
  });

  it("TRACK_TYPE_COLORS has entries for all item types", () => {
    const types = ["video-clip", "audio-clip", "text-overlay", "sticker", "effect", "transition", "filter"];
    for (const type of types) {
      expect(TRACK_TYPE_COLORS[type]).toBeDefined();
      expect(TRACK_TYPE_COLORS[type].bg).toBeTruthy();
      expect(TRACK_TYPE_COLORS[type].border).toBeTruthy();
      expect(TRACK_TYPE_COLORS[type].text).toBeTruthy();
    }
  });

  it("TRACK_TYPE_ICONS has entries for track types", () => {
    const types = ["video", "audio", "text", "sticker", "effect", "filter"];
    for (const type of types) {
      expect(TRACK_TYPE_ICONS[type]).toBeTruthy();
    }
  });
});
