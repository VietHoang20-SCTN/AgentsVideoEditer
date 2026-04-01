import type { AnalysisReport } from "@/lib/validators/analysis";

export interface RiskScores {
  overallScore: number;
  watermarkScore: number;
  audioReuseScore: number;
  lowTransformationScore: number;
  notes: string[];
}

/**
 * Score risk from 0 (safe) to 100 (high risk).
 * Heuristic-based analysis of raw analysis outputs.
 */
export function scoreRisk(report: AnalysisReport): RiskScores {
  const notes: string[] = [];
  let watermarkScore = 0;
  let audioReuseScore = 0;
  let lowTransformationScore = 0;

  // --- Watermark risk ---
  if (report.ocr) {
    if (report.ocr.watermarkDetected) {
      watermarkScore = 80;
      const wmCount = report.ocr.watermarkTimestamps.length;
      if (wmCount > 3) {
        watermarkScore = 95;
        notes.push(`Watermark detected in ${wmCount} frames — strong platform branding present.`);
      } else {
        notes.push(`Watermark detected in ${wmCount} frame(s) — likely branded source.`);
      }
    } else {
      // Check for low-confidence OCR text that might be subtle overlays
      const suspiciousFrames = report.ocr.frames.filter(
        (f) => f.text.length > 0 && f.confidence < 40
      );
      if (suspiciousFrames.length > 2) {
        watermarkScore = 25;
        notes.push("Some low-confidence text detected — could be subtle overlays.");
      }
    }
  } else {
    notes.push("OCR data not available — watermark detection skipped.");
  }

  // --- Audio reuse risk ---
  if (report.audio) {
    const { meanVolume, silentSegments } = report.audio;
    // Very consistent, "clean" audio often indicates produced/licensed content
    if (meanVolume > -15 && silentSegments.length === 0) {
      audioReuseScore = 45;
      notes.push("Audio is loud and continuous with no silence — possibly produced/licensed track.");
    } else if (meanVolume > -10) {
      audioReuseScore = 30;
      notes.push("Audio volume is very high — may contain amplified or mastered track.");
    }
    // If mostly silent (voice-only or ambient)
    const totalSilenceDuration = silentSegments.reduce((sum, s) => sum + s.duration, 0);
    if (totalSilenceDuration > 10) {
      audioReuseScore = Math.max(audioReuseScore - 15, 0);
    }
  } else {
    notes.push("Audio data not available — audio reuse detection skipped.");
  }

  // --- Low transformation risk ---
  if (report.scenes) {
    const sceneCount = report.scenes.scenes.length;
    if (sceneCount <= 1) {
      lowTransformationScore = 60;
      notes.push("Very few scene cuts — limited editing/transformation of source.");
    } else if (sceneCount <= 3) {
      lowTransformationScore = 35;
      notes.push("Few scene cuts — source may need more transformation.");
    }
  }

  // Transcript can indicate how much original commentary exists
  if (report.transcript) {
    const wordCount = report.transcript.fullText.split(/\s+/).length;
    if (wordCount < 10) {
      lowTransformationScore = Math.min(lowTransformationScore + 20, 100);
      notes.push("Very little spoken content — low transformation signal.");
    }
  } else {
    lowTransformationScore = Math.min(lowTransformationScore + 10, 100);
    notes.push("No transcript — cannot assess voice commentary transformation.");
  }

  // --- Overall score: weighted average ---
  const overallScore = Math.round(
    watermarkScore * 0.4 +
    audioReuseScore * 0.25 +
    lowTransformationScore * 0.35
  );

  return {
    overallScore: Math.min(overallScore, 100),
    watermarkScore,
    audioReuseScore,
    lowTransformationScore,
    notes,
  };
}
