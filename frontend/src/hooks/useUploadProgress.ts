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
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!token || uploadIds.length === 0) return;

    const sources = uploadIds.map((id) => {
      const es = new EventSource(
        `${apiUrl(`/api/uploads/progress/${id}`)}?token=${encodeURIComponent(token)}`,
      );

      es.onmessage = (e) => {
        const data: ProgressEvent = JSON.parse(e.data);
        onUpdateRef.current(data);
        if (
          data.status === "completed" ||
          data.status === "failed" ||
          data.status === "cancelled"
        ) {
          es.close();
        }
      };

      es.onerror = () => es.close();

      return es;
    });

    return () => sources.forEach((es) => es.close());
  }, [uploadIds.join(","), token]);
}
