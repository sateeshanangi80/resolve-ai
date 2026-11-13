import type { Request, Response } from "express";
import { ticketIdSchema } from "../validators/ticket.validator.js";

import {
  assignTicketService,
  createTicketService,
  deleteTicketService,
  getTicketByIdService,
  getTicketService,
  updateTicketService,
} from "../services/ticket.service.js";
import { AppError } from "../utils/AppError.js";

const getAuthenticatedUser = (req: Request) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  return req.user;
};

const getTicketId = (req: Request): string => {
  const result = ticketIdSchema.safeParse(req.params);
  if (!result.success) {
    throw new AppError("Invalid ticket ID", 400);
  }
  return result.data.id;
};

export const createTicket = async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);

  const ticket = await createTicketService(req.body, user.id);

  res.status(201).json({
    success: true,
    message: "Ticket created successfully",
    data: ticket,
  });
};

export const getTickets = async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);

  const query = res.locals.validatedQuery;

  const { tickets, pagination } = await getTicketService(query, user);

  res.status(200).json({
    success: true,
    message: "Tickets retrieved successfully",
    data: tickets,
    pagination,
  });
};

export const getTicketById = async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const id = getTicketId(req);

  const ticket = await getTicketByIdService(id, user);

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Ticket retrieved successfully",
    data: ticket,
  });
};

export const updateTicket = async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const id = getTicketId(req);

  if (
    user.role === "SupportAgent" &&
    Object.keys(req.body).some((field) => field !== "status")
  ) {
    throw new AppError("Support agents can update only ticket status", 403);
  }

  // Support agents can update only ticket status.
  const updateData =
    user.role === "SupportAgent" ? { status: req.body.status } : req.body;

  const updatedTicket = await updateTicketService(id, updateData, user);

  if (!updatedTicket) {
    throw new AppError("Ticket not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Ticket updated successfully",
    data: updatedTicket,
  });
};

export const deleteTicket = async (req: Request, res: Response) => {
  const id = getTicketId(req);

  const deletedTicket = await deleteTicketService(id);

  if (!deletedTicket) {
    throw new AppError("Ticket not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Ticket deleted successfully",
    data: deletedTicket,
  });
};

export const assignTicket = async (req: any, res: any) => {
  const { assignedTo } = req.body;

  const ticket = await assignTicketService(req.params.id, assignedTo);

  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Ticket assigned successfully",
    data: ticket,
  });
};
