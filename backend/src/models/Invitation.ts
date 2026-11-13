import mongoose, { Schema } from "mongoose";
import type { UserRole } from "./User.js";
interface IInvitation {
    name: string;
    email: string;
    role: UserRole;
    tokenHash: string;
    expiresAt: Date;
    createdBy: mongoose.Types.ObjectId;
}
const schema = new Schema<IInvitation>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ["Customer", "SupportAgent", "Admin"], required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model<IInvitation>("Invitation", schema);
