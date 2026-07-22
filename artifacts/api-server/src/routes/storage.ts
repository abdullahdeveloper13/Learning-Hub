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
