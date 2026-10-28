import { Router } from "express";
import { createTicket, getTickets,getTicketById } from "../controllers/ticket.controller.js";
const router = Router();
router.post('/', createTicket);
router.get('/', getTickets)
router.get('/:id',getTicketById)
export default router;
//# sourceMappingURL=ticket.routes.js.map