import type { Request, Response } from "express";
import {
  loginUserService,
  logoutUserService,
  refreshTokenService,
  registerUserService,
} from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";
import {
  clearRefreshTokenCookieOptions,
  refreshCookieOptions,
} from "../utils/authCookie.js";
import { LoginInput, RegisterInput } from "../validators/auth.validator.js";

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = await registerUserService(req.body as unknown as RegisterInput);

  res.status(201).json({
    success: true,

    message: "User Registered Successfully",

    data: user,
  });
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const result = await loginUserService(req.body as LoginInput);

  res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

  res.status(200).json({
    success: true,
    message: "Login successfull",

    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new AppError("Refresh token is missing", 401);
  }

  const result = await refreshTokenService(refreshToken);

  // replace old cookie with roatated token

  res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

  res.status(200).json({
    success: true,
    message: "Access token refreshed successfully",
    data: {
      accessToken: result.accessToken,
    },
  });
};

export const logoutUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken;
  await logoutUserService(refreshToken);
  res.clearCookie("refreshToken", clearRefreshTokenCookieOptions);

  res.status(200).json({
    success: true,
    message: "User Logged out successfully",
  });
};
