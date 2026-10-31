import type { Request, Response } from "express";
import Ticket from "../models/Ticket.js";

export const createTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    console.log("REQ BODY:", req.body);

    if (!req.body) {
      res.status(400).json({
        success: false,
        message: "Request body is required",
      });
      return;
    }

    const { title, description, category, priority } = req.body;

    if (!title || !description) {
      res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
      return;
    }

    const ticket = await Ticket.create({
      title,
      description,
      category,
      priority,
    });

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
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Tickets retrieved successfully",
      data: tickets,
    });
  } catch (error) {
    console.error("Error retrieving tickets:", error);
    res.status(500).json({
      sucess: true,
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
    const ticket = await Ticket.findById(req.params.id);

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
    });
  }
};

export const updateTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const updateTicket = await Ticket.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updateTicket) {
      res.status(404).json({
        sucess: false,
        message: "Ticket Not Found",
      });
      return;
    }

    res.status(200).json({
      status: true,
      message: "Ticket Updated Successfully",
      data: updateTicket,
    });
  } catch (error) {
    console.error(`Error updating ticket:`, error);

    res.status(500).json({
      sucess: false,
      message: "Failed to update ticke ",
    });
  }
};
