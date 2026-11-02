import { Router } from "express";
import {
  createTicket,
  deleteTicket,
  getTicketById,
  getTickets,
  updateTicket,
} from "../controllers/ticket.controller.js";

const router = Router();

router.post("/", createTicket);
router.get("/", getTickets);
router.get("/:id", getTicketById);
router.patch("/:id", updateTicket);
router.delete("/:id",deleteTicket);

export default router;
