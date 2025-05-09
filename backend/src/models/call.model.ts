import mongoose, { Document, Schema } from "mongoose";

export type CallStatus =
  | "initiated"
  | "ringing"
  | "accepted"
  | "rejected"
  | "ended";

export interface ICall extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  signalingData?: string; // Optional field for WebRTC offer/answer
}

const callSchema = new Schema<ICall>(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["initiated", "ringing", "accepted", "rejected", "ended"],
      default: "initiated",
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    signalingData: { type: String }, // could be SDP or ICE data
  },
  { timestamps: true }
);

const Call = mongoose.model<ICall>("Call", callSchema);
export default Call;
