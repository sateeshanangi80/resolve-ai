import Ticket from "../models/Ticket.js";

export const createTicketService = async (data: Record<string, unknown>) => {
  return await Ticket.create(data);
};

export const getTicketService = async () => {
  return await Ticket.find().sort({
    createdAt: -1,
  });
};

export const getTicketByIdService = async (id: string) => {
  return await Ticket.findById(id);
};

export const updateTicketService = async (
  id: string,
  data: Record<string, unknown>,
) => {
  return await Ticket.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

export const deleteTicketService = async (id:string|string[]) => {
  return await Ticket.findByIdAndDelete(id)
}
