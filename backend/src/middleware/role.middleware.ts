import type { RequestHandler } from "express";
import type { UserRole } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export const authorizeRoles = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError("You do not have permission to perform this action", 403);
    }

    next();
  };
};
