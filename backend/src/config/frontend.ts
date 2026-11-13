// Retain an exact allowlist when an older Render service has no FRONTEND_URL set.
// Custom deployments should override this with their own frontend origin.
export const frontendOrigin = process.env.FRONTEND_URL?.trim() || (
  process.env.NODE_ENV === "production"
    ? "https://resolve-ai-three-alpha.vercel.app"
    : "http://localhost:5173"
);
