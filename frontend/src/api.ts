// Vercel can override this public endpoint with VITE_API_URL at build time.
export const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "https://resolve-ai-api-fraz.onrender.com")
).replace(/\/+$/, "");
