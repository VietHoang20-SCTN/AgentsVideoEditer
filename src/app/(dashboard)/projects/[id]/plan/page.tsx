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
  Scissors,
  Type,
  Hash,
  MessageSquare,
  Zap,
} from "lucide-react";

interface SegmentPlan {
  startMs: number;
  endMs: number;
  action: string;
  reason: string;
  speedFactor?: number;
}

interface EditPlanJson {
  hookSuggestion: string;
  segments: SegmentPlan[];
  cutRecommendations: string[];
  subtitleStrategy: {
    enabled: boolean;
    style: string;
    fontSizeScale: number;
    language?: string;
  };
  titleOptions: string[];
  descriptionOptions: string[];
  hashtagOptions: string[];
  ctaSuggestion: string;
  transformationNotes: string[];
  outputFormat: {
    width: number;
    height: number;
    fps: number;
    durationEstimateMs: number;
  };
}

interface PlanPayload {
  projectId: string;
  planStatus: "not_started" | "queued" | "running" | "completed" | "failed";
  job: {
    id: string;
    status: string;
    progress: number;
    errorMessage: string | null;
  } | null;
  plan: {
    id: string;
    modelName: string;
    promptVersion: string;
    planJson: EditPlanJson;
    scriptText: string | null;
    titleOptions: string[] | null;
    descriptionOptions: string[] | null;
    hashtagOptions: string[] | null;
    createdAt: string;
  } | null;
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function PlanPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [payload, setPayload] = useState<PlanPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`);
      const json = await res.json();
      if (json.success) {
        setPayload(json.data as PlanPayload);
        setError(null);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to fetch plan data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchPlan();
  }, [fetchPlan]);

  // Poll while queued/running
  const status = payload?.planStatus;
  useEffect(() => {
    if (status !== "queued" && status !== "running") return;
    const interval = setInterval(fetchPlan, 3000);
    return () => clearInterval(interval);
  }, [status, fetchPlan]);

  const startPlanning = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        await fetchPlan();
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to start planning");
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

  const planStatus = payload?.planStatus ?? "not_started";
  const plan = payload?.plan;
  const planJson = plan?.planJson;
  const canStart = planStatus === "not_started" || planStatus === "failed" || planStatus === "completed";

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
          <h1 className="text-2xl font-bold text-gray-900">Edit Plan</h1>
          <StatusBadge status={planStatus} />
        </div>
        {canStart && (
          <button
            onClick={startPlanning}
            disabled={starting}
            className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {planStatus === "completed" ? "Regenerate Plan" : "Generate Plan"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {planStatus === "queued" && (
        <div className="mt-6 flex flex-col items-center gap-3 py-12">
          <Clock className="h-10 w-10 text-blue-500" />
          <p className="text-sm text-gray-500">Planning job is queued...</p>
        </div>
      )}

      {planStatus === "running" && (
        <div className="mt-6 flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
          <p className="text-sm text-gray-500">Generating edit plan...</p>
        </div>
      )}

      {planStatus === "failed" && payload?.job?.errorMessage && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">Planning failed</p>
              <p className="mt-1 text-xs text-red-600">{payload.job.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {planStatus === "not_started" && (
        <div className="mt-6 rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">
            Analysis complete. Click &quot;Generate Plan&quot; to create an edit plan.
          </p>
        </div>
      )}

      {planJson && planStatus === "completed" && (
        <div className="mt-6 space-y-4">
          {/* Hook */}
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Zap className="h-4 w-4 text-yellow-500" />
              Hook Suggestion
            </div>
            <p className="mt-2 text-sm text-gray-600">{planJson.hookSuggestion}</p>
          </div>

          {/* Segments */}
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Scissors className="h-4 w-4 text-blue-500" />
              Segment Plan ({planJson.segments.length} segments)
            </div>
            <div className="mt-3 space-y-2">
              {planJson.segments.map((seg, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      seg.action === "keep"
                        ? "bg-green-100 text-green-700"
                        : seg.action === "cut"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {seg.action}
                  </span>
                  <div>
                    <span className="font-mono text-xs text-gray-400">
                      {formatMs(seg.startMs)} - {formatMs(seg.endMs)}
                    </span>
                    {seg.speedFactor && (
                      <span className="ml-2 text-xs text-gray-400">({seg.speedFactor}x)</span>
                    )}
                    <p className="mt-0.5 text-gray-600">{seg.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cut Recommendations */}
          {planJson.cutRecommendations.length > 0 && (
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm font-semibold text-gray-700">Cut Recommendations</p>
              <ul className="mt-2 space-y-1">
                {planJson.cutRecommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-gray-600">&bull; {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Title Options */}
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Type className="h-4 w-4 text-purple-500" />
              Title Options
            </div>
            <ul className="mt-2 space-y-1">
              {(plan?.titleOptions ?? planJson.titleOptions)?.map((t: string, i: number) => (
                <li key={i} className="text-sm text-gray-600">{i + 1}. {t}</li>
              ))}
            </ul>
          </div>

          {/* Hashtags */}
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Hash className="h-4 w-4 text-blue-500" />
              Hashtags
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(plan?.hashtagOptions ?? planJson.hashtagOptions)?.map((tag: string, i: number) => (
                <span key={i} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <MessageSquare className="h-4 w-4 text-green-500" />
              Call to Action
            </div>
            <p className="mt-2 text-sm text-gray-600">{planJson.ctaSuggestion}</p>
          </div>

          {/* Output Format */}
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm font-semibold text-gray-700">Output Format</p>
            <div className="mt-2 grid grid-cols-4 gap-3 text-sm text-gray-600">
              <div>
                <p className="text-xs text-gray-400">Resolution</p>
                <p>{planJson.outputFormat.width}x{planJson.outputFormat.height}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">FPS</p>
                <p>{planJson.outputFormat.fps}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Est. Duration</p>
                <p>{formatMs(planJson.outputFormat.durationEstimateMs)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Subtitles</p>
                <p>{planJson.subtitleStrategy.enabled ? planJson.subtitleStrategy.style : "Off"}</p>
              </div>
            </div>
          </div>

          {/* Transformation Notes */}
          {planJson.transformationNotes.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-800">Transformation Notes</p>
              <ul className="mt-2 space-y-1">
                {planJson.transformationNotes.map((note, i) => (
                  <li key={i} className="text-sm text-yellow-700">&bull; {note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta */}
          <p className="text-xs text-gray-400">
            Model: {plan?.modelName} | Prompt: {plan?.promptVersion} | Generated: {plan?.createdAt ? new Date(plan.createdAt).toLocaleString() : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    not_started: { color: "bg-gray-100 text-gray-600", label: "Ready" },
    queued: { color: "bg-blue-100 text-blue-700", label: "Queued" },
    running: { color: "bg-yellow-100 text-yellow-700", label: "Running" },
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
