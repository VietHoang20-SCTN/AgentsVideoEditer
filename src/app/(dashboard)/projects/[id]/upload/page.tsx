"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Dropzone } from "@/components/upload/dropzone";
import { UploadProgress } from "@/components/upload/upload-progress";
import { MetadataDisplay } from "@/components/upload/metadata-display";

interface UploadedAsset {
  id: string;
  fileName: string;
  sizeBytes: string;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  audioCodec: string | null;
  bitrate: number | null;
}

export default function UploadPage() {
  const params = useParams();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [uploaded, setUploaded] = useState<UploadedAsset | null>(null);
  const [error, setError] = useState("");

  const handleFileSelect = async (file: File) => {
    setError("");
    setFileName(file.name);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await new Promise<string>((resolve, reject) => {
        xhr.onload = () => resolve(xhr.responseText);
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("POST", `/api/projects/${params.id}/upload`);
        xhr.send(formData);
      });

      const data = JSON.parse(response);
      if (data.success) {
        setUploaded(data.data);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Link
        href={`/projects/${params.id}`}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to project
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Upload Video</h1>
      <p className="mt-1 text-sm text-gray-500">
        Upload an MP4 video file (max 500MB, max 3 minutes)
      </p>

      <div className="mt-6 space-y-4">
        {error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        {!uploaded && !uploading && (
          <Dropzone onFileSelect={handleFileSelect} />
        )}

        {uploading && (
          <UploadProgress progress={progress} fileName={fileName} />
        )}

        {uploaded && (
          <>
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="h-5 w-5" />
              Video uploaded successfully!
            </div>

            <MetadataDisplay
              fileName={uploaded.fileName}
              sizeBytes={Number(uploaded.sizeBytes)}
              durationMs={uploaded.durationMs}
              width={uploaded.width}
              height={uploaded.height}
              fps={uploaded.fps}
              codec={uploaded.codec}
              audioCodec={uploaded.audioCodec}
              bitrate={uploaded.bitrate}
            />

            <button
              onClick={() => router.push(`/projects/${params.id}`)}
              className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
            >
              Go to Project
            </button>
          </>
        )}
      </div>
    </div>
  );
}
