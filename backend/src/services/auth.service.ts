import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import RefreshSession from "../models/RefreshSession.js";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshExpiry,
  hashToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { LoginInput, RegisterInput } from "../validators/auth.validator.js";

export const registerUserService = async (data: RegisterInput) => {
  const existingUser = await User.findOne({
    email: data.email,
  });

  if (existingUser) {
    throw new AppError("User with this email already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await User.create({
    name: data.name,
    email: data.email,

    password: hashedPassword,

    role: "Customer",
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
};

export const loginUserService = async (data: LoginInput) => {
  const user = await User.findOne({
    email: data.email,
  }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account is inactive", 403);
  }

  const passwordMatches = await bcrypt.compare(data.password, user.password);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  if (data.portalRole && user.role !== data.portalRole) {
    const roleLabel = user.role === "SupportAgent" ? "Support" : user.role;
    const requestedRole = data.portalRole === "SupportAgent" ? "Support" : data.portalRole;
    throw new AppError(
      `This account has ${roleLabel} access, not ${requestedRole} access. Use the ${roleLabel} sign-in portal.`,
      403,
    );
  }

  const accessToken = generateAccessToken({
    userId: user._id.toString(),

    role: user.role,
  });

  /*
      Create ID before inserting session.
    */
  const sessionId = new Types.ObjectId();

  const refreshToken = generateRefreshToken({
    userId: user._id.toString(),

    role: user.role,

    sessionId: sessionId.toString(),
  });

  await RefreshSession.create({
    _id: sessionId,

    userId: user._id,

    tokenHash: hashToken(refreshToken),

    expiresAt: getRefreshExpiry(),
  });

  return {
    user: {
      id: user._id,

      name: user.name,

      email: user.email,

      role: user.role,

      isActive: user.isActive,
    },

    accessToken,

    /*
        Controller uses this to
        create HttpOnly cookie.
        Don't put it in JSON.
      */
    refreshToken,
  };
};

export const refreshTokenService = async (refreshToken: string) => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 503) throw error;
    throw new AppError("Invalid refresh token", 401);
  }

  const tokenHash = hashToken(refreshToken);

  const session = await RefreshSession.findOne({
    _id: payload.sessionId,

    userId: payload.userId,

    tokenHash,

    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new AppError("Refresh session not found or  expired", 401);
  }

  const user = await User.findById(payload.userId);

  if (!user || !user.isActive) {
    await RefreshSession.deleteOne({ _id: session._id });

    throw new AppError("User account is unavailable", 401);
  }

  // Geneate  fresh acess  toeken

  const newAcessToken = generateAccessToken({
    userId: user._id.toString(),
    role: user.role,
  });

  // rotate refresh token

  const newRefreshToken = generateRefreshToken({
    userId: user._id.toString(),
    role: user.role,
    sessionId: session._id.toString(),
  });

  // old refresh-toekn hash is replaced
  // old token can no longer refresh
  const rotatedSession = await RefreshSession.findOneAndUpdate(
    { _id: session._id, tokenHash, expiresAt: { $gt: new Date() } },
    { $set: { tokenHash: hashToken(newRefreshToken), expiresAt: getRefreshExpiry() } },
    { new: true },
  );
  if (!rotatedSession) {
    throw new AppError("Refresh token was already used. Please sign in again.", 401);
  }

  return {
    accessToken: newAcessToken,
    refreshToken: newRefreshToken,
  };
};

export const logoutUserService = async (refreshToken: string) => {
  if (!refreshToken) {
    return;
  }

  const tokenHash = hashToken(refreshToken);
  await RefreshSession.deleteOne({ tokenHash });
};
