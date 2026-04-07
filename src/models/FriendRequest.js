import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pairKey: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

friendRequestSchema.index(
  { pairKey: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending", pairKey: { $type: "string" } },
  }
);

friendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

export default FriendRequest;