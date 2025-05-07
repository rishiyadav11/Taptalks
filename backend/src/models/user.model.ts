import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  _id: string; // ✅ Add this line
  fullName: string;
  email: string;
  password: string;
  profilePic?: string;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePic: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
