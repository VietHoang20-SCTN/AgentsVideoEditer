// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock the Zustand store hooks
const mockToggleTrackVisibility = vi.fn();
const mockToggleTrackLock = vi.fn();
const mockToggleTrackMute = vi.fn();
const mockSelectTrack = vi.fn();
let mockSelectedTrackId: string | null = null;

vi.mock("@/hooks/use-editor-store", () => ({
  useEditorActions: () => ({
    toggleTrackVisibility: mockToggleTrackVisibility,
    toggleTrackLock: mockToggleTrackLock,
    toggleTrackMute: mockToggleTrackMute,
    selectTrack: mockSelectTrack,
  }),
  useSelection: () => ({
    trackId: mockSelectedTrackId,
  }),
}));

import TimelineTrackHeader from "@/components/editor/timeline/timeline-track-header";
import type { Track } from "@/types/editor";

// ── Test data ────────────────────────────────────────

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "track-1",
    name: "Video Track",
    type: "video",
    order: 0,
    height: 48,
    visible: true,
    locked: false,
    muted: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectedTrackId = null;
});

// ── Rendering ────────────────────────────────────────

describe("TimelineTrackHeader - rendering", () => {
  it("renders track name", () => {
    render(<TimelineTrackHeader track={makeTrack({ name: "My Track" })} />);
    expect(screen.getByText("My Track")).toBeInTheDocument();
  });

  it("renders without error for different track types", () => {
    const types = ["video", "audio", "text", "sticker", "effect", "filter"] as const;
    for (const type of types) {
      const { unmount } = render(
        <TimelineTrackHeader track={makeTrack({ type, name: `${type} track` })} />
      );
      expect(screen.getByText(`${type} track`)).toBeInTheDocument();
      unmount();
    }
  });

  it("has aria-label with track info", () => {
    const { container } = render(
      <TimelineTrackHeader track={makeTrack({ name: "Test Track", type: "video" })} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("aria-label")).toContain("Test Track");
    expect(el.getAttribute("aria-label")).toContain("video");
  });

  it("shows locked status in aria-label when locked", () => {
    const { container } = render(
      <TimelineTrackHeader track={makeTrack({ locked: true })} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("aria-label")).toContain("locked");
  });

  it("shows muted status in aria-label when muted", () => {
    const { container } = render(
      <TimelineTrackHeader track={makeTrack({ muted: true })} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("aria-label")).toContain("muted");
  });

  it("shows hidden status in aria-label when not visible", () => {
    const { container } = render(
      <TimelineTrackHeader track={makeTrack({ visible: false })} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("aria-label")).toContain("hidden");
  });
});

// ── Selection ────────────────────────────────────────

describe("TimelineTrackHeader - selection", () => {
  it("calls selectTrack on click", () => {
    const { container } = render(<TimelineTrackHeader track={makeTrack()} />);
    fireEvent.click(container.firstChild as HTMLElement);
    expect(mockSelectTrack).toHaveBeenCalledWith("track-1");
  });

  it("applies selected styling when track is selected", () => {
    mockSelectedTrackId = "track-1";
    const { container } = render(<TimelineTrackHeader track={makeTrack()} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-gray-700");
  });

  it("applies unselected styling when track is not selected", () => {
    mockSelectedTrackId = "other-track";
    const { container } = render(<TimelineTrackHeader track={makeTrack()} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-gray-900");
  });

  it("has aria-selected attribute", () => {
    mockSelectedTrackId = "track-1";
    const { container } = render(<TimelineTrackHeader track={makeTrack()} />);
    expect(container.firstChild).toHaveAttribute("aria-selected", "true");
  });
});

// ── Toggle controls ──────────────────────────────────

describe("TimelineTrackHeader - toggle controls", () => {
  it("has visibility toggle button with title 'Hide' when visible", () => {
    render(<TimelineTrackHeader track={makeTrack({ visible: true })} />);
    expect(screen.getByTitle("Hide")).toBeInTheDocument();
  });

  it("has visibility toggle button with title 'Show' when hidden", () => {
    render(<TimelineTrackHeader track={makeTrack({ visible: false })} />);
    expect(screen.getByTitle("Show")).toBeInTheDocument();
  });

  it("calls toggleTrackVisibility on visibility button click", () => {
    render(<TimelineTrackHeader track={makeTrack()} />);
    fireEvent.click(screen.getByTitle("Hide"));
    expect(mockToggleTrackVisibility).toHaveBeenCalledWith("track-1");
  });

  it("has lock toggle button with title 'Lock' when unlocked", () => {
    render(<TimelineTrackHeader track={makeTrack({ locked: false })} />);
    expect(screen.getByTitle("Lock")).toBeInTheDocument();
  });

  it("has lock toggle button with title 'Unlock' when locked", () => {
    render(<TimelineTrackHeader track={makeTrack({ locked: true })} />);
    expect(screen.getByTitle("Unlock")).toBeInTheDocument();
  });

  it("calls toggleTrackLock on lock button click", () => {
    render(<TimelineTrackHeader track={makeTrack()} />);
    fireEvent.click(screen.getByTitle("Lock"));
    expect(mockToggleTrackLock).toHaveBeenCalledWith("track-1");
  });

  it("shows mute toggle for video and audio tracks", () => {
    const { rerender } = render(
      <TimelineTrackHeader track={makeTrack({ type: "video" })} />
    );
    expect(screen.getByTitle("Mute")).toBeInTheDocument();

    rerender(<TimelineTrackHeader track={makeTrack({ type: "audio" })} />);
    expect(screen.getByTitle("Mute")).toBeInTheDocument();
  });

  it("does not show mute toggle for text tracks", () => {
    render(<TimelineTrackHeader track={makeTrack({ type: "text" })} />);
    expect(screen.queryByTitle("Mute")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Unmute")).not.toBeInTheDocument();
  });

  it("calls toggleTrackMute on mute button click", () => {
    render(<TimelineTrackHeader track={makeTrack({ type: "audio" })} />);
    fireEvent.click(screen.getByTitle("Mute"));
    expect(mockToggleTrackMute).toHaveBeenCalledWith("track-1");
  });

  it("shows 'Unmute' when muted", () => {
    render(<TimelineTrackHeader track={makeTrack({ type: "audio", muted: true })} />);
    expect(screen.getByTitle("Unmute")).toBeInTheDocument();
  });

  it("control buttons have aria-label matching title", () => {
    render(<TimelineTrackHeader track={makeTrack({ type: "audio" })} />);
    // Check specific buttons by title
    expect(screen.getByTitle("Hide")).toHaveAttribute("aria-label", "Hide");
    expect(screen.getByTitle("Lock")).toHaveAttribute("aria-label", "Lock");
    expect(screen.getByTitle("Mute")).toHaveAttribute("aria-label", "Mute");
  });

  it("control buttons have aria-pressed attributes", () => {
    render(<TimelineTrackHeader track={makeTrack({ type: "audio", visible: true, locked: false, muted: false })} />);
    expect(screen.getByTitle("Hide")).toHaveAttribute("aria-pressed");
    expect(screen.getByTitle("Lock")).toHaveAttribute("aria-pressed");
    expect(screen.getByTitle("Mute")).toHaveAttribute("aria-pressed");
  });

  it("button clicks do not propagate to parent selectTrack", () => {
    render(<TimelineTrackHeader track={makeTrack()} />);
    mockSelectTrack.mockClear();
    fireEvent.click(screen.getByTitle("Lock"));
    // selectTrack should NOT be called when clicking control buttons
    expect(mockSelectTrack).not.toHaveBeenCalled();
  });
});
