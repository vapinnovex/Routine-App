import { Platform } from "react-native";

const defaultUrl = Platform.OS === "web" && typeof location !== "undefined" && !["localhost", "127.0.0.1"].includes(location.hostname)
  ? "/api/v1" : "http://localhost:8000/api/v1";
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? defaultUrl).replace(/\/$/, "");
let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function setAccessToken(token: string | null) { accessToken = token; }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = new Headers(options.headers);
    headers.set("X-Routine-Client", "1");
    if (options.body) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const response = await fetch(`${API_URL}${path}`, {
      ...options, headers, signal: controller.signal,
      credentials: Platform.OS === "web" ? "include" : "omit",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = error.detail;
      const message = typeof detail === "string" ? detail
        : Array.isArray(detail) ? detail.map((item: { loc?: string[]; msg: string }) =>
          `${item.loc?.slice(1).join(".") ?? "Input"}: ${item.msg}`).join("; ")
        : `Request failed (${response.status})`;
      throw new ApiError(response.status, message);
    }
    return response.status === 204 ? undefined as T : await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "Cannot reach the server. Check your connection and API address, then retry.");
  } finally { clearTimeout(timeout); }
}
