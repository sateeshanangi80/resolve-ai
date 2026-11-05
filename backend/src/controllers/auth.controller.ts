import type { Request, Response } from "express";
import { registerUserService } from "../services/auth.service.js";
import { RegisterInput } from "../validators/auth.validator.js";

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
