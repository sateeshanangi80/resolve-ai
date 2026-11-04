// Vercel can override this public endpoint with VITE_API_URL at build time.
export const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "https://resolve-ai-api-fraz.onrender.com")
).replace(/\/+$/, "");

export interface ValidationIssue { field: string; message: string }

export class ApiError extends Error {
  issues: ValidationIssue[];
  constructor(message: string, issues: ValidationIssue[] = []) {
    super(message);
    this.issues = issues;
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new ApiError(result?.message || `Request failed (${response.status}). Please try again.`, result?.errors);
  }
  if (!result) throw new ApiError('The server returned an empty response. Please try again.');
  return result as T;
}
