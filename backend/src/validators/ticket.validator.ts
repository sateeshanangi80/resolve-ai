import z from "zod";

export const ticketIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ticket ID"),
});

export const createTicketSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must contain at least 3 characters")
      .max(150, "Title cannot exceed 150 characters"),

    description: z
      .string()
      .trim()
      .min(10, "Description must contain at least 10 characters")
      .max(2000, "Description cannot exceed 2000 characters"),

    category: z.enum([
      "General",
      "Billing",
      "Technical",
      "Account",
      "Subscription",
    ]),

    priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
  })
  .strict();

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(3).max(150).optional(),

    description: z.string().trim().min(10).max(2000).optional(),

    category: z
      .enum(["General", "Billing", "Technical", "Account", "Subscription"])
      .optional(),

    priority: z.enum(["Low", "Medium", "High"]).optional(),

    status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update ticket",
  });

export const ticketListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),

  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).optional(),

  priority: z.enum(["Low", "Medium", "High"]).optional(),

  category: z
    .enum(["General", "Billing", "Technical", "Account", "Subscription"])
    .optional(),

  search: z.string().trim().max(100).optional(),

  sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),

  order: z.enum(["asc", "desc"]).default("desc"),
});

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
