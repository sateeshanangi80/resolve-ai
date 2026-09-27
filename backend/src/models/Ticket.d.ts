import mongoose from "mongoose";
export interface ITicket extends Document {
    title: string;
    description: string;
    category: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
}
declare const Ticket: mongoose.Model<ITicket, {}, {}, {}, mongoose.Document<unknown, {}, ITicket, {}, mongoose.DefaultSchemaOptions> & ITicket & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}, any, ITicket>;
export default Ticket;
//# sourceMappingURL=Ticket.d.ts.map