"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import EditorShell from "@/components/editor/editor-shell";
import type {
  EditorProject,
  SourceVideoInfo,
  EditorStateData,
  AIAnalysisData,
  Clip,
  Marker,
} from "@/components/editor/types";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<EditorProject | null>(null);
  const [sourceVideo, setSourceVideo] = useState<SourceVideoInfo | null>(null);
  const [initialState, setInitialState] = useState<EditorStateData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisData | null>(null);

  useEffect(() => {
    async function loadEditorData() {
      try {
        // Fetch project, editor state, and AI analysis in parallel
        const [projectRes, editorRes, aiRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/editor`),
          fetch(`/api/projects/${projectId}/ai-analysis`).catch(() => null),
        ]);

        // Parse project
        const projectJson = await projectRes.json();
        if (!projectJson.success) {
          setError("Project not found");
          setLoading(false);
          return;
        }

        const projectData = projectJson.data;
        setProject({
          id: projectData.id,
          name: projectData.name,
          status: projectData.status,
        });

        // Find source video
        const sourceAsset = projectData.mediaAssets?.find(
          (a: { type: string }) => a.type === "SOURCE_VIDEO"
        );

        if (!sourceAsset) {
          setError("No video found in this project. Please upload a video first.");
          setLoading(false);
          return;
        }

        setSourceVideo({
          storageKey: sourceAsset.storageKey,
          durationMs: sourceAsset.durationMs || 0,
          width: sourceAsset.width || 1920,
          height: sourceAsset.height || 1080,
          mediaUrl: `/api/media/${sourceAsset.storageKey}`,
        });

        // Parse editor state
        const editorJson = await editorRes.json();
        if (editorJson.success && editorJson.data) {
          const data = editorJson.data;
          const clips = (data.clips as Clip[]) || [];
          const markers = (data.markers as Marker[]) || [];
          setInitialState({
            clips,
            markers,
            playheadMs: data.playheadMs || 0,
            version: data.version || 1,
            duration: sourceAsset.durationMs || 0,
          });
        } else {
          // Fallback: create default state
          const durationMs = sourceAsset.durationMs || 0;
          setInitialState({
            clips: [
              {
                id: `clip_${Date.now()}`,
                startMs: 0,
                endMs: durationMs,
                sourceStartMs: 0,
                sourceEndMs: durationMs,
              },
            ],
            markers: [],
            playheadMs: 0,
            version: 1,
            duration: durationMs,
          });
        }

        // Parse AI analysis (optional, non-fatal)
        if (aiRes) {
          try {
            const aiJson = await aiRes.json();
            if (aiJson.success && aiJson.data?.data) {
              setAiAnalysis(aiJson.data.data as AIAnalysisData);
            }
          } catch {
            // AI analysis is optional
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load editor data:", err);
        setError("Failed to load editor. Please try again.");
        setLoading(false);
      }
    }

    loadEditorData();
  }, [projectId]);

  const handleSave = useCallback(
    async (state: EditorStateData) => {
      const res = await fetch(`/api/projects/${projectId}/editor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clips: state.clips,
          markers: state.markers,
          playheadMs: state.playheadMs,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to save");
      }
    },
    [projectId]
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
          <p className="text-sm text-gray-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error || !project || !sourceVideo || !initialState) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-red-400">{error || "Something went wrong"}</p>
          <button
            onClick={() => router.back()}
            className="text-sm text-yellow-500 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <EditorShell
      project={project}
      sourceVideo={sourceVideo}
      initialState={initialState}
      aiAnalysis={aiAnalysis}
      onSave={handleSave}
    />
  );
}
