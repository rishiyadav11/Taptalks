import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  image: string;
  members: Types.ObjectId[];
  admin: Types.ObjectId;
  messages: Types.ObjectId[];
  createdAt: Date;
}

const groupSchema = new Schema<IGroup>({
  name: { type: String, required: true },
  image: {
    type: String,
    default:
      "https://img.freepik.com/free-vector/group-young-people-posing-photo_52683-18823.jpg?ga=GA1.1.1092467876.1743869642&semt=ais_hybrid&w=740",
  },
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  admin: { type: Schema.Types.ObjectId, ref: "User" },
  messages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
  createdAt: { type: Date, default: Date.now },
});

const Group = mongoose.model<IGroup>("Group", groupSchema);
export default Group;
