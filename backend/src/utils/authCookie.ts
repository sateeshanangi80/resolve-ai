import { CookieOptions } from "express";

const isProduction = process.env.NODE_ENV === "production";

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,

  secure: isProduction,

  sameSite: isProduction ? "none" : "lax",

  path: "/api/auth",

  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

export const clearRefreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,

  secure: isProduction,

  sameSite: isProduction ? "none" : "lax",

  path: "/api/auth",
};
