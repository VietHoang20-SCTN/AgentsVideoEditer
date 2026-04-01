"use client";

import Link from "next/link";
import { FolderOpen, Clock, FileVideo } from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  UPLOADED: "bg-blue-100 text-blue-700",
  ANALYZING: "bg-yellow-100 text-yellow-700",
  ANALYZED: "bg-green-100 text-green-700",
  PLANNING: "bg-purple-100 text-purple-700",
  PLANNED: "bg-indigo-100 text-indigo-700",
  RENDERING: "bg-orange-100 text-orange-700",
  RENDERED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
};

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  createdAt: string;
  mediaCount: number;
}

export function ProjectCard({ id, name, description, status, createdAt, mediaCount }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-yellow-500" />
          <h3 className="font-medium text-gray-900">{name}</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status] || statusColors.DRAFT}`}>
          {status}
        </span>
      </div>

      {description && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{description}</p>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(createdAt).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1">
          <FileVideo className="h-3 w-3" />
          {mediaCount} files
        </span>
      </div>
    </Link>
  );
}
