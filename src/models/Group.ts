import mongoose, { type Document, Schema } from "mongoose";

export interface IGroup extends Document {
  name: string;
  description?: string;
  creator: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  admins: mongoose.Types.ObjectId[];
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  publicKey?: string;
}

const GroupSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    avatar: { type: String },
    publicKey: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IGroup>("Group", GroupSchema);
