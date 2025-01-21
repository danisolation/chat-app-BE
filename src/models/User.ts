import mongoose, { type Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  status: "online" | "offline" | "away";
  lastSeen: Date;
  publicKey: string;
  blockedUsers: mongoose.Types.ObjectId[];
  groups: mongoose.Types.ObjectId[];
  bio?: string;
  customStatus?: string;
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String },
    status: {
      type: String,
      enum: ["online", "offline", "away"],
      default: "offline",
    },
    lastSeen: { type: Date, default: Date.now },
    publicKey: { type: String },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    bio: { type: String },
    customStatus: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
