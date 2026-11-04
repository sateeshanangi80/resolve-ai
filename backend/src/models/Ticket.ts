import mongoose, { Schema } from "mongoose";

export interface ITicket {
    title: string;
    description: string;
    category: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
}

const ticketSchema = new Schema<ITicket>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        category: { type: String, required: true, trim: true },
        priority: { type: String, required: true, default: 'Medium', enum: ['Low', 'Medium', 'High'] },
        status: { type: String, required: true, default: 'Open', enum: ['Open', 'In Progress', 'Resolved', 'Closed'] }
    },
    {
        timestamps: true,
    }
)

const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema)

export default Ticket
