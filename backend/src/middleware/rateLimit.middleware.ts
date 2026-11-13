import type { RequestHandler } from "express";
// Process-local protection. Use a shared store at the edge for multi-instance deployments.
export function rateLimit(max: number, windowMs: number): RequestHandler {
    const entries = new Map<string, {
        count: number;
        reset: number;
    }>();
    return (req, res, next) => {
        const now = Date.now();
        if (entries.size > 10000)
            for (const [key, entry] of entries)
                if (entry.reset <= now)
                    entries.delete(key);
        const key = req.ip || "unknown";
        let entry = entries.get(key);
        if (!entry || entry.reset <= now) {
            entry = { count: 0, reset: now + windowMs };
            entries.set(key, entry);
        }
        entry.count++;
        if (entry.count > max) {
            res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000))).status(429).json({ success: false, message: "Too many attempts. Please wait and try again." });
            return;
        }
        next();
    };
}
