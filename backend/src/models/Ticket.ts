import mongoose, { Schema } from "mongoose";

export interface ITicket extends Document {
    title: string;
    description: string;
    category: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
}

const ticketSchema = new Schema<ITicket>(
    {
        title: { type: String, Required: true, trim: true },
        description: { type: String, Required: true, trim: true },
        category: { type: String, Required: true, trim: true },
        priority: { type: String, Required: true, enum: ['Low', 'Medium', 'High'] },
        status: { type: String, Required: true, enum: ['Open', 'In Progress', 'Resolved', 'Closed'] }
    },
    {
        timestamps: true,
    }
)

const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema)

export default Ticket