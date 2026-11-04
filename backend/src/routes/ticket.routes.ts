import { Router } from "express";
import {
  createTicket,
  deleteTicket,
  getTicketById,
  getTickets,
  updateTicket,
} from "../controllers/ticket.controller.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.middleware.js";
import {
  createTicketSchema,
  ticketIdSchema,
  ticketListQuerySchema,
  updateTicketSchema,
} from "../validators/ticket.validator.js";

const router = Router();

router.post("/", validateBody(createTicketSchema), createTicket);
router.get("/", validateQuery(ticketListQuerySchema), getTickets);
router.get("/:id", validateParams(ticketIdSchema), getTicketById);
router.patch(
  "/:id",
  validateParams(ticketIdSchema),
  validateBody(updateTicketSchema),
  updateTicket,
);
router.delete("/:id", validateParams(ticketIdSchema), deleteTicket);

export default router;
