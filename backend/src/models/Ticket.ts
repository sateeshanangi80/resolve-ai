import mongoose, { Schema, Types } from "mongoose";

export interface ITicket {
  title: string;
  description: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Resolved" | "Closed";

  // User who created the ticket
  createdBy: Types.ObjectId;

  // Support agent assigned to the ticket
  assignedTo: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      required: true,
      default: "Medium",
      enum: ["Low", "Medium", "High"],
    },

    status: {
      type: String,
      required: true,
      default: "Open",
      enum: ["Open", "In Progress", "Resolved", "Closed"],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);

export default Ticket;
