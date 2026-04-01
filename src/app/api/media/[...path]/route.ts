import { NextRequest } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { storage } from "@/lib/storage/factory";

// Chunk size for range requests: 1MB
const CHUNK_SIZE = 1024 * 1024;

// Map file extensions to MIME types
const MIME_TYPES: Record<string, string> = {
  // Video
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  // Audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".weba": "audio/webm",
  // Images (thumbnails, etc.)
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Detect MIME type from file extension.
 * Falls back to "application/octet-stream" for unknown types.
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Convert a Node.js ReadStream into a Web ReadableStream
 * suitable for the Response constructor.
 */
function nodeStreamToWeb(
  nodeStream: ReturnType<typeof createReadStream>
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => {
        controller.enqueue(
          typeof chunk === "string" ? Buffer.from(chunk) : chunk
        );
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

/**
 * GET /api/media/[...path]
 *
 * Streams media files from the uploads directory with support for
 * HTTP Range requests (required for video seeking in browsers).
 *
 * Security: rejects paths containing ".." to prevent directory traversal.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  // --- Validate path segments ---
  if (!pathSegments || pathSegments.length === 0) {
    return new Response(JSON.stringify({ error: "No file path provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Security: prevent directory traversal attacks
  const hasTraversal = pathSegments.some(
    (segment) => segment === ".." || segment.includes("..")
  );
  if (hasTraversal) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Reconstruct the storage key from path segments
  const key = pathSegments.join("/");

  // --- Check file existence via storage provider ---
  const fileExists = await storage.exists(key);
  if (!fileExists) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve the absolute file path from the storage provider
  const filePath = storage.getPath(key);
  const mimeType = getMimeType(filePath);

  try {
    const fileStat = await stat(filePath);
    const fileSize = fileStat.size;

    // --- Handle Range requests for video/audio seeking ---
    const rangeHeader = req.headers.get("range");

    if (rangeHeader) {
      // Parse "bytes=START-END" format
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        // Malformed Range header → 416 Range Not Satisfiable
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const start = parseInt(match[1], 10);
      const requestedEnd = match[2] ? parseInt(match[2], 10) : undefined;

      // Clamp the end to at most CHUNK_SIZE bytes from start, or file end
      const end = Math.min(
        requestedEnd !== undefined ? requestedEnd : start + CHUNK_SIZE - 1,
        fileSize - 1
      );

      // Validate range bounds
      if (start >= fileSize || start > end) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const contentLength = end - start + 1;
      const stream = createReadStream(filePath, { start, end });

      return new Response(nodeStreamToWeb(stream), {
        status: 206,
        headers: {
          "Content-Type": mimeType,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Content-Length": contentLength.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // --- No Range header: serve the full file ---
    const stream = createReadStream(filePath);

    return new Response(nodeStreamToWeb(stream), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to read file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
