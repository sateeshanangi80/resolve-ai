import mongoose, { Types } from "mongoose";

export interface IRefreshSession extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refreshSessionSchema = new mongoose.Schema<IRefreshSession>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
  MongoDB automatically removes
  expired refresh sessions.
*/

refreshSessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

const RefreshSession = mongoose.model<IRefreshSession>(
  "RefreshSession",
  refreshSessionSchema,
);

export default RefreshSession;
