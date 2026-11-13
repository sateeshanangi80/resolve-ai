import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFound } from "./middleware/notFound.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import { publicPortalRoutes, workspaceRoutes } from "./routes/portal.routes.js";
import { AppError } from "./utils/AppError.js";
import { frontendOrigin } from "./config/frontend.js";

const app = express();
app.disable("x-powered-by");

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.headers.origin && req.headers.origin !== frontendOrigin) {
    next(new AppError("This website origin is not allowed to make changes", 403));
    return;
  }
  next();
});
app.use(express.json());

app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Resolve AI Backend is running successfully",
    service: "Resolve AI Backend",
  });
});

app.use("/api/tickets", ticketRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/portal", publicPortalRoutes);
app.use("/api/workspace", workspaceRoutes);

/*
  IMPORTANT:
  These must come AFTER all routes
*/

app.use(notFound);

app.use(errorHandler);

export default app;
