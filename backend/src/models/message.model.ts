import mongoose, { Document, Schema } from "mongoose";

export interface IReaction {
  emoji: string;
  user: mongoose.Types.ObjectId;
}

export type MessageStatus = "sent" | "delivered" | "read";

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId;
  group?: mongoose.Types.ObjectId | null;
  text?: string;
  image?: string;
  reactions: IReaction[];
  status: MessageStatus;
  seenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    emoji: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.group;
      },
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    text: {
      type: String,
      required: function () {
        return !this.image && !this.status;
      },
    },
    image: {
      type: String,
      required: function () {
        return !this.text && !this.status;
      },
    },
    reactions: [reactionSchema],
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    seenAt: { type: Date },
  },
  { timestamps: true }
);

const Message = mongoose.model<IMessage>("Message", messageSchema);
export default Message;
