import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileVideo, FileText, Image, File, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaUploadProps {
  accept?: string;
  label?: string;
  hint?: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
  type?: "image" | "video" | "pdf" | "file";
  className?: string;
}

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function getIcon(type: MediaUploadProps["type"]) {
  switch (type) {
    case "video": return <FileVideo className="w-8 h-8" />;
    case "pdf": return <FileText className="w-8 h-8" />;
    case "image": return <Image className="w-8 h-8" />;
    default: return <File className="w-8 h-8" />;
  }
}

function getAccept(type: MediaUploadProps["type"]) {
  switch (type) {
    case "video": return "video/*";
    case "pdf": return "application/pdf";
    case "image": return "image/*";
    default: return "*/*";
  }
}

export function MediaUpload({
  accept,
  label = "Upload File",
  hint,
  currentUrl,
  onUploaded,
  onRemove,
  type = "file",
  className,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);

  React.useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    setProgress(10);

    try {
      const token = localStorage.getItem("sf_token");
      // Step 1: Request presigned URL
      const urlRes = await fetch(`${API_BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });

      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      setProgress(30);

      // Step 2: Upload directly to GCS
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      setProgress(90);

      // Serving URL
      const serveUrl = `${API_BASE}/api/storage${objectPath}`;
      if (type === "image") {
        setPreview(serveUrl);
      }
      setProgress(100);
      onUploaded(serveUrl);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove?.();
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Image preview */}
      {type === "image" && preview && (
        <div className="relative group aspect-video rounded-lg overflow-hidden border bg-muted">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRemove}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Non-image with current URL */}
      {type !== "image" && preview && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <span className="text-sm truncate flex-1 text-muted-foreground">{preview.split("/").pop()}</span>
          <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>Replace</Button>
          <Button size="sm" variant="ghost" onClick={handleRemove}><X className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Upload button / drop zone */}
      {!preview && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
        >
          {getIcon(type)}
          <span className="font-medium">{label}</span>
          {hint && <span className="text-xs">{hint}</span>}
        </button>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Upload className="w-4 h-4 animate-bounce" />
            Uploading…
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept || getAccept(type)}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
