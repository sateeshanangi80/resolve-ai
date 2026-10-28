import { Router } from "express";
import {
  createTicket,
  getTicketById,
  getTickets,
} from "../controllers/ticket.controller.js";

const router = Router();

router.post("/", createTicket);
router.get("/", getTickets);
router.get("/:id", getTicketById);

export default router;
