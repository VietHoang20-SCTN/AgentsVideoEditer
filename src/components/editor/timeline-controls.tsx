"use client";

import { Scissors, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";

interface TimelineControlsProps {
  onSplit: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canSplit: boolean;
  canDelete: boolean;
  canUndo: boolean;
}

function ControlButton({
  onClick,
  disabled,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-800 text-gray-200 text-sm transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-gray-700 active:bg-gray-600"
      }`}
      title={label}
    >
      <Icon size={16} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function TimelineControls({
  onSplit,
  onDelete,
  onUndo,
  onZoomIn,
  onZoomOut,
  canSplit,
  canDelete,
  canUndo,
}: TimelineControlsProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-t border-gray-700">
      <ControlButton
        onClick={onSplit}
        disabled={!canSplit}
        icon={Scissors}
        label="Split"
      />
      <ControlButton
        onClick={onDelete}
        disabled={!canDelete}
        icon={Trash2}
        label="Delete"
      />
      <ControlButton
        onClick={onUndo}
        disabled={!canUndo}
        icon={Undo2}
        label="Undo"
      />

      <div className="w-px h-6 bg-gray-700 mx-1" />

      <ControlButton
        onClick={onZoomOut}
        disabled={false}
        icon={ZoomOut}
        label="Zoom Out"
      />
      <ControlButton
        onClick={onZoomIn}
        disabled={false}
        icon={ZoomIn}
        label="Zoom In"
      />
    </div>
  );
}
