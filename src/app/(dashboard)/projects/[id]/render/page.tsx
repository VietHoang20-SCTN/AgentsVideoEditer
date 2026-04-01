"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Play,
  Clock,
  XCircle,
  Download,
  CheckCircle,
  Film,
} from "lucide-react";

interface RenderOutput {
  id: string;
  fileName: string;
  storageKey: string;
  sizeBytes: string;
  width: number | null;
  height: number | null;
}

interface RenderPayload {
  projectId: string;
  renderStatus: "not_started" | "queued" | "running" | "completed" | "failed";
  job: {
    id: string;
    status: string;
    progress: number;
    errorMessage: string | null;
  } | null;
  render: {
    id: string;
    status: string;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    output: RenderOutput | null;
  } | null;
}

export default function RenderPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [payload, setPayload] = useState<RenderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const fetchRender = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/render`);
      const json = await res.json();
      if (json.success) {
        setPayload(json.data as RenderPayload);
        setError(null);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to fetch render data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchRender();
  }, [fetchRender]);

  // Poll while queued/running
  const status = payload?.renderStatus;
  useEffect(() => {
    if (status !== "queued" && status !== "running") return;
    const interval = setInterval(fetchRender, 3000);
    return () => clearInterval(interval);
  }, [status, fetchRender]);

  const startRender = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/render`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        await fetchRender();
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to start render");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const renderStatus = payload?.renderStatus ?? "not_started";
  const render = payload?.render;
  const job = payload?.job;
  const output = render?.output;
  const canStart = renderStatus === "not_started" || renderStatus === "failed" || renderStatus === "completed";

  return (
    <div>
      <Link
        href={`/projects/${projectId}`}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Project
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Render</h1>
          <StatusBadge status={renderStatus} />
        </div>
        {canStart && (
          <button
            onClick={startRender}
            disabled={starting}
            className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {renderStatus === "completed" ? "Re-render" : "Start Render"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {renderStatus === "queued" && (
        <div className="mt-6 flex flex-col items-center gap-3 py-12">
          <Clock className="h-10 w-10 text-blue-500" />
          <p className="text-sm text-gray-500">Render job is queued...</p>
        </div>
      )}

      {renderStatus === "running" && (
        <div className="mt-6">
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <p className="text-sm text-gray-500">Rendering video... This may take several minutes.</p>
          </div>
          {job && (
            <div className="rounded-lg border bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{job.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {renderStatus === "failed" && (render?.errorMessage || job?.errorMessage) && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">Render failed</p>
              <p className="mt-1 text-xs text-red-600">
                {render?.errorMessage || job?.errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {renderStatus === "not_started" && (
        <div className="mt-6 rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">
            Plan is ready. Click &quot;Start Render&quot; to produce the edited video.
          </p>
        </div>
      )}

      {renderStatus === "completed" && output && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Render Complete</h3>
                <p className="text-sm text-gray-500">
                  {render?.startedAt && render?.finishedAt
                    ? `Rendered in ${Math.round(
                        (new Date(render.finishedAt).getTime() -
                          new Date(render.startedAt).getTime()) /
                          1000
                      )}s`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Film className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">{output.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {(Number(output.sizeBytes) / 1024 / 1024).toFixed(1)} MB
                    {output.width && output.height && ` - ${output.width}x${output.height}`}
                  </p>
                </div>
              </div>
              <a
                href={`/api/projects/${projectId}/render/download`}
                className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    not_started: { color: "bg-gray-100 text-gray-600", label: "Ready" },
    queued: { color: "bg-blue-100 text-blue-700", label: "Queued" },
    running: { color: "bg-orange-100 text-orange-700", label: "Running" },
    completed: { color: "bg-green-100 text-green-700", label: "Completed" },
    failed: { color: "bg-red-100 text-red-700", label: "Failed" },
  };
  const c = config[status] ?? config.not_started;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}
