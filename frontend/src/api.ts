export const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://resolve-ai-api-fraz.onrender.com')).replace(/\/+$/, '');
export interface ValidationIssue {
    field: string;
    message: string;
}
export class ApiError extends Error {
    issues: ValidationIssue[];
    status: number;
    constructor(message: string, issues: ValidationIssue[] = [], status = 0) {
        super(message);
        this.issues = issues;
        this.status = status;
    }
}
let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;
async function fetchWithTimeout(url: string, options: RequestInit) {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted)
        abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    }
    catch (error) {
        if (options.signal?.aborted)
            throw error;
        throw new ApiError(timedOut ? 'The server took too long to respond. Please try again.' : 'Cannot reach the server. Check your connection and try again.');
    }
    finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
    }
}
export function setAccessToken(token: string | null) { accessToken = token; }
export async function refreshSession() {
    if (!refreshPromise)
        refreshPromise = (async () => {
            const response = await fetchWithTimeout(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
            const result = await response.json().catch(() => null);
            if (!response.ok || !result?.data?.accessToken)
                throw new ApiError(result?.message || 'Please sign in again.', [], response.status);
            accessToken = result.data.accessToken;
        })().finally(() => { refreshPromise = null; });
    return refreshPromise;
}
export async function apiRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const headers = new Headers(options.headers);
    if (accessToken)
        headers.set('Authorization', `Bearer ${accessToken}`);
    const response = await fetchWithTimeout(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
    const result = await response.json().catch(() => null);
    const publicAuth = ['/api/auth/login', '/api/auth/register', '/api/auth/logout', '/api/auth/refresh'].includes(path) || path.startsWith('/api/portal/');
    if (response.status === 401 && !publicAuth && retry) {
        try {
            await refreshSession();
        }
        catch (error) {
            accessToken = null;
            if (error instanceof ApiError && [401, 403].includes(error.status))
                window.dispatchEvent(new Event('session-expired'));
            throw error;
        }
        return apiRequest<T>(path, options, false);
    }
    if (response.status === 401 && !publicAuth && !retry) {
        accessToken = null;
        window.dispatchEvent(new Event('session-expired'));
    }
    if (!response.ok || result?.success === false)
        throw new ApiError(result?.message || `Request failed (${response.status}). Please try again.`, result?.errors, response.status);
    if (!result)
        throw new ApiError('The server returned an empty response. Please try again.');
    return result as T;
}
