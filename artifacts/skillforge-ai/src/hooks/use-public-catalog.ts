import { useQuery } from "@tanstack/react-query";
import type { Category, Course } from "@workspace/api-client-react/api.schemas";

type CourseParams = {
  search?: string;
  categoryId?: number;
  level?: string;
  sortBy?: string;
  published?: boolean;
  limit?: number;
};

type CourseListPayload = {
  courses?: Course[];
  data?: Course[];
};

type CategoryListPayload = {
  categories?: Category[];
  data?: Category[];
};

export function usePublicCourses(params: CourseParams = {}) {
  return useQuery({
    queryKey: ["public-courses", params],
    queryFn: async () => {
      const response = await fetchPublicJson<CourseListPayload | Course[]>(
        `/api/courses${toQueryString(params)}`,
      );
      return normalizeCourses(response);
    },
    staleTime: 60_000,
  });
}

export function usePublicCategories() {
  return useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const response = await fetchPublicJson<CategoryListPayload | Category[]>("/api/categories");
      return normalizeCategories(response);
    },
    staleTime: 60_000,
  });
}

function normalizeCourses(data: CourseListPayload | Course[]): Course[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.courses)) return data.courses;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function normalizeCategories(data: CategoryListPayload | Category[]): Category[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.categories)) return data.categories;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function toQueryString(params: CourseParams) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function fetchPublicJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getPublicApiBase()}${path}`, {
    credentials: "omit",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function getPublicApiBase() {
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
