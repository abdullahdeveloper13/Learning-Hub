import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { SupabaseStorageError, SupabaseStorageService } from "../lib/supabaseStorage";

const router: IRouter = Router();
let storageService: SupabaseStorageService | null = null;

function getStorageService() {
  storageService ??= new SupabaseStorageService();
  return storageService;
}

const requestUploadUrlBody = z.object({
  name: z.string().min(1),
  size: z.number().nonnegative(),
  contentType: z.string().min(1),
  folder: z.string().optional(),
});

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
const ALLOWED_UPLOADS = [
  { extensions: [".jpg", ".jpeg", ".png", ".webp"], mimePrefixes: ["image/"], maxBytes: 10 * 1024 * 1024 },
  { extensions: [".mp4", ".webm", ".mov"], mimePrefixes: ["video/"], maxBytes: MAX_UPLOAD_BYTES },
  { extensions: [".pdf"], mimeTypes: ["application/pdf"], maxBytes: 50 * 1024 * 1024 },
  { extensions: [".zip"], mimeTypes: ["application/zip", "application/x-zip-compressed"], maxBytes: 200 * 1024 * 1024 },
];

const requestUploadUrlResponse = z.object({
  uploadURL: z.string(),
  objectPath: z.string(),
  publicUrl: z.string(),
  bucket: z.string(),
  path: z.string(),
  metadata: z.object({ name: z.string(), size: z.number(), contentType: z.string() }),
});

router.put("/storage/uploads", requireAuth, async (req: Request, res: Response) => {
  const fileName = decodeURIComponent(String(req.headers["x-file-name"] || "upload"));
  const folder = typeof req.headers["x-folder"] === "string" ? req.headers["x-folder"] : undefined;
  const contentType = req.headers["content-type"] || "application/octet-stream";
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);

  if (!body.length) {
    req.log.warn({ fileName }, "Empty storage upload request");
    res.status(400).json({ error: "Missing file body" });
    return;
  }
  const validationError = validateUpload({ name: fileName, size: body.length, contentType: String(contentType), folder, role: req.user!.role });
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const upload = await getStorageService().uploadBuffer(
      { name: fileName, contentType: String(contentType), folder },
      body,
    );

    res.json({
      publicUrl: upload.publicUrl,
      objectPath: upload.publicUrl,
      bucket: upload.bucket,
      path: upload.path,
      metadata: { name: fileName, size: body.length, contentType: String(contentType) },
    });
  } catch (error) {
    req.log.error({ err: error, file: fileName, contentType }, "Error uploading Supabase asset");
    res.status(500).json({ error: "Failed to upload asset" });
  }
});

router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = requestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues }, "Invalid storage upload URL request");
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType, folder } = parsed.data;
    const validationError = validateUpload({ name, size, contentType, folder, role: req.user!.role });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
    const upload = await getStorageService().createSignedUpload({ name, contentType, folder });

    res.json(
      requestUploadUrlResponse.parse({
        uploadURL: upload.uploadURL,
        objectPath: upload.publicUrl,
        publicUrl: upload.publicUrl,
        bucket: upload.bucket,
        path: upload.path,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error, file: parsed.data.name, contentType: parsed.data.contentType }, "Error generating Supabase upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.delete("/storage/assets", requireAuth, async (req: Request, res: Response) => {
  const parsed = z.object({ url: z.string().url() }).safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues }, "Invalid storage delete request");
    res.status(400).json({ error: "Missing or invalid URL" });
    return;
  }

  try {
    await getStorageService().removePublicUrl(parsed.data.url);
    res.status(204).send();
  } catch (error) {
    if (error instanceof SupabaseStorageError && error.status === 400) {
      res.status(400).json({ error: error.message });
      return;
    }
    req.log.error({ err: error, assetUrl: parsed.data.url }, "Error deleting Supabase asset");
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

export default router;

export function validateUpload(input: { name: string; size: number; contentType: string; folder?: string; role: string }) {
  if (input.size > MAX_UPLOAD_BYTES) return "File exceeds maximum upload size";
  const extension = (input.name.toLowerCase().match(/\.[a-z0-9]{1,12}$/)?.[0]) || "";
  const rule = ALLOWED_UPLOADS.find((candidate) =>
    candidate.extensions.includes(extension) &&
    ((candidate.mimeTypes ?? []).includes(input.contentType) || (candidate.mimePrefixes ?? []).some(prefix => input.contentType.startsWith(prefix)))
  );
  if (!rule) return "File type is not allowed";
  if (input.size > rule.maxBytes) return "File exceeds the size limit for this file type";
  const folder = input.folder || "course-media";
  if (!/^(course-thumbnails|course-videos|lesson-resources|assignment-submissions|avatars|course-media)(\/[a-z0-9_-]+)*$/i.test(folder)) {
    return "Upload folder is not allowed";
  }
  if (folder.startsWith("course-videos") || folder.startsWith("lesson-resources") || folder.startsWith("course-thumbnails")) {
    if (!["instructor", "admin"].includes(input.role)) return "Only instructors and admins can upload course assets";
  }
  if (folder.startsWith("assignment-submissions") && !["student", "instructor", "admin"].includes(input.role)) {
    return "Assignment upload is not authorized";
  }
  return null;
}
