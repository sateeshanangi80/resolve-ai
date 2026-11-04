import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ticketListQuerySchema } from "../validators/ticket.validator.js";

import {
  createTicketService,
  deleteTicketService,
  getTicketByIdService,
  getTicketService,
  updateTicketService,
} from "../services/ticket.service.js";

export const createTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const ticket = await createTicketService(req.body);

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error creating ticket:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create ticket",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getTickets = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const query = ticketListQuerySchema.parse(res.locals.validatedQuery ?? _req.query);
    const { tickets, pagination } = await getTicketService(query);

    res.status(200).json({
      success: true,
      message: "Tickets retrieved successfully",
      data: tickets,
      pagination,
    });
  } catch (error) {
    console.error("Error retrieving tickets:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve tickets",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getTicketById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const ticket = await getTicketByIdService(req.params.id);

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Ticket retrieved successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error retrieving ticket:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve ticket",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const updatedTicket = await updateTicketService(id, req.body);

    if (!updatedTicket) {
      res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Error updating ticket:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update ticket",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid ticket ID",
      });
      return;
    }

    const deletedTicket = await deleteTicketService(id);

    if (!deletedTicket) {
      res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Ticket deleted successfully",
      data: deletedTicket,
    });
  } catch (error) {
    console.error("Error deleting ticket:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete ticket",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
