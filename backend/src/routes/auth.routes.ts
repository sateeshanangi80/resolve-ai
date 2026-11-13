import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

const router = Router();
const credentialsLimit = rateLimit(20, 15 * 60000);

router.get("/me", authenticate, (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

router.post("/register", credentialsLimit, validateBody(registerSchema), registerUser);

router.post("/login", credentialsLimit, validateBody(loginSchema), loginUser);

router.post("/refresh", refreshAccessToken);

router.all("/refresh", (_req, res) => {
  res.set("Allow", "POST").status(405).json({
    success: false,
    message: "Use POST /api/auth/refresh with the refreshToken cookie from login",
  });
});

router.post("/logout", logoutUser);

export default router;
