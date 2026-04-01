"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileSelect, disabled }: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file && file.type === "video/mp4") {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
        dragOver
          ? "border-yellow-400 bg-yellow-50"
          : "border-gray-300 bg-white hover:border-gray-400"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <Upload className="mb-3 h-10 w-10 text-gray-400" />
      <p className="text-sm font-medium text-gray-700">
        Drag & drop your MP4 video here
      </p>
      <p className="mt-1 text-xs text-gray-400">Max 500MB, max 3 minutes</p>

      <label className="mt-4 cursor-pointer rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600">
        Browse files
        <input
          type="file"
          accept="video/mp4"
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
      </label>
    </div>
  );
}
