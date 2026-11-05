import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFound } from "./middleware/notFound.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Resolve AI Backend is running successfully",
    service: "Resolve AI Backend",
    
  });
});

app.use("/api/tickets", ticketRoutes);

app.use("/api/auth", authRoutes);

/*
  IMPORTANT:
  These must come AFTER all routes
*/

app.use(notFound);

app.use(errorHandler);

export default app;
