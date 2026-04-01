// ============================================
// Editor Header Bar
// Back button, project name, save, undo/redo
// ============================================

"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Undo2,
  Redo2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useEditorActions, useIsDirty, useIsSaving } from "@/hooks/use-editor-store";
import { usePanels } from "@/hooks/use-editor-store";

interface EditorHeaderProps {
  projectId: string;
  projectName: string;
  onSave: () => Promise<void>;
}

export default function EditorHeader({
  projectId,
  projectName,
  onSave,
}: EditorHeaderProps) {
  const isDirty = useIsDirty();
  const isSaving = useIsSaving();
  const panels = usePanels();
  const { undo, redo, toggleLeftPanel, toggleRightPanel, setSaving } = useEditorActions();

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }, [onSave, setSaving]);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-800">
      {/* Left: nav + project name */}
      <div className="flex items-center gap-2">
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm p-1 rounded hover:bg-gray-800"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="w-px h-5 bg-gray-700" />
        <h1 className="text-sm font-semibold text-white truncate max-w-[240px]">
          {projectName}
        </h1>
      </div>

      {/* Center: undo/redo + edit tools */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Right: panels + save */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleLeftPanel}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          title="Toggle left panel"
        >
          {panels.leftVisible ? (
            <PanelLeftClose size={16} />
          ) : (
            <PanelLeftOpen size={16} />
          )}
        </button>
        <button
          onClick={toggleRightPanel}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          title="Toggle right panel"
        >
          {panels.rightVisible ? (
            <PanelRightClose size={16} />
          ) : (
            <PanelRightOpen size={16} />
          )}
        </button>

        <div className="w-px h-5 bg-gray-700 mx-1" />

        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            !isDirty || isSaving
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} />
              Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}
