// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock the Zustand store hooks before importing the component
const mockSelectItem = vi.fn();
const mockClearSelection = vi.fn();

vi.mock("@/hooks/use-editor-store", () => ({
  useSelection: () => ({ itemIds: [] as string[] }),
  useEditorActions: () => ({
    selectItem: mockSelectItem,
    clearSelection: mockClearSelection,
  }),
}));

import TimelineItem from "@/components/editor/timeline/timeline-item";
import type { TrackItem } from "@/types/editor";

// ── Test data ────────────────────────────────────────

function makeVideoItem(overrides: Partial<TrackItem> = {}): TrackItem {
  return {
    id: "item-1",
    name: "My Video Clip",
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

function makeAudioItem(): TrackItem {
  return {
    id: "audio-1",
    name: "Music Track",
    type: "audio-clip",
    trackId: "track-2",
    startMs: 0,
    endMs: 10000,
    layer: 0,
    locked: false,
    visible: true,
    properties: {
      sourceUrl: "music.mp3",
      thumbnailUrl: "",
      originalDurationMs: 30000,
      volume: 0.8,
      speed: 1,
      fadeInMs: 0,
      fadeOutMs: 0,
      keyframes: [],
    },
  } as TrackItem;
}

function makeTextItem(): TrackItem {
  return {
    id: "text-1",
    name: "Subtitle",
    type: "text-overlay",
    trackId: "track-3",
    startMs: 2000,
    endMs: 6000,
    layer: 0,
    locked: false,
    visible: true,
    properties: {
      content: "Hello World",
      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: 400,
      color: "#ffffff",
      backgroundColor: "#00000000",
      textAlign: "center",
      bold: false,
      italic: false,
      underline: false,
      letterSpacing: 0,
      lineHeight: 1.2,
      strokeColor: "#000000",
      strokeWidth: 0,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      posX: 0,
      posY: 0,
      width: 400,
      height: 100,
      rotation: 0,
      animation: "none",
    },
  } as TrackItem;
}

const defaultProps = {
  zoom: 100,
  trackHeight: 48,
  onDragStart: vi.fn(),
  onTrimStart: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Rendering ────────────────────────────────────────

describe("TimelineItem - rendering", () => {
  it("renders with item name", () => {
    render(<TimelineItem item={makeVideoItem()} {...defaultProps} />);
    expect(screen.getByText("My Video Clip")).toBeInTheDocument();
  });

  it("sets correct position and width from startMs/endMs", () => {
    const item = makeVideoItem({ startMs: 1000, endMs: 5000 });
    const { container } = render(<TimelineItem item={item} {...defaultProps} />);
    const el = container.firstChild as HTMLElement;
    // At zoom=100: left = 1000/1000*100 = 100px, width = 4000/1000*100 = 400px
    expect(el.style.left).toBe("100px");
    expect(el.style.width).toBe("400px");
  });

  it("renders different item types", () => {
    const { rerender } = render(<TimelineItem item={makeVideoItem()} {...defaultProps} />);
    expect(screen.getByText("My Video Clip")).toBeInTheDocument();

    rerender(<TimelineItem item={makeAudioItem()} {...defaultProps} />);
    expect(screen.getByText("Music Track")).toBeInTheDocument();

    rerender(<TimelineItem item={makeTextItem()} {...defaultProps} />);
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
  });

  it("has data-item-id attribute", () => {
    const { container } = render(<TimelineItem item={makeVideoItem()} {...defaultProps} />);
    expect(container.firstChild).toHaveAttribute("data-item-id", "item-1");
  });

  it("has aria-label with item info", () => {
    const { container } = render(<TimelineItem item={makeVideoItem()} {...defaultProps} />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("aria-label")).toContain("video-clip");
    expect(el.getAttribute("aria-label")).toContain("My Video Clip");
  });
});

// ── Locked state ─────────────────────────────────────

describe("TimelineItem - locked state", () => {
  it("shows lock indicator when locked", () => {
    const item = makeVideoItem({ locked: true });
    const { container } = render(<TimelineItem item={item} {...defaultProps} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("cursor-not-allowed");
    expect(el.getAttribute("aria-label")).toContain("locked");
  });

  it("shows grab cursor when unlocked", () => {
    const item = makeVideoItem({ locked: false });
    const { container } = render(<TimelineItem item={item} {...defaultProps} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("cursor-grab");
  });

  it("has tabIndex -1 when locked", () => {
    const item = makeVideoItem({ locked: true });
    const { container } = render(<TimelineItem item={item} {...defaultProps} />);
    expect(container.firstChild).toHaveAttribute("tabindex", "-1");
  });

  it("has tabIndex 0 when unlocked", () => {
    const item = makeVideoItem({ locked: false });
    const { container } = render(<TimelineItem item={item} {...defaultProps} />);
    expect(container.firstChild).toHaveAttribute("tabindex", "0");
  });
});

// ── Preview overrides ────────────────────────────────

describe("TimelineItem - preview overrides", () => {
  it("uses previewStartMs for position during drag", () => {
    const item = makeVideoItem({ startMs: 1000, endMs: 5000 });
    const { container } = render(
      <TimelineItem item={item} {...defaultProps} previewStartMs={2000} isDragging />
    );
    const el = container.firstChild as HTMLElement;
    // At zoom=100: left = 2000/1000*100 = 200px
    expect(el.style.left).toBe("200px");
  });

  it("applies drag styling when isDragging", () => {
    const item = makeVideoItem();
    const { container } = render(
      <TimelineItem item={item} {...defaultProps} isDragging />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("ring-yellow-400");
  });

  it("applies trim styling when isTrimming", () => {
    const item = makeVideoItem();
    const { container } = render(
      <TimelineItem item={item} {...defaultProps} isTrimming />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("ring-green-400");
  });
});

// ── Trim handles ─────────────────────────────────────

describe("TimelineItem - trim handles", () => {
  it("renders left and right trim handles", () => {
    const { container } = render(<TimelineItem item={makeVideoItem()} {...defaultProps} />);
    const handles = container.querySelectorAll("[data-trim-handle]");
    expect(handles).toHaveLength(2);
    expect(handles[0]).toHaveAttribute("data-trim-handle", "start");
    expect(handles[1]).toHaveAttribute("data-trim-handle", "end");
  });

  it("trim handles have cursor-col-resize", () => {
    const { container } = render(<TimelineItem item={makeVideoItem()} {...defaultProps} />);
    const handles = container.querySelectorAll("[data-trim-handle]");
    handles.forEach((h) => {
      expect(h.className).toContain("cursor-col-resize");
    });
  });
});

// ── Click interaction ────────────────────────────────

describe("TimelineItem - click interaction", () => {
  it("calls selectItem on click", () => {
    const item = makeVideoItem({ locked: false });
    const { container } = render(<TimelineItem item={item} {...defaultProps} />);
    fireEvent.click(container.firstChild as HTMLElement);
    expect(mockSelectItem).toHaveBeenCalledWith("item-1", false);
  });

  it("passes addToSelection=true on shift+click", () => {
    const item = makeVideoItem({ locked: false });
    const { container } = render(<TimelineItem item={item} {...defaultProps} />);
    fireEvent.click(container.firstChild as HTMLElement, { shiftKey: true });
    expect(mockSelectItem).toHaveBeenCalledWith("item-1", true);
  });

  it("does not call selectItem when locked", () => {
    const item = makeVideoItem({ locked: true });
    const { container } = render(<TimelineItem item={item} {...defaultProps} />);
    fireEvent.click(container.firstChild as HTMLElement);
    expect(mockSelectItem).not.toHaveBeenCalled();
  });
});
