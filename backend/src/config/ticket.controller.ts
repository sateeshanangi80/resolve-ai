import type { Request, Response } from "express";
import { ticketListQuerySchema } from "../validators/ticket.validator.js";

import {
  getTicketByIdService,
  updateTicketService,
  deleteTicketService,
  createTicketService,
  getTicketService,
} from "../services/ticket.service.js";

import { AppError } from "../utils/AppError.js";

/* =========================
   CREATE
   ========================= */

export const createTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const ticket = await createTicketService(req.body);

  res.status(201).json({
    success: true,
    message: "Ticket created successfully",   
    data: ticket,
  });
};

/* =========================
   GET ALL
   ========================= */

export const getTickets = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const query = ticketListQuerySchema.parse(res.locals.validatedQuery ?? _req.query);
  const { tickets, pagination } = await getTicketService(query);

  res.status(200).json({
    success: true,
    message: "Tickets retrieved successfully",
    count: tickets.length,
    data: tickets,
    pagination,
  });
};

/* =========================
   GET BY ID
   ========================= */

export const getTicketById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const ticket = await getTicketByIdService(req.params.id);

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Ticket retrieved successfully",
    data: ticket,
  });
};

/* =========================
   UPDATE
   ========================= */

export const updateTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const updatedTicket = await updateTicketService(req.params.id, req.body);

  if (!updatedTicket) {
    throw new AppError("Ticket not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Ticket updated successfully",
    data: updatedTicket,
  });
};

/* =========================
   DELETE
   ========================= */

export const deleteTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const deletedTicket = await deleteTicketService(req.params.id);

  if (!deletedTicket) {
    throw new AppError("Ticket not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Ticket deleted successfully",
    data: deletedTicket,
  });
};
