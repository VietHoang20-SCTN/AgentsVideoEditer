// ============================================
// Xiaohuang Editor - CapCut-style 4-zone Layout
// Top: Header bar
// Left: Asset panel (media, text, audio, effects)
// Center: Video preview
// Right: Properties inspector
// Bottom: Multi-track timeline
// ============================================

"use client";

import React, { type ReactNode } from "react";
import { usePanels, useEditorActions } from "@/hooks/use-editor-store";

interface EditorLayoutProps {
  header: ReactNode;
  leftPanel: ReactNode;
  preview: ReactNode;
  rightPanel: ReactNode;
  timeline: ReactNode;
}

export default function EditorLayout({
  header,
  leftPanel,
  preview,
  rightPanel,
  timeline,
}: EditorLayoutProps) {
  const panels = usePanels();
  const { setTimelineHeight } = useEditorActions();

  // Resize handle for timeline
  const handleTimelineResize = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = panels.timelineHeight;

      const onMouseMove = (ev: MouseEvent) => {
        const delta = startY - ev.clientY;
        setTimelineHeight(startHeight + delta);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [panels.timelineHeight, setTimelineHeight]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* ── Header ─────────────────────────────── */}
      <header className="shrink-0 z-50">{header}</header>

      {/* ── Main content area ──────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel */}
        {panels.leftVisible && (
          <aside
            className="shrink-0 border-r border-gray-800 overflow-hidden flex flex-col bg-gray-900"
            style={{ width: `${panels.leftWidth}px` }}
          >
            {leftPanel}
          </aside>
        )}

        {/* Center: Video Preview */}
        <main className="flex-1 min-w-0 flex items-center justify-center bg-gray-950 overflow-hidden">
          {preview}
        </main>

        {/* Right Panel */}
        {panels.rightVisible && (
          <aside
            className="shrink-0 border-l border-gray-800 overflow-hidden flex flex-col bg-gray-900"
            style={{ width: `${panels.rightWidth}px` }}
          >
            {rightPanel}
          </aside>
        )}
      </div>

      {/* ── Timeline resize handle ─────────────── */}
      <div
        className="shrink-0 h-1 bg-gray-800 hover:bg-blue-600 cursor-row-resize transition-colors"
        onMouseDown={handleTimelineResize}
      />

      {/* ── Bottom: Timeline ───────────────────── */}
      <div
        className="shrink-0 overflow-hidden flex flex-col bg-gray-900"
        style={{ height: `${panels.timelineHeight}px` }}
      >
        {timeline}
      </div>
    </div>
  );
}
