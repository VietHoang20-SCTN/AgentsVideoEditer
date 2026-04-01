"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Play,
  FileText,
  Film,
  Eye,
  Volume2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

// --- Types ---

interface TranscriptSegment { start: number; end: number; text: string }
interface Scene { timestamp: number; score: number }
interface OcrFrame { timestamp: number; text: string; confidence: number; hasWatermark: boolean }
interface SilentSegment { start: number; end: number; duration: number }

interface AnalysisSummary {
  hasTranscript: boolean;
  transcriptLanguage?: string;
  segmentCount: number;
  sceneCount: number;
  watermarkDetected: boolean;
  silentSegmentCount: number;
  meanVolume?: number;
  ocrFrameCount: number;
  analyzedAt: string;
}

interface JobInfo {
  id: string;
  status: string;
  progress: number;
  stepResults: Record<string, { status: string; durationMs?: number; error?: string }> | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  attempts: number;
}

interface AnalysisPayload {
  projectId: string;
  analysisStatus: "not_started" | "queued" | "running" | "completed" | "failed";
  projectStatus: string;
  job: JobInfo | null;
  analysis: {
    transcript: { language?: string; segments: TranscriptSegment[]; fullText: string } | null;
    transcriptStatus: string;
    scenes: { threshold: number; scenes: Scene[] } | null;
    scenesStatus: string;
    ocr: { frames: OcrFrame[]; watermarkDetected: boolean; watermarkTimestamps: number[] } | null;
    ocrStatus: string;
    audio: { meanVolume: number; maxVolume: number; silentSegments: SilentSegment[] } | null;
    audioStatus: string;
    summary: AnalysisSummary | null;
    version: number;
    durationMs: number | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

type Tab = "transcript" | "scenes" | "ocr" | "audio";

interface RiskData {
  overallScore: number;
  watermarkScore: number | null;
  audioReuseScore: number | null;
  lowTransformationScore: number | null;
  notes: string[] | null;
}

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "transcript", label: "Transcript", icon: <FileText className="h-4 w-4" /> },
  { key: "scenes", label: "Scenes", icon: <Film className="h-4 w-4" /> },
  { key: "ocr", label: "OCR", icon: <Eye className="h-4 w-4" /> },
  { key: "audio", label: "Audio", icon: <Volume2 className="h-4 w-4" /> },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// --- Main Component ---

export default function AnalysisPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [payload, setPayload] = useState<AnalysisPayload | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("transcript");
  const [startingAnalysis, setStartingAnalysis] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/analysis`);
      const json = await res.json();
      if (json.success) {
        setPayload(json.data as AnalysisPayload);
        setError(null);

        // If analysis is complete, also fetch risk
        if (json.data.analysisStatus === "completed") {
          try {
            const riskRes = await fetch(`/api/projects/${projectId}/risk`);
            const riskJson = await riskRes.json();
            if (riskJson.success && riskJson.data.risk) {
              setRiskData(riskJson.data.risk as RiskData);
            }
          } catch {
            // Risk fetch failure is non-critical
          }
        }
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to fetch analysis data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Poll while queued or running
  const status = payload?.analysisStatus;
  useEffect(() => {
    if (status !== "queued" && status !== "running") return;
    const interval = setInterval(fetchAnalysis, 3000);
    return () => clearInterval(interval);
  }, [status, fetchAnalysis]);

  const startAnalysis = async () => {
    setStartingAnalysis(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        // Immediately re-fetch to get updated status
        await fetchAnalysis();
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to start analysis");
    } finally {
      setStartingAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const analysisStatus = payload?.analysisStatus ?? "not_started";
  const job = payload?.job;
  const analysis = payload?.analysis;
  const summary = analysis?.summary;
  const canStartAnalysis =
    analysisStatus === "not_started" ||
    analysisStatus === "failed" ||
    (payload?.projectStatus === "UPLOADED" && analysisStatus !== "queued" && analysisStatus !== "running");

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
          <h1 className="text-2xl font-bold text-gray-900">Video Analysis</h1>
          <StatusBadge status={analysisStatus} />
        </div>
        {canStartAnalysis && (
          <button
            onClick={startAnalysis}
            disabled={startingAnalysis}
            className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            {startingAnalysis ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {analysisStatus === "failed" ? "Retry Analysis" : "Start Analysis"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Queued state */}
      {analysisStatus === "queued" && (
        <div className="mt-6 flex flex-col items-center gap-3 py-12">
          <Clock className="h-10 w-10 text-blue-500" />
          <p className="text-sm text-gray-500">Analysis job is queued. Waiting for worker...</p>
        </div>
      )}

      {/* Running state with progress */}
      {analysisStatus === "running" && (
        <div className="mt-6">
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            <p className="text-sm text-gray-500">
              Analyzing video... This may take a few minutes.
            </p>
          </div>
          {job && (
            <ProgressBar progress={job.progress} stepResults={job.stepResults} />
          )}
        </div>
      )}

      {/* Failed state */}
      {analysisStatus === "failed" && job?.errorMessage && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">Analysis failed</p>
              <p className="mt-1 text-xs text-red-600">{job.errorMessage}</p>
              {job.attempts > 1 && (
                <p className="mt-1 text-xs text-red-500">Attempts: {job.attempts}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards + data tabs */}
      {analysis && analysisStatus === "completed" && (
        <div className="mt-6">
          {/* Summary Cards */}
          {summary && <SummaryCards summary={summary} analysis={analysis} />}

          {/* Risk Report */}
          {riskData && <RiskPanel risk={riskData} />}

          {/* Tabs */}
          <div className="mt-6 flex gap-1 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-b-2 border-yellow-500 text-yellow-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.icon}
                {tab.label}
                <StepStatusDot status={analysis[`${tab.key}Status` as keyof typeof analysis] as string} />
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-4 rounded-lg border bg-white p-6">
            {activeTab === "transcript" && <TranscriptTab data={analysis.transcript} />}
            {activeTab === "scenes" && <ScenesTab data={analysis.scenes} />}
            {activeTab === "ocr" && <OcrTab data={analysis.ocr} />}
            {activeTab === "audio" && <AudioTab data={analysis.audio} />}
          </div>
        </div>
      )}

      {/* Not started state */}
      {analysisStatus === "not_started" && (
        <div className="mt-6 rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">
            Video uploaded. Click &quot;Start Analysis&quot; to begin processing.
          </p>
        </div>
      )}
    </div>
  );
}

// --- Sub Components ---

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

function StepStatusDot({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return <CheckCircle className="h-3 w-3 text-green-500" />;
  if (s === "FAILED") return <XCircle className="h-3 w-3 text-red-500" />;
  if (s === "SKIPPED") return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
  return null;
}

function ProgressBar({
  progress,
  stepResults,
}: {
  progress: number;
  stepResults: Record<string, { status: string; durationMs?: number }> | null;
}) {
  const steps = ["transcript", "scenes", "ocr", "audio"];
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-gray-600">Progress</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-yellow-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {stepResults && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {steps.map((step) => {
            const sr = stepResults[step];
            return (
              <div key={step} className="text-center text-xs">
                <div className="capitalize text-gray-500">{step}</div>
                <div className="mt-0.5">
                  {!sr ? (
                    <span className="text-gray-300">pending</span>
                  ) : sr.status.toUpperCase() === "COMPLETED" ? (
                    <span className="text-green-600">done</span>
                  ) : sr.status.toUpperCase() === "FAILED" ? (
                    <span className="text-red-600">failed</span>
                  ) : sr.status.toUpperCase() === "SKIPPED" ? (
                    <span className="text-yellow-600">skipped</span>
                  ) : (
                    <span className="text-gray-400">pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCards({
  summary,
  analysis,
}: {
  summary: AnalysisSummary;
  analysis: NonNullable<AnalysisPayload["analysis"]>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCard
        label="Transcript"
        value={summary.hasTranscript ? `${summary.segmentCount} segments` : "Not available"}
        sub={summary.transcriptLanguage ? `Language: ${summary.transcriptLanguage}` : undefined}
        status={analysis.transcriptStatus}
      />
      <SummaryCard
        label="Scenes"
        value={`${summary.sceneCount} cuts`}
        status={analysis.scenesStatus}
      />
      <SummaryCard
        label="Watermark"
        value={summary.watermarkDetected ? "Detected" : "None"}
        sub={`${summary.ocrFrameCount} frames scanned`}
        status={analysis.ocrStatus}
        alert={summary.watermarkDetected}
      />
      <SummaryCard
        label="Silence"
        value={`${summary.silentSegmentCount} segments`}
        sub={summary.meanVolume != null ? `Mean: ${summary.meanVolume.toFixed(1)} dB` : undefined}
        status={analysis.audioStatus}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  status,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  status: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${alert ? "border-red-200 bg-red-50" : "bg-white"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{label}</p>
        <StepStatusDot status={status} />
      </div>
      <p className={`mt-1 text-sm font-semibold ${alert ? "text-red-700" : "text-gray-900"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// --- Risk Panel ---

function RiskPanel({ risk }: { risk: RiskData }) {
  const levelColor =
    risk.overallScore >= 70
      ? "text-red-700 bg-red-50 border-red-200"
      : risk.overallScore >= 40
        ? "text-yellow-700 bg-yellow-50 border-yellow-200"
        : "text-green-700 bg-green-50 border-green-200";

  const levelLabel =
    risk.overallScore >= 70 ? "High Risk" : risk.overallScore >= 40 ? "Medium Risk" : "Low Risk";

  return (
    <div className={`mt-4 rounded-lg border p-4 ${levelColor}`}>
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5" />
        <h3 className="text-sm font-semibold">
          Risk Assessment: {levelLabel} ({risk.overallScore}/100)
        </h3>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <RiskScoreBar label="Watermark" score={risk.watermarkScore ?? 0} />
        <RiskScoreBar label="Audio Reuse" score={risk.audioReuseScore ?? 0} />
        <RiskScoreBar label="Low Transform" score={risk.lowTransformationScore ?? 0} />
      </div>
      {risk.notes && risk.notes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {risk.notes.map((note, i) => (
            <li key={i} className="text-xs opacity-80">
              &bull; {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RiskScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 70 ? "bg-red-500" : score >= 40 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium">{score}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/50">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// --- Tab Components ---

function TranscriptTab({
  data,
}: {
  data: { language?: string; segments: TranscriptSegment[]; fullText: string } | null;
}) {
  if (!data) {
    return <p className="text-sm text-gray-400">No transcript available. Is OPENAI_API_KEY configured?</p>;
  }
  return (
    <div>
      {data.language && (
        <p className="mb-3 text-xs text-gray-400">Language: {data.language}</p>
      )}
      <div className="space-y-2">
        {data.segments.map((seg, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <span className="shrink-0 font-mono text-xs text-gray-400">
              {formatTime(seg.start)}
            </span>
            <p className="text-gray-700">{seg.text}</p>
          </div>
        ))}
      </div>
      {data.segments.length === 0 && data.fullText && (
        <p className="text-sm text-gray-700">{data.fullText}</p>
      )}
    </div>
  );
}

function ScenesTab({
  data,
}: {
  data: { threshold: number; scenes: Scene[] } | null;
}) {
  if (!data) {
    return <p className="text-sm text-gray-400">No scene data available.</p>;
  }
  return (
    <div>
      <p className="mb-3 text-xs text-gray-400">
        Threshold: {data.threshold} | {data.scenes.length} scene change(s) detected
      </p>
      {data.scenes.length === 0 ? (
        <p className="text-sm text-gray-500">No scene changes detected above threshold.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.scenes.map((scene, i) => (
            <div key={i} className="rounded-md border p-3">
              <p className="text-sm font-medium">{formatTime(scene.timestamp)}</p>
              <p className="text-xs text-gray-400">Score: {scene.score.toFixed(3)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OcrTab({
  data,
}: {
  data: { frames: OcrFrame[]; watermarkDetected: boolean; watermarkTimestamps: number[] } | null;
}) {
  if (!data) {
    return <p className="text-sm text-gray-400">No OCR data available.</p>;
  }
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            data.watermarkDetected
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {data.watermarkDetected ? "Watermark Detected" : "No Watermark"}
        </span>
        <span className="text-xs text-gray-400">{data.frames.length} frame(s) analyzed</span>
      </div>
      <div className="space-y-2">
        {data.frames
          .filter((f) => f.text.length > 0)
          .map((frame, i) => (
            <div
              key={i}
              className={`rounded-md border p-3 ${
                frame.hasWatermark ? "border-red-200 bg-red-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{formatTime(frame.timestamp)}</span>
                <span className="text-xs text-gray-400">
                  Confidence: {frame.confidence.toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-600">{frame.text}</p>
              {frame.hasWatermark && (
                <span className="mt-1 inline-block text-xs font-medium text-red-600">
                  Possible watermark
                </span>
              )}
            </div>
          ))}
        {data.frames.filter((f) => f.text.length > 0).length === 0 && (
          <p className="text-sm text-gray-500">No text detected in video frames.</p>
        )}
      </div>
    </div>
  );
}

function AudioTab({
  data,
}: {
  data: { meanVolume: number; maxVolume: number; silentSegments: SilentSegment[] } | null;
}) {
  if (!data) {
    return <p className="text-sm text-gray-400">No audio data available.</p>;
  }
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="rounded-md border p-3">
          <p className="text-xs text-gray-400">Mean Volume</p>
          <p className="text-lg font-semibold">{data.meanVolume.toFixed(1)} dB</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-gray-400">Max Volume</p>
          <p className="text-lg font-semibold">{data.maxVolume.toFixed(1)} dB</p>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-medium">
        Silent Segments ({data.silentSegments.length})
      </h3>
      {data.silentSegments.length === 0 ? (
        <p className="text-sm text-gray-500">No silent segments detected.</p>
      ) : (
        <div className="space-y-1">
          {data.silentSegments.map((seg, i) => (
            <div key={i} className="flex items-center gap-4 text-sm">
              <span className="font-mono text-xs text-gray-400">
                {formatTime(seg.start)} - {formatTime(seg.end)}
              </span>
              <span className="text-xs text-gray-500">({seg.duration.toFixed(1)}s)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
