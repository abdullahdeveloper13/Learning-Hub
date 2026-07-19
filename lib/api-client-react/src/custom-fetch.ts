import { useEffect } from "react";
import { useAuth } from "./use-auth";

export const customFetch = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const token = localStorage.getItem("sf_token");
  
  const headers = new Headers(options?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "omit", // The backend might use cookies, but we use Authorization header
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "An error occurred");
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
