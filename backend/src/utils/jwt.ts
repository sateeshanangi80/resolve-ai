import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

import type { UserRole } from "../models/User.js";

interface AccessTokenPayload {
  userId: string;
  role: UserRole;
}

interface RefreshTokenPayload extends JwtPayload {
  userId: string;
  role: UserRole;
  sessionId: string;
  tokenType: "refresh";
}

const getAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;



  
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }

  return secret;
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not defined");
  }

  return secret;
};

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: "15m",
    algorithm: "HS256",
  });
};

export const generateRefreshToken = (payload: {
  userId: string;
  role: UserRole;
  sessionId: string;
}): string => {
  return jwt.sign(
    {
      ...payload,
      tokenType: "refresh",
    },
    getRefreshSecret(),
    {
      expiresIn: "7d",
      algorithm: "HS256",

      /*
        Makes every rotated token unique.
      */
      jwtid: crypto.randomUUID(),
    },
  );
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, getRefreshSecret(), {
    algorithms: ["HS256"],
  });

  if (
    typeof decoded === "string" ||
    decoded.tokenType !== "refresh" ||
    !decoded.userId ||
    !decoded.sessionId
  ) {
    throw new Error("Invalid refresh token");
  }

  return decoded as RefreshTokenPayload;
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const getRefreshExpiry = (): Date => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};
