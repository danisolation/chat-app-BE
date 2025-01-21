import mongoose, { type Document, Schema } from "mongoose";

export interface IReaction {
  user: mongoose.Types.ObjectId;
  emoji: string;
}

export interface ILocation {
  latitude: number;
  longitude: number;
}

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver?: mongoose.Types.ObjectId;
  group?: mongoose.Types.ObjectId;
  content: string;
  contentType: "text" | "voice" | "location";
  voiceUrl?: string;
  location?: ILocation;
  originalContent?: string;
  timestamp: Date;
  editedAt?: Date;
  readBy: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  parentMessage?: mongoose.Types.ObjectId;
  threadMessages: mongoose.Types.ObjectId[];
  forwardedFrom?: mongoose.Types.ObjectId;
  isDeleted: boolean;
}

const ReactionSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  emoji: { type: String, required: true },
});

const LocationSchema = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
});

const MessageSchema: Schema = new Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  content: { type: String, required: true },
  contentType: {
    type: String,
    enum: ["text", "voice", "location"],
    default: "text",
  },
  voiceUrl: { type: String },
  location: { type: LocationSchema },
  originalContent: { type: String },
  timestamp: { type: Date, default: Date.now },
  editedAt: { type: Date },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reactions: [ReactionSchema],
  parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  threadMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  isDeleted: { type: Boolean, default: false },
});

MessageSchema.index({ content: "text" });

export default mongoose.model<IMessage>("Message", MessageSchema);
