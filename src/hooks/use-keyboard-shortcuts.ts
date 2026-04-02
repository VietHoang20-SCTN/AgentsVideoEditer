// ============================================
// useKeyboardShortcuts – Global editor hotkeys
// Attach once at the editor shell level
// ============================================

"use client";

import { useEffect, useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Shortcut map — all keyboard shortcuts for the editor.
 *
 * Playback:
 *   Space         → Play / Pause
 *   Home          → Seek to start
 *   End           → Seek to end
 *   ← / →         → Seek backward / forward 1s
 *   Shift+← / →   → Seek backward / forward 5s
 *   [ / ]          → Previous / Next item edge
 *
 * Selection:
 *   Ctrl+A         → Select all items
 *   Escape         → Clear selection
 *   Delete / Backspace → Delete selected items
 *
 * Clipboard:
 *   Ctrl+C         → Copy selection
 *   Ctrl+X         → Cut selection
 *   Ctrl+V         → Paste
 *   Ctrl+D         → Duplicate selection
 *
 * Edit:
 *   S              → Split selected item(s) at playhead
 *   Ctrl+Z         → Undo
 *   Ctrl+Shift+Z / Ctrl+Y → Redo
 *
 * Zoom:
 *   = / +          → Zoom in
 *   - / _          → Zoom out
 *   Ctrl+0         → Zoom to fit
 *
 * Snap:
 *   N              → Toggle snapping
 */
export function useKeyboardShortcuts() {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts if typing in an input/textarea
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((e.target as HTMLElement).isContentEditable) return;

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key;
    const store = useEditorStore.getState();

    // ── Playback ────────────────────────────

    if (key === " " || key === "Spacebar") {
      e.preventDefault();
      store.togglePlayback();
      return;
    }

    if (key === "Home") {
      e.preventDefault();
      store.seekToStart();
      return;
    }

    if (key === "End") {
      e.preventDefault();
      store.seekToEnd();
      return;
    }

    if (key === "ArrowLeft") {
      e.preventDefault();
      store.seekBackward(shift ? 5000 : 1000);
      return;
    }

    if (key === "ArrowRight") {
      e.preventDefault();
      store.seekForward(shift ? 5000 : 1000);
      return;
    }

    if (key === "[") {
      e.preventDefault();
      store.seekToPrevItem();
      return;
    }

    if (key === "]") {
      e.preventDefault();
      store.seekToNextItem();
      return;
    }

    // ── Selection ───────────────────────────

    if (ctrl && key === "a") {
      e.preventDefault();
      store.selectAll();
      return;
    }

    if (key === "Escape") {
      e.preventDefault();
      store.clearSelection();
      return;
    }

    if (key === "Delete" || key === "Backspace") {
      e.preventDefault();
      const { itemIds } = store.selection;
      if (itemIds.length > 0) {
        store.removeTrackItems(itemIds);
        store.clearSelection();
      }
      return;
    }

    // ── Clipboard ───────────────────────────

    if (ctrl && key === "c") {
      e.preventDefault();
      store.copySelection();
      return;
    }

    if (ctrl && key === "x") {
      e.preventDefault();
      store.cutSelection();
      return;
    }

    if (ctrl && key === "v") {
      e.preventDefault();
      store.paste();
      return;
    }

    if (ctrl && key === "d") {
      e.preventDefault();
      store.duplicateSelection();
      return;
    }

    // ── Edit ────────────────────────────────

    if (key === "s" && !ctrl) {
      e.preventDefault();
      // Split all selected items at playhead
      const { itemIds } = store.selection;
      const { playheadMs } = store;
      for (const id of itemIds) {
        const item = store.trackItems.find((i) => i.id === id);
        if (item && playheadMs > item.startMs && playheadMs < item.endMs) {
          store.splitTrackItem(id, playheadMs);
        }
      }
      return;
    }

    // Undo
    if (ctrl && !shift && key === "z") {
      e.preventDefault();
      store.undo();
      return;
    }

    // Redo (Ctrl+Shift+Z or Ctrl+Y)
    if ((ctrl && shift && key === "Z") || (ctrl && key === "y")) {
      e.preventDefault();
      store.redo();
      return;
    }

    // ── Zoom ────────────────────────────────

    if (!ctrl && (key === "=" || key === "+")) {
      e.preventDefault();
      store.zoomIn();
      return;
    }

    if (!ctrl && (key === "-" || key === "_")) {
      e.preventDefault();
      store.zoomOut();
      return;
    }

    if (ctrl && key === "0") {
      e.preventDefault();
      store.zoomToFit();
      return;
    }

    // ── Snap Toggle ─────────────────────────

    if (key === "n" && !ctrl) {
      e.preventDefault();
      store.toggleSnap();
      return;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
