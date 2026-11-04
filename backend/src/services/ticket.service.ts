import Ticket from "../models/Ticket.js";
import type { TicketListQuery } from "../validators/ticket.validator.js";

interface TicketFilter {
  status?: TicketListQuery["status"];
  priority?: TicketListQuery["priority"];
  category?: TicketListQuery["category"];

  $or?: Array<
    | {
        title: {
          $regex: string;
          $options: string;
        };
      }
    | {
        description: {
          $regex: string;
          $options: string;
        };
      }
  >;
}

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const createTicketService = async (data: Record<string, unknown>) => {
  return await Ticket.create(data);
};

export const getTicketService = async (query: TicketListQuery) => {
  const { page, limit, status, priority, category, search, sortBy, order } =
    query;

  const filter: TicketFilter = {};

  /*
    FILTERS
  */

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (category) {
    filter.category = category;
  }

  /*
    SEARCH
  */

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

  /*
    PAGINATION
  */

  const skip = (page - 1) * limit;

  /*
    SORTING
  */

  const sortDirection: 1 | -1 = order === "asc" ? 1 : -1;

  const sort = {
    [sortBy]: sortDirection,
  };

  /*
    DATABASE QUERIES
  */

  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort(sort).skip(skip).limit(limit),

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

export const getTicketByIdService = async (id: string | string[]) => {
  return await Ticket.findById(id);
};

export const updateTicketService = async (
  id: string | string[],
  data: Record<string, unknown>,
) => {
  return await Ticket.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

export const deleteTicketService = async (id: string | string[]) => {
  return await Ticket.findByIdAndDelete(id);
};
