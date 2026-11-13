import type { RequestHandler } from "express";
import User from "../models/User.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";

export const authenticate: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Access token is required", 401);
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new AppError("Access token is required", 401);
  }

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 503) throw error;
    throw new AppError("Invalid or expired access token", 401);
  }

  // Fetch the latest user information from MongoDB.
  const user = await User.findById(decoded.userId).select(
    "name email role isActive",
  );

  if (!user) {
    throw new AppError("User not found", 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account is inactive", 403);
  }

  // Attach authenticated user to Express request.
  req.user = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  next();
};
