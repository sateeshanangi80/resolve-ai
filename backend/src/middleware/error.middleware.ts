import type { ErrorRequestHandler } from "express";

import { AppError } from "../utils/AppError.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("ERROR:", error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });

    return;
  }

  if (error?.code === 11000) {
    res.status(409).json({ success: false, message: "An account or invitation with this email already exists" });
    return;
  }

  // Mongoose validation error
  if (error?.name === "ValidationError") {
    res.status(400).json({
      success: false,
      message: error.message,
    });

    return;
  }

  // Invalid Mongo ObjectId
  if (error?.name === "CastError") {
    res.status(400).json({
      success: false,
      message: "Invalid resource ID",
    });

    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
