import { Types, type QueryFilter } from "mongoose";

import Ticket from "../models/Ticket.js";
import type { ITicket } from "../models/Ticket.js";
import type { UserRole } from "../models/User.js";
import type { TicketListQuery } from "../validators/ticket.validator.js";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";

interface TicketUser {
  id: string;
  role: UserRole;
}

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/*
  TICKET ACCESS CONTROL

  Customer     -> Own tickets
  SupportAgent -> Assigned tickets
  Admin        -> All tickets
*/

const getTicketAccessFilter = (user: TicketUser): QueryFilter<ITicket> => {
  if (user.role === "Customer") {
    return { createdBy: new Types.ObjectId(user.id) };
  }

  if (user.role === "SupportAgent") {
    return { assignedTo: new Types.ObjectId(user.id) };
  }

  return {};
};

/*
  CREATE TICKET
*/

export const createTicketService = async (
  data: Record<string, unknown>,
  userId: string,
) => {
  return Ticket.create({
    ...data,
    createdBy: userId,
    assignedTo: null,
  });
};

/*
  GET TICKETS
  Search + Filter + Sort + Pagination + RBAC
*/

export const getTicketService = async (
  query: TicketListQuery,
  user: TicketUser,
) => {
  const { page, limit, status, priority, category, search, sortBy, order } =
    query;

  const filter: QueryFilter<ITicket> = {
    ...getTicketAccessFilter(user),
  };
  if (query.assignment && user.role === "Admin") filter.assignedTo = null;

  // Filters

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (category) {
    filter.category = category;
  }

  // Search

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      {
        title: {
          $regex: safeSearch,
          $options: "i",
        },
      },
      {
        description: {
          $regex: safeSearch,
          $options: "i",
        },
      },
    ];
  }

  // Pagination

  const skip = (page - 1) * limit;

  // Sorting

  const sortDirection: 1 | -1 = order === "asc" ? 1 : -1;

  const sort = {
    [sortBy]: sortDirection,
  };

  // Database queries

  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ ...sort, _id: sortDirection }).skip(skip).limit(limit).populate("createdBy", "name email").populate("assignedTo", "name email"),

    Ticket.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

/*
  GET TICKET BY ID
  Checks ownership / assignment
*/

export const getTicketByIdService = async (id: string, user: TicketUser) => {
  return Ticket.findOne({
    _id: id,
    ...getTicketAccessFilter(user),
  }).populate("createdBy", "name email").populate("assignedTo", "name email");
};

/*
  UPDATE TICKET
  Checks ownership / assignment
*/

export const updateTicketService = async (
  id: string,
  data: Record<string, unknown>,
  user: TicketUser,
) => {
  return Ticket.findOneAndUpdate(
    {
      _id: id,
      ...getTicketAccessFilter(user),
    },
    data,
    {
      new: true,
      runValidators: true,
    },
  ).populate("createdBy", "name email").populate("assignedTo", "name email");
};

/*
  DELETE TICKET
  Route must be protected for Admin only
*/

export const deleteTicketService = async (id: string) => {
  return Ticket.findByIdAndDelete(id);
};

export const assignTicketService = async (
  ticketId: string,
  agentId: string,
) => {
  // Check whether the selected user is an active SupportAgent
  const agent = await User.findOne({
    _id: agentId,
    role: "SupportAgent",
    isActive: true,
  });

  if (!agent) {
    throw new AppError("Active support agent not found", 404);
  }

  // Assign the ticket
  const ticket = await Ticket.findByIdAndUpdate(
    ticketId,
    { assignedTo: agent._id },
    { new: true, runValidators: true },
  )
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");

  return ticket;
};
