"use client";

import { Loader2 } from "lucide-react";

interface UploadProgressProps {
  progress: number;
  fileName: string;
}

export function UploadProgress({ progress, fileName }: UploadProgressProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
        <div className="flex-1">
          <p className="text-sm font-medium">{fileName}</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-yellow-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">{progress}% uploaded</p>
        </div>
      </div>
    </div>
  );
}
