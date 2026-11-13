import { z } from "zod";
import { registerSchema } from "./auth.validator.js";
export const setupSchema = registerSchema.extend({ setupKey: z.string().min(32).max(256) }).strict();
export const inviteSchema = registerSchema.omit({ password: true }).extend({
    role: z.enum(["Customer", "SupportAgent", "Admin"]),
}).strict();
export const acceptInviteSchema = z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid invitation link"),
    password: registerSchema.shape.password,
}).strict();
export const userUpdateSchema = z.object({
    role: z.enum(["Customer", "SupportAgent"]).optional(),
    isActive: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Choose a change to save");
export const peopleQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(15),
    search: z.string().trim().max(100).default(""),
    role: z.enum(["Customer", "SupportAgent", "Admin"]).optional(),
});
