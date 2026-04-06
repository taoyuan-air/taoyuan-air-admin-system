import type { UploadProgressState, UploadStatus } from '../shared/types/upload';

const store = new Map<number, UploadProgressState>();

export const ProgressService = {
  set(uploadId: number, progress: number, status: UploadStatus): void {
    store.set(uploadId, { uploadId, progress, status });
  },

  get(uploadId: number): UploadProgressState | undefined {
    return store.get(uploadId);
  },

  delete(uploadId: number): void {
    store.delete(uploadId);
  },
};
