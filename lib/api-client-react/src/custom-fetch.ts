export type AuthTokenGetter = () => string | null | Promise<string | null>;

let baseUrlOverride = "";
let authTokenGetter: AuthTokenGetter | null = null;

export function setBaseUrl(url: string) {
  baseUrlOverride = url.replace(/\/$/, "");
}

export function setAuthTokenGetter(getter: AuthTokenGetter | null) {
  authTokenGetter = getter;
}

async function getAuthToken() {
  if (authTokenGetter) {
    return authTokenGetter();
  }

  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem("sf_token");
}

export const customFetch = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const token = await getAuthToken();
  const envBaseUrl = ((import.meta as any).env?.VITE_API_URL || "").replace(/\/$/, "");
  const baseUrl = baseUrlOverride || getUsableBaseUrl(envBaseUrl);
  
  const headers = new Headers(options?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers,
    credentials: "omit", // The backend might use cookies, but we use Authorization header
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || "An error occurred");
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
};

export type ErrorType<ErrorData> = Error;
export type BodyType<BodyData> = BodyData;

function getUsableBaseUrl(envBaseUrl: string) {
  if (!envBaseUrl || typeof window === "undefined") return envBaseUrl;

  try {
    const configured = new URL(envBaseUrl);
    const pageHost = window.location.hostname;
    const configuredHost = configured.hostname;
    const configuredIsLocal =
      configuredHost === "localhost" ||
      configuredHost === "127.0.0.1" ||
      configuredHost === "::1";
    const pageIsLocal =
      pageHost === "localhost" ||
      pageHost === "127.0.0.1" ||
      pageHost === "::1";

    return configuredIsLocal && !pageIsLocal ? "" : envBaseUrl;
  } catch {
    return envBaseUrl;
  }
}
