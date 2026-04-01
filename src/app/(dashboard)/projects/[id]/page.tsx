"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Loader2, FileVideo, BarChart3, Wand2, Clapperboard, Film } from "lucide-react";

interface MediaAsset {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  sizeBytes: string;
  durationMs: number | null;
  width: number | null;
  height: number | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  mediaAssets: MediaAsset[];
}

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

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProject(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Project not found</p>
        <button onClick={() => router.push("/dashboard")} className="mt-2 text-yellow-600 hover:underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <Link href="/dashboard" className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-gray-500">{project.description}</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[project.status] || statusColors.DRAFT}`}>
          {project.status}
        </span>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Media Assets</h2>
          <div className="flex gap-2">
            {project.status === "DRAFT" && (
              <Link
                href={`/projects/${project.id}/upload`}
                className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
              >
                <Upload className="h-4 w-4" />
                Upload Video
              </Link>
            )}
            {(project.status === "UPLOADED" || project.status === "FAILED") && (
              <Link
                href={`/projects/${project.id}/analysis`}
                className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
              >
                <BarChart3 className="h-4 w-4" />
                Analyze
              </Link>
            )}
            {(project.status === "ANALYZED" || project.status === "ANALYZING" || project.status === "PLANNING" || project.status === "PLANNED") && (
              <Link
                href={`/projects/${project.id}/analysis`}
                className="flex items-center gap-2 rounded-md border border-yellow-500 px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-50"
              >
                <BarChart3 className="h-4 w-4" />
                View Analysis
              </Link>
            )}
            {(project.status === "ANALYZED" || project.status === "PLANNED" || project.status === "RENDERED") && (
              <Link
                href={`/projects/${project.id}/editor`}
                className="flex items-center gap-2 rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
              >
                <Film className="h-4 w-4" />
                Open Editor
              </Link>
            )}
            {(project.status === "ANALYZED" || project.status === "PLANNED" || project.status === "PLANNING") && (
              <Link
                href={`/projects/${project.id}/plan`}
                className="flex items-center gap-2 rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
              >
                <Wand2 className="h-4 w-4" />
                {project.status === "PLANNED" ? "View Plan" : "Generate Plan"}
              </Link>
            )}
            {project.status === "PLANNED" && (
              <Link
                href={`/projects/${project.id}/render`}
                className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                <Clapperboard className="h-4 w-4" />
                Render
              </Link>
            )}
          </div>
        </div>

        {project.mediaAssets.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No media files uploaded yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {project.mediaAssets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 rounded-md border p-3">
                <FileVideo className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{asset.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {(Number(asset.sizeBytes) / 1024 / 1024).toFixed(1)} MB
                    {asset.width && asset.height && ` - ${asset.width}x${asset.height}`}
                    {asset.durationMs && ` - ${(asset.durationMs / 1000).toFixed(1)}s`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
