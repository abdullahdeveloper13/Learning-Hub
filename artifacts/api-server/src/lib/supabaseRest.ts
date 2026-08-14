type SupabaseRow = Record<string, any>;

export class SupabaseRestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SupabaseRestError";
    this.status = status;
  }
}

export class SupabaseRestClient {
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;

  constructor() {
    this.supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
    this.serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  }

  async selectOne<T extends SupabaseRow>(table: string, query: Record<string, string | number>) {
    const params = new URLSearchParams({ limit: "1" });
    for (const [key, value] of Object.entries(query)) {
      params.set(key, `eq.${value}`);
    }

    const response = await this.request(`/rest/v1/${table}?${params.toString()}`, {
      method: "GET",
    });
    const rows = await parseRows<T>(response);
    return rows[0] ?? null;
  }

  async selectMany<T extends SupabaseRow>(table: string, query: Record<string, string | number> = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      params.set(key, `eq.${value}`);
    }

    const queryString = params.toString();
    const response = await this.request(`/rest/v1/${table}${queryString ? `?${queryString}` : ""}`, {
      method: "GET",
    });
    return parseRows<T>(response);
  }

  async insertOne<T extends SupabaseRow>(table: string, values: SupabaseRow) {
    const response = await this.request(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(values),
    });
    const rows = await parseRows<T>(response);
    return rows[0];
  }

  async updateOne<T extends SupabaseRow>(
    table: string,
    query: Record<string, string | number>,
    values: SupabaseRow,
  ) {
    const params = new URLSearchParams({ limit: "1" });
    for (const [key, value] of Object.entries(query)) {
      params.set(key, `eq.${value}`);
    }

    const response = await this.request(`/rest/v1/${table}?${params.toString()}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(values),
    });
    const rows = await parseRows<T>(response);
    return rows[0] ?? null;
  }

  async deleteOne(table: string, query: Record<string, string | number>) {
    const params = new URLSearchParams({ limit: "1" });
    for (const [key, value] of Object.entries(query)) {
      params.set(key, `eq.${value}`);
    }

    const response = await this.request(`/rest/v1/${table}?${params.toString()}`, {
      method: "DELETE",
    });
    if (!response.ok) await parseRows(response);
  }

  async deleteMany(table: string, query: Record<string, string | number>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      params.set(key, `eq.${value}`);
    }

    const response = await this.request(`/rest/v1/${table}?${params.toString()}`, {
      method: "DELETE",
    });
    if (!response.ok) await parseRows(response);
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
}

let client: SupabaseRestClient | null = null;

export function supabaseRest() {
  client ??= new SupabaseRestClient();
  return client;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

async function parseRows<T>(response: Response): Promise<T[]> {
  if (response.ok) {
    return (await response.json()) as T[];
  }

  let detail: string | undefined;
  try {
    detail = JSON.stringify(await response.json());
  } catch {
    detail = await response.text().catch(() => "");
  }

  throw new SupabaseRestError(detail || response.statusText, response.status);
}
