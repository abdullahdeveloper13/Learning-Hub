// Stub — use MediaUpload component or raw fetch in the app instead
export function useUpload(_opts?: any) {
  return {
    uploadFile: async (_file: File) => ({ objectPath: "" }),
    isUploading: false,
    progress: 0,
  };
}
