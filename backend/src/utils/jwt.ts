import type {
  UserRole,
} from "../models/User.js";
import jwt from "jsonwebtoken";

interface AccessTokenPayload {
  userId:string;
  role:UserRole
}

export const generateAccessToken = (
  payload:AccessTokenPayload,
):string => {

const secret = process.env.JWT_ACCESS_SECRET;

if(!secret) {
  throw new Error("JWT_ACCESS_SECRET is not found")
}

return jwt.sign(
  payload,secret, {
    expiresIn:"15m"
  }
)

}
