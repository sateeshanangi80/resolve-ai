import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

const router = Router();

router.post("/register", validateBody(registerSchema), registerUser);

router.post("/login", validateBody(loginSchema), loginUser);

router.post("/refresh", refreshAccessToken);

router.all("/refresh", (_req, res) => {
  res.set("Allow", "POST").status(405).json({
    success: false,
    message: "Use POST /api/auth/refresh with the refreshToken cookie from login",
  });
});

router.post("/logout", logoutUser);

export default router;
