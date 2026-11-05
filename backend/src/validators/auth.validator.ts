import { z } from "zod";

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(80, "Name cannot exceed 80 characters"),

    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .transform((email) => email.toLowerCase()),

    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
        message: "Password is too long",
      }),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .transform((email) => email.toLowerCase()),

    password: z.string().min(1, "Password is required"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
