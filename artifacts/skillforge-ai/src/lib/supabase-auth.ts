import { createClient, type Provider, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

let clientPromise: Promise<SupabaseClient> | null = null;

export async function getSupabaseAuthClient() {
  clientPromise ??= loadSupabaseConfig().then(({ supabaseUrl, supabaseAnonKey }) =>
    createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }),
  );

  return clientPromise;
}

export async function signInWithSupabaseProvider(provider: Extract<Provider, "google" | "github">, role = "student") {
  const supabase = await getSupabaseAuthClient();
  sessionStorage.setItem("sf_oauth_role", role);

  const redirectTo = new URL("/auth/callback", window.location.origin);
  redirectTo.searchParams.set("provider", provider);

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo.toString(),
    },
  });

  if (error) throw error;
}

export async function completeSupabaseOAuth() {
  const supabase = await getSupabaseAuthClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;
  if (!data.session?.access_token) {
    throw new Error("Supabase did not return an authenticated session.");
  }

  const role = sessionStorage.getItem("sf_oauth_role") === "instructor" ? "instructor" : "student";
  const response = await fetch(`${getApiBase()}/api/auth/supabase/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessToken: data.session.access_token,
      role,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "SkillForge account exchange failed.");
  }

  sessionStorage.removeItem("sf_oauth_role");
  localStorage.setItem("sf_token", payload.token);
  localStorage.setItem("sf_user", JSON.stringify(payload.user));
  await supabase.auth.signOut().catch(() => {});

  return payload as {
    token: string;
    user: {
      role: "student" | "instructor" | "admin";
    };
  };
}

async function loadSupabaseConfig(): Promise<SupabaseConfig> {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envAnonKey) {
    return {
      supabaseUrl: envUrl,
      supabaseAnonKey: envAnonKey,
    };
  }

  const response = await fetch(`${getApiBase()}/api/auth/supabase/config`, {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Supabase Auth is not configured.");
  }

  return payload as SupabaseConfig;
}

function getApiBase() {
  const envBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (!envBaseUrl || typeof window === "undefined") return envBaseUrl;

  try {
    const configured = new URL(envBaseUrl);
    const configuredIsLocal = isLocalHost(configured.hostname);
    const pageIsLocal = isLocalHost(window.location.hostname);
    return configuredIsLocal && !pageIsLocal ? "" : envBaseUrl;
  } catch {
    return "";
  }
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
