import { useEffect, useRef } from "react";
import { apiUrl } from "../config/api";

interface ProgressEvent {
  uploadId: number;
  progress: number;
  status: "uploading" | "completed" | "failed" | "cancelled";
}

export function useUploadProgress(
  uploadIds: number[],
  token: string | null,
  onUpdate: (event: ProgressEvent) => void,
) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!token || uploadIds.length === 0) return;

    const controllers = uploadIds.map((id) => {
      const controller = new AbortController();
      void (async () => {
        const response = await fetch(apiUrl(`/api/uploads/progress/${id}`), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (!controller.signal.aborted) {
            const { done, value } = await reader.read();
            if (done || controller.signal.aborted) break;
            buffer += decoder.decode(value, { stream: true });
            let end: number;
            while ((end = buffer.indexOf("\n\n")) !== -1) {
              const event = buffer.slice(0, end);
              buffer = buffer.slice(end + 2);
              const line = event.split("\n").find((part) => part.startsWith("data: "));
              if (!line) continue;
              const data: ProgressEvent = JSON.parse(line.slice(6));
              onUpdateRef.current(data);
              if (["completed", "failed", "cancelled"].includes(data.status)) {
                controller.abort();
                return;
              }
            }
          }
        } finally {
          await reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
      })().catch(() => controller.abort());
      return controller;
    });

    return () => controllers.forEach((controller) => controller.abort());
  }, [uploadIds, token]);
}
