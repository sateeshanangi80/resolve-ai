import mongoose, { Schema } from "mongoose";
// The unique ID serializes first-admin creation across server instances.
const schema = new Schema({ _id: { type: String, required: true } }, { timestamps: true });
export default mongoose.model("SetupLock", schema);
