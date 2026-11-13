import { Router } from "express";

import {
  assignTicket,
  createTicket,
  deleteTicket,
  getTicketById,
  getTickets,
  updateTicket,
} from "../controllers/ticket.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.middleware.js";

import {
  assignTicketSchema,
  createTicketSchema,
  ticketIdSchema,
  ticketListQuerySchema,
  updateTicketSchema,
} from "../validators/ticket.validator.js";

const router = Router();

// All ticket routes require authentication.
router.use(authenticate);

// Customer and Admin can create tickets.
router.post(
  "/",
  authorizeRoles("Customer", "Admin"),
  validateBody(createTicketSchema),
  createTicket,
);

// All roles can list tickets, subject to ownership/assignment filters.
router.get(
  "/",
  authorizeRoles("Customer", "SupportAgent", "Admin"),
  validateQuery(ticketListQuerySchema),
  getTickets,
);

// All roles can view accessible tickets.
router.get(
  "/:id",
  authorizeRoles("Customer", "SupportAgent", "Admin"),
  validateParams(ticketIdSchema),
  getTicketById,
);

// SupportAgent and Admin can update.
router.patch(
  "/:id",
  authorizeRoles("SupportAgent", "Admin"),
  validateParams(ticketIdSchema),
  validateBody(updateTicketSchema),
  updateTicket,
);

// Only Admin can delete.
router.delete(
  "/:id",
  authorizeRoles("Admin"),
  validateParams(ticketIdSchema),
  deleteTicket,
);


router.patch(
  "/:id/assign",
  authorizeRoles("Admin"),
  validateParams(ticketIdSchema),
  validateBody(assignTicketSchema),
  assignTicket,
);

export default router;
