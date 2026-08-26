"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { publicApiUrl } from "@/lib/environment";
import { createClient } from "@/lib/supabase/client";

type UploadGrant = {
  assetId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
};

function encodeMetadata(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function uploadFile(
  location: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PATCH", location);
    request.setRequestHeader("Tus-Resumable", "1.0.0");
    request.setRequestHeader("Upload-Offset", "0");
    request.setRequestHeader("Content-Type", "application/offset+octet-stream");
    Object.entries(headers).forEach(([name, value]) => request.setRequestHeader(name, value));
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Video upload failed with status ${request.status}`));
    });
    request.addEventListener("error", () => reject(new Error("Video upload network error")));
    request.send(file);
  });
}

export function VideoUploader({ courseId }: { courseId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "preparing" | "uploading" | "done">("idle");
  const [error, setError] = useState("");

  async function startUpload() {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError("Choose a video file first.");
      return;
    }

    setError("");
    setProgress(0);
    setStatus("preparing");

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sign in again before uploading.");

      const response = await fetch(`${publicApiUrl}/api/v1/teacher/video-uploads`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          title: file.name.replace(/\.[^.]+$/, ""),
          fileName: file.name,
        }),
      });
      const payload = (await response.json()) as {
        data?: UploadGrant;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Could not prepare the video upload.");
      }

      const grant = payload.data;
      const createResponse = await fetch(grant.uploadUrl, {
        method: "POST",
        headers: {
          ...grant.uploadHeaders,
          "Tus-Resumable": "1.0.0",
          "Upload-Length": String(file.size),
          "Upload-Metadata": `filename ${encodeMetadata(file.name)},filetype ${encodeMetadata(file.type || "video/mp4")}`,
        },
      });
      if (!createResponse.ok) {
        throw new Error(`Bunny could not start the upload (${createResponse.status}).`);
      }

      const locationHeader = createResponse.headers.get("location");
      if (!locationHeader) throw new Error("Bunny did not return an upload location.");

      setStatus("uploading");
      await uploadFile(
        new URL(locationHeader, grant.uploadUrl).toString(),
        file,
        grant.uploadHeaders,
        setProgress
      );
      await supabase.from("video_assets").update({ status: "processing" }).eq("id", grant.assetId);

      setProgress(100);
      setStatus("done");
      router.refresh();
    } catch (uploadError) {
      setStatus("idle");
      setError(uploadError instanceof Error ? uploadError.message : "Video upload failed.");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="flex items-center gap-2 font-bold">
        <UploadCloud className="h-5 w-5" />
        Upload video to Bunny
      </h2>
      <input
        ref={fileInput}
        type="file"
        accept="video/*"
        disabled={status === "preparing" || status === "uploading"}
        className="mt-4 block w-full text-sm"
      />
      {(status === "uploading" || status === "done") && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-primary-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {status === "done"
              ? "Uploaded; Bunny is processing the video."
              : `${progress}% uploaded`}
          </p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={startUpload}
        disabled={status === "preparing" || status === "uploading"}
        className="mt-4 w-full rounded-xl bg-primary-600 px-4 py-3 font-bold text-white disabled:opacity-50"
      >
        {status === "preparing"
          ? "Preparing..."
          : status === "uploading"
            ? "Uploading..."
            : "Upload video"}
      </button>
    </div>
  );
}
