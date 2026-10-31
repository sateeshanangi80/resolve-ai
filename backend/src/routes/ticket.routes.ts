import { Router } from "express";
import {
  createTicket,
  getTicketById,
  getTickets,
  updateTicket,
} from "../controllers/ticket.controller.js";

const router = Router();

router.post("/", createTicket);
router.get("/", getTickets);
router.get("/:id", getTicketById);
router.patch("/:id", updateTicket);

export default router;
