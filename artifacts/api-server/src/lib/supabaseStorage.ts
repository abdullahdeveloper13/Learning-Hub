import { randomUUID } from "crypto";

const DEFAULT_BUCKET = "course-assets";

type UploadRequest = {
  name: string;
  contentType: string;
  folder?: string;
};

type SignedUpload = {
  uploadURL: string;
  publicUrl: string;
  bucket: string;
  path: string;
};

export class SupabaseStorageError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SupabaseStorageError";
    this.status = status;
  }
}

export class SupabaseStorageService {
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket: string;

  constructor() {
    this.supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
    this.serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  }

  async ensureBucket() {
    const existing = await this.request(`/storage/v1/bucket/${this.bucket}`, {
      method: "GET",
    });

    if (existing.ok) return;
    if (existing.status !== 404) {
      await throwStorageError(existing, "Failed to inspect Supabase bucket");
    }

    const created = await this.request("/storage/v1/bucket", {
      method: "POST",
      body: JSON.stringify({
        id: this.bucket,
        name: this.bucket,
        public: true,
        file_size_limit: 2 * 1024 * 1024 * 1024,
        allowed_mime_types: null,
      }),
    });

    if (!created.ok && created.status !== 409) {
      await throwStorageError(created, "Failed to create Supabase bucket");
    }
  }

  async createSignedUpload({ name, contentType, folder }: UploadRequest): Promise<SignedUpload> {
    await this.ensureBucket();

    const objectPath = this.createObjectPath(name, contentType, folder);

    const response = await this.request(
      `/storage/v1/object/upload/sign/${this.bucket}/${encodePath(objectPath)}`,
      {
        method: "POST",
        body: JSON.stringify({ upsert: false }),
      },
    );

    if (!response.ok) {
      await throwStorageError(response, "Failed to create signed Supabase upload URL");
    }

    const data = (await response.json()) as { signedURL?: string; url?: string; token?: string };
    const signedPath = data.signedURL || data.url;
    if (!signedPath) {
      throw new SupabaseStorageError("Supabase did not return a signed upload URL");
    }

    return {
      uploadURL: signedPath.startsWith("http") ? signedPath : `${this.supabaseUrl}${signedPath}`,
      publicUrl: this.getPublicUrl(objectPath),
      bucket: this.bucket,
      path: objectPath,
    };
  }

  async uploadBuffer({ name, contentType, folder }: UploadRequest, body: Buffer): Promise<SignedUpload> {
    await this.ensureBucket();

    const objectPath = this.createObjectPath(name, contentType, folder);
    const response = await this.request(`/storage/v1/object/${this.bucket}/${encodePath(objectPath)}`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body,
    });

    if (!response.ok) {
      await throwStorageError(response, "Failed to upload Supabase object");
    }

    return {
      uploadURL: this.getPublicUrl(objectPath),
      publicUrl: this.getPublicUrl(objectPath),
      bucket: this.bucket,
      path: objectPath,
    };
  }

  async removePublicUrl(publicUrl: string) {
    const path = this.pathFromPublicUrl(publicUrl);
    if (!path) {
      throw new SupabaseStorageError("URL is not managed by this Supabase bucket", 400);
    }

    const response = await this.request(`/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      body: JSON.stringify({ prefixes: [path] }),
    });

    if (!response.ok && response.status !== 404) {
      await throwStorageError(response, "Failed to delete Supabase object");
    }
  }

  getPublicUrl(path: string) {
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${encodePath(path)}`;
  }

  pathFromPublicUrl(publicUrl: string) {
    try {
      const url = new URL(publicUrl);
      const expected = new URL(this.supabaseUrl);
      if (url.origin !== expected.origin) return null;

      const prefix = `/storage/v1/object/public/${this.bucket}/`;
      if (!url.pathname.startsWith(prefix)) return null;
      return decodeURIComponent(url.pathname.slice(prefix.length));
    } catch {
      return null;
    }
  }

  private request(path: string, init: RequestInit) {
    return fetch(`${this.supabaseUrl}${path}`, {
      ...init,
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
  }

  private createObjectPath(name: string, contentType: string, folder?: string) {
    const extension = safeExtension(name, contentType);
    return [
      sanitizePathPart(folder || "course-media"),
      new Date().toISOString().slice(0, 10),
      `${randomUUID()}${extension}`,
    ].join("/");
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function sanitizePathPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\/+/g, "/")
    || "course-media";
}

function safeExtension(name: string, contentType: string) {
  const match = name.toLowerCase().match(/\.[a-z0-9]{1,12}$/);
  if (match) return match[0];
  if (contentType === "application/pdf") return ".pdf";
  if (contentType.startsWith("image/")) return `.${contentType.slice(6).replace("jpeg", "jpg")}`;
  if (contentType.startsWith("video/")) return `.${contentType.slice(6)}`;
  return "";
}

async function throwStorageError(response: Response, fallback: string): Promise<never> {
  let detail: string | undefined;
  try {
    detail = JSON.stringify(await response.json());
  } catch {
    detail = await response.text().catch(() => "");
  }

  throw new SupabaseStorageError(`${fallback}: ${detail || response.statusText}`, response.status);
}
