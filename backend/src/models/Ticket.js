import mongoose, { Schema } from "mongoose";
const ticketSchema = new Schema({
    title: { type: String, Required: true, trim: true },
    description: { type: String, Required: true, trim: true },
    category: { type: String, Required: true, trim: true },
    priority: { type: String, Required: true, enum: ['Low', 'Medium', 'High'] },
    status: { type: String, Required: true, enum: ['Open', 'In Progress', 'Resolved', 'Closed'] }
}, {
    timestamps: true,
});
const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
//# sourceMappingURL=Ticket.js.map